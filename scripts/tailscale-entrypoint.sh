#!/bin/sh
# Tailscale container entrypoint (fail-closed kill-switch).
#
# Mandate: the Transmission container shares this container's network
# namespace, so EVERY packet it sends leaves through THIS netns. This
# entrypoint guarantees that Transmission can never reach the internet
# directly:
#
# 1. Before anything else, an iptables firewall is installed on the OUTPUT
#    chain that rejects everything except:
#      - loopback (in-netns services + Docker's DNS proxy)
#      - tailscale0 (all tailnet / exit-node traffic)
#      - on the physical interface only Tailscale's own transport:
#          UDP 41641 (WireGuard direct peers / disco), UDP 3478 (STUN),
#          TCP 443 (DERP relays + Tailscale connectivity checks)
#    With the exit node active, the netns default route is tailscale0; if
#    the exit node is ever lost, reset or not yet applied, torrent traffic
#    hits the REJECT rule instead of the native connection.
# 2. The configured TS_EXIT_NODE is applied once the backend is Running and
#    re-asserted by a guard loop (covers prefs being reset while running).
#    If the exit node cannot be activated, the container exits and is
#    restarted by `restart: unless-stopped`, and Transmission is never
#    started (it depends on the Tailscale healthcheck).
# 3. The Docker healthcheck (compose) mirrors these invariants, so
#    `depends_on: service_healthy` cannot start Transmission before the
#    exit node is genuinely applied and the kill-switch is in place.

set -u

TS_EXIT_NODE="${TS_EXIT_NODE:-}"

TS_IF="tailscale0" # tailscale tun device
ETH_IF="eth0"      # physical interface inside the netns

log() { echo "[tailscale-killswitch] $*"; }

# Install the egress kill-switch. Idempotent: it may be re-applied by the
# guard loop if a rule goes missing.
apply_firewall() {
	if ! iptables -F OUTPUT >/dev/null 2>&1; then
		log "ERROR: cannot manage iptables in this netns (net_admin missing?); refusing to run"
		exit 1
	fi
	iptables -A OUTPUT -o lo -j ACCEPT
	iptables -A OUTPUT -o "$TS_IF" -j ACCEPT
	# Tailscale's own transport on the physical interface only. NOTE: we
	# deliberately do NOT owner- or fwmark-match these: transmission-daemon
	# also runs as root in the shared netns (linuxserver image), and
	# tailscaled does not fwmark its TCP (DERP/control/DoH) sockets.
	# UDP 51820 is Mullvad exit nodes' WireGuard port; 41641 is the Tailscale
	# default disco/direct port; 3478 is STUN.
	iptables -A OUTPUT -o "$ETH_IF" -p udp -m multiport --dports 41641,3478,51820 -j ACCEPT
	iptables -A OUTPUT -o "$ETH_IF" -p tcp --dport 443 -j ACCEPT
	# Tailscale's DNS bootstrap: the tailnet's upstream resolver is a DoH URL,
	# which dnscache bootstraps over plain UDP/53 to its hardcoded fallback
	# servers. Without this MagicDNS starves and Transmission cannot resolve
	# trackers at all. Limited to exactly these two IPs (dnscache fallbacks).
	iptables -A OUTPUT -o "$ETH_IF" -p udp -d 8.8.8.8 --dport 53 -j ACCEPT
	iptables -A OUTPUT -o "$ETH_IF" -p udp -d 8.8.4.4 --dport 53 -j ACCEPT
	iptables -A OUTPUT -o "$ETH_IF" -m state --state ESTABLISHED,RELATED -j ACCEPT
	# Everything else is rejected, regardless of interface or state.
	iptables -A OUTPUT -o "$ETH_IF" -j REJECT
	iptables -A OUTPUT -j REJECT

	# IPv6 mirror: same policy so no v6 egress path can bypass the tunnel.
	if ip6tables -F OUTPUT >/dev/null 2>&1; then
		ip6tables -A OUTPUT -o lo -j ACCEPT
		ip6tables -A OUTPUT -o "$TS_IF" -j ACCEPT
		ip6tables -A OUTPUT -o "$ETH_IF" -p tcp --dport 443 -j ACCEPT
		ip6tables -A OUTPUT -o "$ETH_IF" -p udp -m multiport --dports 41641,3478,51820 -j ACCEPT
		ip6tables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
		ip6tables -A OUTPUT -j REJECT
	else
		log "WARNING: ip6tables unavailable; relying on tracker/peers not using v6"
	fi
}

# True when an exit node is actually selected.
exit_node_ok() {
	tailscale debug prefs 2>/dev/null | grep -Eq '"ExitNodeID": "[^"]+"'
}

assert_exit_node() {
	tailscale set --exit-node="$TS_EXIT_NODE" --exit-node-allow-lan-access=true
}

