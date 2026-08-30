# Integrating the Mediora client with Bobarr (mediora-server)

> Self-contained spec for an agent working in `ghobs91/mediora-server`.
> Goal: make **Bobarr** speak the **Sonarr v3 + Radarr v3** REST API so the
> **Mediora client** (`ghobs91/mediora`, tvOS/iOS/macos) connects to it as the
> request backend **without changing the client**.

---

## 0. Critical context (read before coding)

1. **Bobarr does NOT currently use Sonarr/Radarr.** It uses **Jackett** (torrent
   search) + **Transmission** (downloader) + TMDB/OMDB (metadata) + PostgreSQL +
   Redis/BullMQ. The "Sonarr/Radarr" mentions in the README are prose only.
   **The task is therefore an add, not a replacement:** expose Sonarr v3 +
   Radarr v3 compatible endpoints on top of Bobarr's existing engine.

2. **The Mediora client talks DIRECTLY to native Sonarr/Radarr APIs.** There is
   no "Mediora server" middleware. The client ships
   `src/services/{sonarr,radarr,tmdb,jellyfin}.ts` and calls
   `https://<server>/api/v3/*` with the `X-Api-Key` header.

3. **Therefore "connect the two" = Bobarr implements Sonarr v3 + Radarr v3.**
   The client stays unchanged; the user just points `SONARR_URL`/`RADARR_URL`
   at Bobarr.

**Recommended approach:** a compatibility layer (new NestJS module) that
serializes Bobarr's own entities into Radarr/Sonarr-shaped JSON, backed by
Bobarr's real request/download/library pipeline. **Do not** rewrite the client
to use Bobarr's native GraphQL API — that is far more work and defeats the goal.

---

## 1. Mediora client API contract (what to implement)

Base URL + `/api/v3/...`. Header `X-Api-Key`, `Content-Type: application/json`.
Source: `ghobs91/mediora/src/services/{sonarr,radarr}.ts`.

### 1a. Radarr (movies)

| Method + path | Client method | Fields the client reads |
|---|---|---|
| `GET /api/v3/system/status` | `testConnection` | `version` |
| `GET /api/v3/rootFolder` | (settings) | `id`, `path`, `freeSpace`, `accessible` |
| `GET /api/v3/qualityprofile` | (settings) | `id`, `name` |
| `GET /api/v3/movie` | library list | full `RadarrMovie` |
| `GET /api/v3/movie/{id}` | detail | full `RadarrMovie` |
| `GET /api/v3/movie/lookup?term=` | search | partial movies |
| `GET /api/v3/movie/lookup/tmdb?tmdbId=` | search | partial movie |
| `GET /api/v3/movie/lookup?term=imdb:{id}` | search | partial movies |
| `POST /api/v3/movie` | add | body -> creates entry |
| `DELETE /api/v3/movie/{id}?deleteFiles=` | remove | 200 |
| `GET /api/v3/queue?includeUnknownMovieItems=false&includeMovie=true` | progress | `records[].movieId` |

### 1b. Sonarr (TV)

| Method + path | Client method | Fields the client reads |
|---|---|---|
| `GET /api/v3/system/status` | `testConnection` | `version` |
| `GET /api/v3/rootFolder` | (settings) | `id`, `path`, `freeSpace`, `accessible` |
| `GET /api/v3/qualityprofile` | (settings) | `id`, `name` |
| `GET /api/v3/series` | library list | full `SonarrSeries` |
| `GET /api/v3/series/{id}` | detail | full `SonarrSeries` |
| `GET /api/v3/series/lookup?term=` | search | partial series |
| `GET /api/v3/series/lookup?term=tvdb:{id}` | search | partial series |
| `POST /api/v3/series` | add | body -> creates entry |
| `DELETE /api/v3/series/{id}?deleteFiles=` | remove | 200 |
| `GET /api/v3/episode?seriesId=` | episodes | full `SonarrEpisode` |
| `GET /api/v3/episodefile?seriesId=` | episode files | full `SonarrEpisodeFile` |
| `GET /api/v3/queue?pageSize=1000&includeUnknownSeriesItems=false&includeSeries=true&includeEpisode=true` | progress | `records[].seriesId` |
| `PUT /api/v3/series/{id}` | monitor season | body with `seasons[].monitored` |
| `POST /api/v3/command` | season search | body `{name:"SeasonSearch", seriesId, seasonNumber}` |

### 1c. TMDB (orthogonal — no server change)

The client calls `https://api.themoviedb.org/3` **directly** with an embedded
public key (`tmdb.ts:13`). Bobarr needs **no** TMDB proxy for the client to work
(discovery/metadata already function). Bobarr already has its own TMDB module
(`packages/api/src/modules/tmdb/`).

