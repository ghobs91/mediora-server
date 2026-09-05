import { parseTvFile } from "./parse-tv-episode";

describe("parseTvFile", () => {
  const root = "/media/tvshows/Show";

  it("parses classic Season N / SxxExx layout", () => {
    expect(
      parseTvFile("/media/tvshows/Show/Season 1/Show.S01E01.mkv", root),
    ).toEqual({ seasonNumber: 1, episodeNumbers: [1] });
  });

  it("finds season from Sxx when there is no Season folder", () => {
    expect(parseTvFile("/media/tvshows/Show/Show.S02E05.mkv", root)).toEqual({
      seasonNumber: 2,
      episodeNumbers: [5],
    });
  });

  it("ignores season packs and years in parent folders", () => {
    expect(
      parseTvFile(
        "/media/tvshows/Show/Show.Complete.S01-S07/Season 2/Show.S02E05.mkv",
        root,
      ),
    ).toEqual({ seasonNumber: 2, episodeNumbers: [5] });
    expect(
      parseTvFile(
        "/media/tvshows/Show (2020)/Season 1/Show.S01E02.mkv",
        "/media/tvshows/Show (2020)",
      ),
    ).toEqual({ seasonNumber: 1, episodeNumbers: [2] });
  });

  it("parses 1x01 style and organize output names", () => {
    expect(
      parseTvFile("/media/tvshows/Show/Season 1/Show.1x05.mkv", root),
    ).toEqual({ seasonNumber: 1, episodeNumbers: [5] });
    expect(
      parseTvFile(
        "/media/tvshows/Show/Season 05/Show - S05E14 - Title - 1080p [WEB].mkv",
        root,
      ),
    ).toEqual({ seasonNumber: 5, episodeNumbers: [14] });
  });

  it("expands multi-episode files and ignores resolutions", () => {
    expect(
      parseTvFile("/media/tvshows/Show/Season 3/Show.S03E01-E02.mkv", root),
    ).toEqual({ seasonNumber: 3, episodeNumbers: [1, 2] });
    expect(
      parseTvFile("/media/tvshows/Show/S03/Show.S03E04E05.mkv", root),
    ).toEqual({ seasonNumber: 3, episodeNumbers: [4, 5] });
    expect(
      parseTvFile(
        "/media/tvshows/Show/Season 1/Show.S01E01.1080p.mkv",
        root,
      ),
    ).toEqual({ seasonNumber: 1, episodeNumbers: [1] });
  });

  it("uses folder season for Episode N names", () => {
    expect(
      parseTvFile("/media/tvshows/Show/Season 2/Episode 5.mkv", root),
    ).toEqual({ seasonNumber: 2, episodeNumbers: [5] });
  });

  it("skips sidecars, samples and dotfiles", () => {
    expect(
      parseTvFile("/media/tvshows/Show/Season 1/Show.S01E01.srt", root),
    ).toBeNull();
    expect(
      parseTvFile("/media/tvshows/Show/Season 1/Show.S01E01.sample.mkv", root),
    ).toBeNull();
    expect(parseTvFile("/media/tvshows/Show/Season 1/.DS_Store", root)).toBeNull();
  });
});
