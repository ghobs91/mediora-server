#!/bin/bash
# Detects Docker bind mounts that went stale after a USB volume remount and
# heals them: first recreate the affected containers, then restart Docker
# Desktop if the host mount is still broken.
set -uo pipefail

PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
REPO="/Users/andrew/Services/mediora-server"
LOG="$HOME/Library/Logs/mediora-mount-watchdog.log"
LOCK="/tmp/mediora-mount-watchdog.lock"
COOLDOWN_FILE="/tmp/mediora-mount-watchdog.last-heal"
COOLDOWN_SECONDS=900

log() {
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >>"$LOG"
}

# Keep the log bounded.
if [ -f "$LOG" ] && [ "$(stat -f%z "$LOG" 2>/dev/null || echo 0)" -gt 1048576 ]; then
  tail -n 2000 "$LOG" >"$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi

# Single instance.
if ! mkdir "$LOCK" 2>/dev/null; then
  exit 0
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

if ! docker version --format '{{.Server.Version}}' >/dev/null 2>&1; then
  exit 0
fi

# If the Tailscale (or VPN) container was restarted, its netns is rebuilt and
# a running transmission container keeps the detached, routeless old netns
# until it is restarted (fail-closed: no internet access, but also broken).
# Heal by restarting transmission so it re-joins the current netns.
transmission_route=$(docker exec mediora-server-transmission sh -c 'cat /proc/net/route 2>/dev/null | sed -n 2p' 2>/dev/null)
if [ -z "$transmission_route" ]; then
  log "transmission netns detached (empty route table); restarting it to re-join the VPN netns"
  docker restart mediora-server-transmission >>"$LOG" 2>&1
fi

HOST_6TB="/Volumes/Seagate 6TB"
HOST_4TB="/Volumes/Seagate 4TB"

# Best effort: remount a volume that the OS unmounted but still sees on the bus.
[ -d "$HOST_6TB" ] || diskutil mount "Seagate 6TB" >/dev/null 2>&1 || true
[ -d "$HOST_4TB" ] || diskutil mount "Seagate 4TB" >/dev/null 2>&1 || true

if [ ! -d "$HOST_6TB" ] || [ ! -d "$HOST_4TB" ]; then
  log "host volumes not both mounted (6TB=$([ -d "$HOST_6TB" ] && echo ok || echo missing), 4TB=$([ -d "$HOST_4TB" ] && echo ok || echo missing)); waiting for the OS to remount"
  exit 0
fi

check_mounts() {
  docker exec mediora-server-transmission sh -c \
    'test -d /downloads/complete && ls /downloads/complete >/dev/null 2>&1' \
    >/dev/null 2>&1 || return 1

  docker exec mediora-server-api sh -c \
    'test -d /usr/drive6tb/tv && test -d /usr/drive4tb/movies && ls /usr/drive6tb/tv >/dev/null 2>&1' \
    >/dev/null 2>&1 || return 1

  return 0
}

if check_mounts; then
  if [ "${1:-}" = "--status" ]; then echo "mounts ok"; fi
  exit 0
fi

if [ "${1:-}" = "--status" ]; then echo "mounts broken"; exit 1; fi

# Resolve which compose overrides the RUNNING stack was started with, by
# inspecting the live transmission container's network mode. Recreating
# containers with a mismatched overlay (e.g. plain docker-compose.yml) would
# move Transmission out of the VPN netns and give it unrestricted internet
# access - which is never allowed.
resolve_compose_files() {
  netmode=$(docker inspect -f '{{.HostConfig.NetworkMode}}' mediora-server-transmission 2>/dev/null || echo unknown)
  case "$netmode" in
    container:mediora-server-tailscale)
      echo "-f docker-compose.yml -f docker-compose.tailscale.yml" ;;
    container:mediora-server-vpn)
      vpn_image=$(docker inspect -f '{{.Config.Image}}' mediora-server-vpn 2>/dev/null || echo unknown)
      case "$vpn_image" in
        linuxserver/wireguard*) echo "-f docker-compose.yml -f docker-compose.wireguard.yml" ;;
        *)                      echo "-f docker-compose.yml -f docker-compose.vpn.yml" ;;
      esac
      ;;
    *)
      log "mediora-server-transmission is not attached to a VPN container (network mode: $netmode); aborting recreate instead of restoring direct internet access"
      return 1
      ;;
  esac
}

now=$(date +%s)
last=$(cat "$COOLDOWN_FILE" 2>/dev/null || echo 0)
if [ $((now - last)) -lt "$COOLDOWN_SECONDS" ]; then
  log "stale mount detected, cooldown active ($((now - last))s / ${COOLDOWN_SECONDS}s)"
  exit 0
fi
printf '%s\n' "$now" >"$COOLDOWN_FILE"

if ! COMPOSE_FILES=$(resolve_compose_files); then
  exit 0
fi

log "stale container mount detected; recreating transmission and api"
cd "$REPO" || exit 1
docker compose $COMPOSE_FILES up -d --force-recreate --no-deps transmission api >>"$LOG" 2>&1

sleep 25
if check_mounts; then
  log "recovered by recreating containers"
  exit 0
fi

log "container recreate did not fix the mount; restarting Docker Desktop"
if ! docker desktop restart --timeout 300 >>"$LOG" 2>&1; then
  log "docker desktop restart failed; falling back to quit/open"
  osascript -e 'quit app "Docker"' >/dev/null 2>&1 || true
  sleep 20
  pkill -TERM -f "Docker Desktop.app/Contents/MacOS/Docker Desktop" 2>/dev/null || true
  pkill -TERM -f "com.docker.backend" 2>/dev/null || true
  sleep 10
  open -a /Applications/Docker.app
fi

for _ in $(seq 1 100); do
  if docker version --format '{{.Server.Version}}' >/dev/null 2>&1; then
    break
  fi
  sleep 3
done

sleep 20
docker compose $COMPOSE_FILES up -d transmission api >>"$LOG" 2>&1
sleep 25

if check_mounts; then
  log "recovered after Docker Desktop restart"
else
  log "still broken after Docker Desktop restart; will retry after cooldown"
fi