### 1d. Jellyfin (playback — separate concern)

The client streams playback from Jellyfin. **Bobarr has no transcoding/stream
server.** Playback is out of scope for the request integration below (see §6).

---

## 2. Exact JSON field sets

Target shapes come from `ghobs91/mediora/src/types/index.ts`. Required = read by
the client service code; recommended = used by client UI screens.

### 2a. Shared

```jsonc
// GET /api/v3/system/status
{ "appName": "Bobarr", "version": "1.0.0", "startTime": "2026-01-01T00:00:00Z", "os": "linux" }

// GET /api/v3/rootFolder  ->  [ ... ]
{ "id": 1, "path": "/usr/library/movies", "freeSpace": 1073741824, "accessible": true }

// GET /api/v3/qualityprofile  ->  [ ... ]
{ "id": 1, "name": "SD/HD" }
```

### 2b. Radarr movie (`RadarrMovie`)

```jsonc
// GET /api/v3/movie, GET /api/v3/movie/{id}
{
  "id": 7,                 // REQUIRED  (Bobarr Movie.id)
  "tmdbId": 278,           // REQUIRED  (Bobarr Movie.tmdbId)
  "title": "The Shawshank Redemption",
  "originalTitle": "The Shawshank Redemption",
  "sortTitle": "shawshank redemption",
  "status": "continued",
  "overview": "...",
  "year": 1994,            // from TMDB
  "runtime": 142,
  "imdbId": "tt0111161",
  "images": [ { "coverType": "poster", "url": "/poster.jpg" } ],
  "remotePoster": "https://image.tmdb.org/t/p/w500/poster.jpg",
  "path": "/usr/library/movies/The Shawshank Redemption",
  "folderName": "The Shawshank Redemption",
  "qualityProfileId": 1,
  "rootFolderPath": "/usr/library/movies",
  "monitored": true,
  "minimumAvailability": "released",
  "isAvailable": true,     // true when a completed torrent/file exists
  "hasFile": true,         // true when files exist
  "genres": ["Drama"],
  "ratings": { "value": 8.7, "votes": 25000 },
  "tags": []
}

// GET /api/v3/movie/lookup*  ->  partial array (id, tmdbId, title, year enough)
[ { "id": 7, "tmdbId": 278, "title": "...", "year": 1994 } ]
```

**POST body the client sends** (`addMovie`): a full `RadarrMovie` plus
`rootFolderPath`, `qualityProfileId`, `monitored`, `minimumAvailability`,
`addOptions: { searchForMovie }`. Bobarr only needs `tmdbId` (+ `title`, `year`)
from it.

### 2c. Sonarr series (`SonarrSeries`)

```jsonc
// GET /api/v3/series, GET /api/v3/series/{id}
{
  "id": 11,                // REQUIRED  (Bobarr TVShow.id)
  "tvdbId": 76480,         // REQUIRED  (client: checkSeriesExists) -> store from TMDB
  "tmdbId": 1399,          // REQUIRED  (Bobarr TVShow.tmdbId)
  "title": "Game of Thrones",
  "sortTitle": "game of thrones",
  "status": "continued",
  "overview": "...",
  "year": 2011,            // firstAired
  "runtime": 57,
  "network": "HBO",
  "imdbId": "tt0944947",
  "images": [ { "coverType": "poster", "url": "/poster.jpg" } ],
  "remotePoster": "https://image.tmdb.org/t/p/w500/poster.jpg",
  "seasons": [
    { "seasonNumber": 1, "monitored": true,
      "statistics": { "episodeFileCount": 10, "episodeCount": 10,
                       "totalEpisodeCount": 10, "percentOfEpisodes": 100 } }
  ],
  "path": "/usr/library/tvshows/Game of Thrones",
  "seasonFolder": true,
  "qualityProfileId": 1,
  "rootFolderPath": "/usr/library/tvshows",
  "monitored": true,
  "seriesType": "standard",
  "genres": ["Action, Adventure"],
  "ratings": { "value": 9.0, "votes": 20000 },
  "hasFile": true,
  "isAvailable": true,
  "tags": []
}

// GET /api/v3/series/lookup*  ->  partial array (id, tvdbId, tmdbId, title, year enough)
[ { "id": 11, "tvdbId": 76480, "tmdbId": 1399, "title": "...", "year": 2011 } ]
```

**POST body the client sends** (`addSeries`): a full `SonarrSeries` plus
`rootFolderPath`, `qualityProfileId`, `monitored`, `seasonFolder`,
`addOptions: { searchForMissingEpisodes }`.

