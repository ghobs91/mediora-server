import { sanitize } from './sanitize';

describe('sanitize', () => {
  it('lowercases the input', () => {
    expect(sanitize('Avengers Endgame')).toEqual('avengers endgame');
  });

  it('replaces commas, dots and dashes with spaces', () => {
    expect(sanitize('X-Men, The.Last-Stand')).toEqual(
      'x men  the last stand'
    );
  });

  it('removes parentheses and brackets', () => {
    expect(sanitize('Movie (2020) [Extended]')).toEqual('movie 2020 extended');
  });

  it('strips apostrophes preceded by a lowercase letter', () => {
    expect(sanitize("L'armée des ombres")).toEqual(' armée des ombres');
    expect(sanitize("Qu'est-ce qu'on a fait")).toEqual(
      'q est ce q on a fait'
    );
  });

  it('strips apostrophes after lowercasing the title', () => {
    expect(sanitize("O'Brother")).toEqual(' brother');
  });

  it('replaces colons with spaces', () => {
    expect(sanitize('Star Wars: A New Hope')).toEqual(
      'star wars  a new hope'
    );
  });
});
