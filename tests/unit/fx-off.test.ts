import { describe, expect, it } from 'vitest';

import { withFxOff } from '../fixtures/fx-off';

describe('withFxOff', () => {
  it('adds fx=off to a bare path', () => {
    expect(withFxOff('/')).toBe('/?fx=off');
    expect(withFxOff('/work')).toBe('/work?fx=off');
  });

  it('keeps an existing query and hash', () => {
    expect(withFxOff('/work?type=app#grid')).toBe('/work?type=app&fx=off#grid');
  });

  it('keeps an fx value the test set on purpose', () => {
    expect(withFxOff('/?fx=low')).toBe('/?fx=low');
  });

  it('keeps absolute URLs absolute', () => {
    expect(withFxOff('https://example.workers.dev/about')).toBe(
      'https://example.workers.dev/about?fx=off',
    );
  });
});