### 2d. Sonarr season (`SonarrSeason`)

```jsonc
{ "seasonNumber": 2, "monitored": true,
  "statistics": { "episodeFileCount": 10, "episodeCount": 10,
                   "totalEpisodeCount": 10, "percentOfEpisodes": 100 } }
```

### 2e. Sonarr episode (`SonarrEpisode`)

```jsonc
{
  "id": 101,               // REQUIRED  (Bobarr TVEpisode.id)
  "seriesId": 11,          // REQUIRED  (client filters queue by this)
  "tvdbId": 294114,
  "episodeFileId": 201,
  "seasonNumber": 1,
  "episodeNumber": 1,
  "title": "The Winter Is Coming",
  "airDate": "2011-04-17",
  "hasFile": true,         // REQUIRED-ish (UI + filtering)
  "monitored": true
}
```

### 2f. Sonarr episode file (`SonarrEpisodeFile`)

```jsonc
{
  "id": 201,               // REQUIRED  (Bobarr File.id)
  "seriesId": 11,          // REQUIRED
  "seasonNumber": 1,
  "relativePath": "Season 1/...ep01.mkv",
  "path": "/usr/library/tvshows/Game of Thrones/Season 1/...",
  "size": 635839876,
  "sceneName": null,
  "quality": { "quality": { "id": 6, "name": "WEB-1080p" } }
}
```

### 2g. Queue items

```jsonc
// Radarr  GET /api/v3/queue  ->  { records: [...], totalRecords: N }
{
  "records": [
    {
      "id": 50,                  // REQUIRED  (Bobarr Torrent.id)
      "movieId": 7,              // REQUIRED  (client filters by this)
      "title": "The Shawshank Redemption (1994) 1080p",
      "size": 2147483648,
      "sizeleft": 1073741824,
      "timeleft": "01:00:00",
      "estimatedCompletionTime": "2026-08-29T10:00:00Z",
      "status": "downloading",   // "downloading" | "completed"
      "trackedDownloadStatus": "running",
      "trackedDownloadState": "downloading",
      "downloadId": "<transmission hash>",  // REQUIRED (== Torrent.torrentHash)
      "protocol": "torrent",
      "downloadClient": "bobarr",
      "indexer": "tracker name",
      "outputPath": "/usr/library/movies/..."
    }
  ],
  "totalRecords": 1
}

// Sonarr  GET /api/v3/queue  ->  same shape; movieId -> seriesId, plus episodeId/episode
{
  "records": [
    {
      "id": 51,
      "seriesId": 11,            // REQUIRED  (client filters by this)
      "episodeId": 101,
      "episode": { ...SonarrEpisode },
      "series": { ...SonarrSeries },
      "title": "...", "size": 0, "sizeleft": 0,
      "status": "completed",
      "downloadId": "<transmission hash>",
      "protocol": "torrent", "outputPath": "/usr/library/tvshows/..."
    }
  ],
  "totalRecords": 1
}
```

---

## 3. Bobarr engine you will back this with

- **Entities** (`packages/api/src/entities/`): `Movie` (unique `tmdbId`,
  `state`, `files[]`), `TVShow` (unique `tmdbId`, `seasons[]`, `episodes[]`),
  `TVSeason`, `TVEpisode`, `Torrent` (`resourceType`=movie/season/episode,
  `resourceId`, `quality`, `tag`, `completed`), `File`.
- **State machine** `DownloadableMediaState`:
  `searching -> missing -> downloading -> downloaded -> processed`
  (`app.dto.ts:15`).
- **Request -> download**: `library.resolver.ts` mutations
  (`trackMovie`, `trackTVShow`, `downloadMovie`, `downloadSeason`,
  `downloadTVEpisode`) -> `library-download.service.ts` ->
  `transmissionService.addTorrent(...)` -> BullMQ jobs (`download.processor`,
  `organize.processor`, `scan-library.processor`).
- **Torrent ranking**: `jackett.service.search()` (tag/quality scores),
  `utils/torrent-ranking.ts`.
- **Library folders**: `library-folders.service.ts`, `LIBRARY_ROOT=/usr/library`,
  media mounts via `env.MEDIA_MOUNTS`.
- **Auth**: global `JwtAuthGuard` (`APP_GUARD`), `@Public()` skips it. REST at
  `auth/`, `/jobs` (BullBoard), GraphQL at `/graphql`. Listens on **port 4000**
  (`main.ts:76`).

---

## 4. Routing & auth

