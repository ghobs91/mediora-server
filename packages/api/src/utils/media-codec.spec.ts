import { assessAudio, assessAudioTracks } from './media-codec';

describe('assessAudioTracks', () => {
  it('treats a missing probe as unknown', () => {
    expect(assessAudioTracks(null)).toBe('unknown');
    expect(assessAudioTracks([])).toBe('unknown');
  });

  it('accepts English language tags', () => {
    expect(assessAudioTracks([{ language: 'eng' }])).toBe('english');
    expect(assessAudioTracks([{ language: 'en' }])).toBe('english');
    expect(assessAudioTracks([{ title: 'English 5.1' }])).toBe('english');
  });

  it('rejects tracks that are only foreign', () => {
    expect(assessAudioTracks([{ language: 'rus' }])).toBe('foreign');
    expect(assessAudioTracks([{ language: 'ita' }])).toBe('foreign');
    expect(assessAudioTracks([{ title: 'Russian' }])).toBe('foreign');
  });

  it('accepts a foreign track when English is also present', () => {
    expect(
      assessAudioTracks([{ language: 'rus' }, { language: 'eng' }])
    ).toBe('english');
  });

  it('does not reject untagged audio', () => {
    expect(assessAudioTracks([{ language: 'und' }])).toBe('unknown');
    expect(assessAudioTracks([{ language: undefined }])).toBe('unknown');
  });
});

describe('assessAudio', () => {
  it('uses the embedded release title when streams are untagged', () => {
    expect(
      assessAudio({
        tracks: [{ language: 'und' }],
        releaseTitle: 'Ozark.S04.1080p.WEB-DL.RUS',
      })
    ).toBe('foreign');
    expect(
      assessAudio({
        tracks: [],
        releaseTitle: 'Ozark.S04.1080p.WEB-DL.ITA',
      })
    ).toBe('foreign');
  });

  it('does not reject an untagged English/unknown release', () => {
    expect(
      assessAudio({
        tracks: [{ language: 'und' }],
        releaseTitle: 'Ozark.S01E04.1080p.10bit.WEBRip.x265-PSA',
      })
    ).toBe('unknown');
  });

  it('lets stream-level English override a foreign title marker', () => {
    expect(
      assessAudio({
        tracks: [{ language: 'eng' }],
        releaseTitle: 'Movie.MULTI.1080p',
      })
    ).toBe('english');
  });
});
