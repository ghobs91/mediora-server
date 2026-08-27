import { describe, expect, it } from 'vitest';
import { formatBytes } from './format-bytes';

describe('formatBytes', () => {
  it('formats zero and falsy values', () => {
    expect(formatBytes(0)).toEqual('0 B');
  });

  it('formats bytes', () => {
    expect(formatBytes(500)).toEqual('500 B');
  });

  it('formats kilobytes and megabytes', () => {
    expect(formatBytes(1024)).toEqual('1 KB');
    expect(formatBytes(1536)).toEqual('1.5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toEqual('5 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(2.5 * 1024 * 1024 * 1024)).toEqual('2.5 GB');
  });
});
