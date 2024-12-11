import { expect, test } from '@playwright/test';
import { features } from './benchmark.spec.js';
import BenchmarkPage from './benchmark.page.js';

let Benchmark;
const miloLibs = process.env.MILO_LIBS || '';

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  // heating CDN cache without filling browser cache
  await page.goto('/libs/features/mas/docs/benchmarks.html');
  // await expect(page.locator('.ccd-cards')).toBeVisible();

  page.close();
  // Create a new context (clears cache automatically)
  await browser.newContext();
});

test.beforeEach(async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Not supported to run on multiple browsers.');
  Benchmark = new BenchmarkPage(page);
  if (browserName === 'chromium') {
    await page.setExtraHTTPHeaders({ 'sec-ch-ua': '"Chromium";v="123", "Not:A-Brand";v="8"' });
  }
});

test.describe('Benchmark feature test suite', () => {
  // @MAS-CCD-benchmark
  test(`${features[0].name},${features[0].tags}`, async ({ page, baseURL }) => {
    test.slow();
    const testPage = `${baseURL}${features[0].path}${miloLibs}`;
    console.info('[Test Page]: ', testPage);

    await test.step('step-1: Go to CCD Merch Card Benchmark feature test page', async () => {
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(`${baseURL}${features[0].path}`);
    });

    await test.step('step-2: Validate benchmark', async () => {
      await expect(await Benchmark.container).toBeVisible();
      const limit = await Benchmark.container.getAttribute('data-benchmark-limit');

      await expect(await Benchmark.benchmarkMask.first()).toBeVisible();
      const times = await Benchmark.benchmarkMask.evaluateAll((nodes) => nodes.map((node) => {
        const time = node.getAttribute('data-benchmark-time');
        console.log(time);
        return time;
      }));

      console.log(times);
      expect(times.length).toBeGreaterThan(0);
      times.forEach((time) => {
        expect(parseFloat(time) < parseFloat(limit), `${time}ms should be less than limit ${limit}ms`).toBeTruthy();
      });
    });
  });
});