# True when the exit-node default route is actually installed (table 52).
exit_routed() {
	ip route show table 52 2>/dev/null | grep -q '^default dev tailscale0'
}

# Tighten the firewall while the exit route is absent: hard-drop everything
# (including HTTPS/443 webseeds) on the physical interface. Lifting is safe
# because direct UDP (41641) to known peers keeps working without DERP.
tighten() {
	if ! iptables -C OUTPUT -o "$ETH_IF" -p tcp --dport 443 -j DROP >/dev/null 2>&1; then
		iptables -I OUTPUT 1 -o "$ETH_IF" -p tcp --dport 443 -j DROP
		log "Exit route missing; dropped egress on ${ETH_IF} (incl. tcp/443) until it returns."
	fi
	if ip6tables -L OUTPUT >/dev/null 2>&1; then
		if ! ip6tables -C OUTPUT -p tcp --dport 443 -j DROP >/dev/null 2>&1; then
			ip6tables -I OUTPUT 1 -p tcp --dport 443 -j DROP
		fi
	fi
}

loosen() {
	if iptables -C OUTPUT -o "$ETH_IF" -p tcp --dport 443 -j DROP >/dev/null 2>&1; then
		iptables -D OUTPUT -o "$ETH_IF" -p tcp --dport 443 -j DROP
		log "Exit route restored; removed emergency egress drop."
	fi
	if ip6tables -L OUTPUT >/dev/null 2>&1; then
		if ip6tables -C OUTPUT -p tcp --dport 443 -j DROP >/dev/null 2>&1; then
			ip6tables -D OUTPUT -p tcp --dport 443 -j DROP
		fi
	fi
}

# 0. Kill-switch first: no window, not even during authentication, where
#    application traffic can leave through the physical interface.
apply_firewall

# 1. Bring tailscaled up and authenticate in the background so we can observe
#    the authenticated state before configuring the exit node.
containerboot &
BOOT_PID=$!

echo "Waiting for Tailscale to authenticate..."
AUTHENTICATED=0
while kill -0 "$BOOT_PID" 2>/dev/null; do
	if tailscale status --json 2>/dev/null | grep -q '"BackendState": "Running"'; then
		log "Tailscale authenticated."
		AUTHENTICATED=1
		break
	fi
	sleep 2
done

# If containerboot exited before authentication completed (e.g. an invalid or
# expired TS_AUTHKEY), surface the error and fail closed instead of letting
# the netns fall back to the bridge default route.
if [ "$AUTHENTICATED" -eq 0 ]; then
	wait "$BOOT_PID" 2>/dev/null
	log "ERROR: containerboot exited before authentication completed."
	exit 1
fi

# 2. Exit node is mandatory. Fail closed if it cannot be applied: the
#    container exits, restarts, and Transmission never starts (depends on the
#    Tailscale healthcheck).
if [ -z "$TS_EXIT_NODE" ]; then
	log "ERROR: TS_EXIT_NODE is not set; failing closed (no unfiltered torrent egress)."
	kill -TERM "$BOOT_PID" 2>/dev/null
	wait "$BOOT_PID" 2>/dev/null
	exit 1
fi

log "Configuring exit node: ${TS_EXIT_NODE}"
# Some retries: the peer is only resolvable shortly after authentication.
attempt=0
while [ "$attempt" -lt 15 ]; do
	attempt=$((attempt + 1))
	if assert_exit_node && exit_node_ok; then
		log "Exit node active: ${TS_EXIT_NODE}"
		break
	fi
	log "Attempt ${attempt}/15 failed to activate exit node; retrying in 3s..."
	sleep 3
done

if ! exit_node_ok; then
	log "ERROR: could not activate exit node ${TS_EXIT_NODE} after $attempt attempts; failing closed."
	kill -TERM "$BOOT_PID" 2>/dev/null
	wait "$BOOT_PID" 2>/dev/null
	exit 1
fi

# 3. Guard loop: defense in depth for the lifetime of the daemon.
#    - Re-install the kill-switch if any rule disappears.
#    - Re-assert the exit node if the selection is ever lost.
(
	while sleep 15; do
		if ! iptables -C OUTPUT -o "$ETH_IF" -j REJECT >/dev/null 2>&1; then
			log "Kill-switch rules missing; re-applying."
			apply_firewall
		fi
		if ! exit_routed; then
			tighten
		else
			loosen
		fi
		if ! exit_node_ok; then
			if assert_exit_node >/dev/null 2>&1; then
				log "Exit node selection lost; re-asserted ${TS_EXIT_NODE}."
			else
				log "ERROR: failed to re-assert exit node ${TS_EXIT_NODE}."
			fi
		fi
	done
) &
GUARD_PID=$!

# Hold the container open for as long as the Tailscale daemon runs (the guard
# loop dies with us).
wait "$BOOT_PID"
