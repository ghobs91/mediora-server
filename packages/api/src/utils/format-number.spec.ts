import { formatNumber } from './format-number';

describe('formatNumber', () => {
  it('pads single digits with a leading zero', () => {
    expect(formatNumber(1)).toEqual('01');
    expect(formatNumber(9)).toEqual('09');
  });

  it('keeps multi-digit numbers as-is', () => {
    expect(formatNumber(10)).toEqual('10');
    expect(formatNumber(99)).toEqual('99');
    expect(formatNumber(100)).toEqual('100');
  });

  it('pads zero', () => {
    expect(formatNumber(0)).toEqual('00');
  });
});
