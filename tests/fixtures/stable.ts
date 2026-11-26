import { test as base } from '@playwright/test';

import { withFxOff } from './fx-off';

// Default test for e2e, visual, a11y and overflow specs: every `page.goto` gets `?fx=off`, so no
// spec can forget it. Specs that exercise FX itself import `test` from '@playwright/test' instead.
export const test = base.extend({
  page: async ({ page }, use) => {
    const goto = page.goto.bind(page);
    page.goto = (url, options) => goto(withFxOff(url), options);
    await use(page);
  },
});

export { expect } from '@playwright/test';
