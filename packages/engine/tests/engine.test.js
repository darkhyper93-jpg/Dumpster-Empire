import { describe, it, expect } from 'vitest';

describe('andamiaje del engine', () => {
  it('corre en Node sin DOM', () => {
    expect(typeof document).toBe('undefined');
    expect(1 + 1).toBe(2);
  });
});
