#!/bin/sh
# Tailscale container entrypoint.
#
# containerboot authenticates the node (via TS_AUTHKEY or interactive login)
# but cannot apply an exit node during `tailscale up`: exit-node names are
# only resolvable once the node is authenticated. This wrapper lets
# containerboot bring the node up in the background, waits until the node is
# authenticated (BackendState == Running), then applies the exit node via
# `tailscale set`, and finally holds the container open for the lifetime of
# the Tailscale daemon.

set -u

# Bring tailscaled up and authenticate in the background so we can observe the
# authenticated state before configuring the exit node.
containerboot &
BOOT_PID=$!

echo "Waiting for Tailscale to authenticate..."
while kill -0 "$BOOT_PID" 2>/dev/null; do
	if tailscale status --json 2>/dev/null | grep -q '"BackendState": "Running"'; then
		echo "Tailscale authenticated."
		break
	fi
	sleep 2
done

# If containerboot exited before authentication completed, surface the error
# instead of silently continuing (e.g. an invalid TS_AUTHKEY).
if ! kill -0 "$BOOT_PID" 2>/dev/null; then
	wait "$BOOT_PID"
	echo "containerboot exited before authentication completed." >&2
	exit 1
fi

# The exit node can only be configured after authentication completes.
if [ -n "${TS_EXIT_NODE:-}" ]; then
	echo "Configuring exit node: ${TS_EXIT_NODE}"
	# Retry a few attempts: the peer is only resolvable once connected.
	attempt=0
	while [ "$attempt" -lt 5 ]; do
		attempt=$((attempt + 1))
		if tailscale set \
			--exit-node="${TS_EXIT_NODE}" \
			--exit-node-allow-lan-access=true; then
			echo "Exit node configured: ${TS_EXIT_NODE}"
			break
		fi
		echo "Attempt ${attempt}/5 failed; retrying in 3s..."
		sleep 3
	done
else
	echo "TS_EXIT_NODE not set; running without a fixed exit node."
fi

# Hold the container open for as long as the Tailscale daemon runs.
wait "$BOOT_PID"
