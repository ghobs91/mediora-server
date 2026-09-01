# 🍿 Bobarr
> The all-in-one alternative for Sonarr, Radarr, Jackett... with a VPN and running in docker

Bobarr is a movies and tv shows collection manager for BitTorrent users. It uses [themoviedb.org](https://www.themoviedb.org/) to search movies and tv shows to add to your library. Then it searches into your favorites torrent trackers the best match and downloads it for you through a VPN.

![Screenshot](./screenshot.png)

**This is a beta release!**

### Need help? Join the discord => https://discord.gg/PFwM4zk

## Why ?

One of the main idea for bobarr is to be simple to setup, simple to use and having everything at the same place.
You don't have to choose a torrent client, to setup a VPN, to setup radarr, sonarr, then jackett and connect them all together.

It's also built from scratch and it will try to solve long term problem like download multiple qualities and keep them or managing tv shows and movies at the same place.
You can follow the [roadmap](https://github.com/iam4x/bobarr/projects/1) to check what next features are implemented.

And to have something with a better UI, less configuration and faster 🚀

## Setup

### Requirement

* [docker](https://get.docker.com/) installed with [docker-compose](https://docs.docker.com/compose/install/).

## Installation

Run the installation script and follow the instructions:
* `curl -o- https://raw.githubusercontent.com/iam4x/bobarr/master/scripts/install.sh | bash`

### Configuration

The first time you open Bobarr at http://localhost:3000, the setup wizard will
guide you through the required configuration:

* choose an admin password
* enter your TMDB API key
* add your Jackett API key
* choose your region, language, library folder names, and download organization strategy

The wizard stores application settings in the database. Keep `.env` available
for Docker credentials, library identity settings, and optional VPN configuration.

### Link your existing library if any (from Sonarr or Radarr)

* Open `docker-compose.yml` and look for `- ./library:/usr/library`
* Update `./library` to the folder where your movies and TV shows are stored

As example, having:
```
/mnt/storage/
|- movies/
|- tvshows/
```
The line should be: `- /mnt/storage:/usr/library`

```

The setup wizard checks the mounted folder from inside the API container. It
can create the configured movies and TV folders when the mount is writable.
The browser cannot grant a Docker container access to a host path that is not
mounted.

On Linux, set `PUID` and `PGID` in `.env` to the user and group that own the
host library (`id -u` and `id -g`), then recreate the stack. Bobarr runs the
API with that identity so scanning and organizing use the same permissions as
the download service.

For libraries split across disks, bind each host disk to its own container
path in `docker-compose.yml` and list those container paths in `.env`:

```
MOVIES_LIBRARY_HOST_PATH=/path/to/4tb-seagate
TV_SHOWS_LIBRARY_HOST_PATH=/path/to/6tb-seagate
MEDIA_MOUNTS=/usr/drive4tb,/usr/drive6tb
```

The compose file maps these values to `/usr/drive4tb` and `/usr/drive6tb`.
After recreating the stack, open Settings > Library folders and select the
4TB mount for Movies and the 6TB mount for TV shows. The selected mounts are
stored in the database and used for scans and organization.


## How to start

There are two way to start bobarr stack, first without VPN:

* `$ ./bobarr.sh start`
* Go to http://localhost:9117 and add your preferred torrent websites
* Go to http://localhost:3000 and complete the setup wizard

If you want to enforce all torrent traffic through a VPN:

#### OpenVPN

* Copy your open vpn config file (.ovpn) into the folder `packages/vpn` name it `vpn.conf`
* `$ ./bobarr.sh start:vpn`

#### WireGuard

* Copy your wireguard config file (wg0.conf) into the folder `packages/vpn`
* `$ ./bobarr.sh start:wireguard`

#### Tailscale (Mullvad exit node)

Tailscale routes only the Transmission downloads through a Mullvad exit node.
The API, web UI, and Jackett keep their normal network. This reuses the same
Tailscale account/tailnet you already run on your machine; the stack spawns a
`tailscale` container that joins the same tailnet, so it shows up as an extra
device in your Tailscale admin console.

Set two values in `.env`:

* `TS_AUTHKEY` — an auth key from the Tailscale admin console
  (`/admin/machines/authkeys`) so the container joins your tailnet without a
  manual login. Leave it empty for a one-time interactive login, which prints a
  URL to approve the device.
* `TS_EXIT_NODE` — the Mullvad exit node hostname for Transmission's traffic
  (see `tailscale exit-node list`). Leave it empty to run without an exit node
  and set one later.

Both are read on every boot, so they survive state wipes and restarts:

```
TS_AUTHKEY=tska-xxxxxxx
TS_EXIT_NODE=fr-par-wg-001.mullvad.ts.net
```

A small entrypoint wrapper (`scripts/tailscale-entrypoint.sh`) brings the node up
via `containerboot`, waits until it is authenticated, then applies the exit node
with `tailscale set`. Exit-node hostnames cannot be resolved during the initial
`tailscale up` (before auth), so they must be configured after login. A non-zero
exit / restart loop on boot means `TS_AUTHKEY` was rejected.

* `$ ./bobarr.sh start:tailscale`
* Verify routing with `$ docker exec bobarr-tailscale tailscale status` and
  `$ docker exec bobarr-tailscale tailscale ip`
* Stop the stack with `$ ./bobarr.sh stop`

## Configuration

### Torrent account

* Go to http://localhost:9117
* Add indexer and follow the steps
* Also set [FlareSolverr](https://github.com/Jackett/Jackett#configuring-flaresolverr) url to `http://flaresolverr:8191` in jackett configuration

### Bobarr configuration

* Complete the first-launch wizard at http://localhost:3000
* Go to http://localhost:3000/settings after setup to configure tags and quality preferences
* Create and order your preferred tags found in torrent file (ex: vost, multi, english...)
* Order your preferred qualities to download

### Accessing Bobarr remotely over HTTPS

The web UI proxies the API at the same-origin `/api` path, so it works behind
any HTTPS reverse proxy or tunnel (Tailscale, Cloudflare Tunnel, nginx...)
without extra routing rules. Open the UI over HTTPS and all API calls stay on
the same origin; there is no mixed-content blocking.

If your API is reachable at a separate HTTPS origin instead, set
`WEB_UI_API_URL` in `.env` to that URL and rebuild the web image:

```
WEB_UI_API_URL=https://api.example.com
docker compose build web
docker compose up -d web
```

## Usage

* After configuration, go to http://localhost:3000/search and just start searching!
* The files will be downloaded into `library/downloads`
* The files will be moved/copied/simlinked (you can set this in settings) and organized into `library/tvshows` or `library/movies`

The only requirement is to have a folder `tvshows` and a folder `movies` then bobarr can catch up and download to your user defined library folder.

If your movies or tvshow folder have a different name, you can edit `.env` file with your folder names:

```
LIBRARY_MOVIES_FOLDER_NAME=movies
LIBRARY_TV_SHOWS_FOLDER_NAME=tvshows
```

You can now head to http://localhost:3000 and hit that "Scan library folder" button.

## How to stop

You can stop the whole bobarr stack with:

* `$ ./bobarr.sh stop`

## How to update

Check the [CHANGELOG](https://github.com/iam4x/bobarr/blob/master/CHANGELOG.md) and update your `.env` if needed with new variables added.

* `$ ./bobarr.sh update`
* `$ ./bobarr.sh start`

## Services

* Bobarr http://localhost:3000
* Bobarr GraphQL API http://localhost:4000/graphql
* Bobarr background jobs http://localhost:4000/jobs
* Jackett http://localhost:9117
* Transmission http://localhost:9091
* FlareSolverr http://localhost:8191

## Development

Clone the repository and then you can run bobarr API and Web UI in dev watch mode and display logs with:

* `$ yarn dev`