- **Mount two separate controllers** so shared endpoint names (`queue`,
  `rootFolder`, `command`) never collide:
  - `@Controller('radarr')` -> movie routes
  - `@Controller('sonarr')` -> series routes
  - Client config: `RADARR_URL=http://<host>:<port>/radarr`,
    `SONARR_URL=http://<host>:<port>/sonarr`. The client appends `/api/v3/`,
    yielding `/radarr/api/v3/movie` and `/sonarr/api/v3/series`.
- **Auth**: mark routes `@Public()` (skip JWT) and add a local
  `XApiKeyGuard` that validates the `X-Api-Key` header against a stored Bobarr
  API key (or, minimally, any non-empty key after the setup wizard completes).
  Store the key in `ParameterKey.SONARR_RADARR_API_KEY` or `.env`.

---

## 5. Endpoint -> Bobarr mapping

| v3 endpoint | Bobarr backing |
|---|---|
| `GET /system/status` | static `{appName:"Bobarr", version, ...}` |
| `GET /rootFolder` | library mounts -> `{id, path, freeSpace, accessible}` |
| `GET /qualityprofile` | one default profile |
| `GET /movie` / `GET /series` | serialize `Movie`/`TVShow` (+ files + torrent state) via mapper |
| `GET /movie/lookup*`, `GET /series/lookup*` | Bobarr TMDB module -> reshape to partial movie/series |
| `POST /movie` | create `Movie` (`tmdbId`, `state=SEARCHING`) + start existing search/download |
| `POST /series` | `trackTVShow` with requested seasons; return Sonarr Series |
| `DELETE /movie/{id}`, `/series/{id}` | `removeMovie` / `removeTVShow` (honor `deleteFiles`) |
| `GET /queue` | join `Torrent` (by `resourceId`/`resourceType`) + Transmission status |
| `PUT /series/{id}` | toggle season `monitored` |
| `POST /command` (SeasonSearch) | re-run Jackett search job for that season |

---

## 6. Phased rollout

1. **Scaffolding**: new `packages/api/src/modules/sonarr-radarr/` with
   `SonarrModule`/`RadarrModule`, controllers, DTOs. Minimal `GET /system/status`
   + `GET /rootFolder` for both; verify with curl against the client's URL format.
2. **Radarr read-only**: `GET /movie`, `/movie/{id}`, `/movie/lookup*`, `/queue`.
   Test in the Mediora client's movie library view.
3. **Radarr write**: `POST /movie`, `DELETE`. Verify a request triggers Bobarr's
   real download->organize->scan pipeline.
4. **Sonarr read-only**: `GET /series`, `/series/{id}`, `/series/lookup*`,
   `/episode`, `/episodefile`, `/queue`.
5. **Sonarr write + commands**: `POST /series`, `DELETE`, `PUT /series/{id}`,
   `POST /command` (SeasonSearch), plus auto season-search wiring.
6. **Queue parity**: live download progress via Transmission status; correct
   `status` values (`downloading`, `completed`, `warning`).
7. **Docs**: add a "Connect the Mediora client" section to the README with the
   exact `SONARR_URL`/`RADARR_URL`/API-key steps.

---

## 7. Known gaps & decisions needed from you

- **Playback (Jellyfin)**: the client streams from Jellyfin; Bobarr has no
  transcoding/stream server. To fully replace the stack you'd need either (a)
  keep a Jellyfin for playback and use Bobarr only for requests, or (b) build a
  streaming layer in Bobarr (large, separate effort). **Which do you want?**
- **Quality profiles / season folders / minimumAvailability**: the client sends
  these but Bobarr models quality via `Torrent.quality` and organization via
  `OrganizeLibraryStrategy`. Decide how faithfully to map them; start minimal.
- **tvdbId**: Bobarr keys on `tmdbId`; Sonarr client reads `tvdbId`
  (`checkSeriesExists`). You'll need to store/fetch the TVDB ID (Bobarr's TMDB
  module likely has it) — confirm `TVShow` can expose it.
- **Fidelity vs. subset**: implement exactly the fields the client reads first
  (much less work), then broaden to full Radarr/Sonarr schema for
  tool-compatibility.

---

## 8. Verification (your agent should do this)

- Unit/integration tests for each v3 controller returning correctly-shaped JSON.
- **End-to-end in the Mediora app**: set `SONARR_URL`/`RADARR_URL` to Bobarr, run
  "test connection", load the movie/TV library, add a movie + a TV season, and
  confirm it appears in Bobarr's download queue and lands in the library after
  download.
- Confirm Bobarr's existing tests still pass (`yarn lint`; the api test suite in
  `packages/api/test`).

---

*See `docs/MEDIORA_CLIENT_INTEGRATION_SCAFFOLDING.md` for the module scaffolding.*
