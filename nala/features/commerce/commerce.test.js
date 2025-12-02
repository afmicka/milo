import { expect, test } from '@playwright/test';
import WebUtil from '../../libs/webutil.js';
import { features } from './commerce.spec.js';
import CommercePage from './commerce.page.js';
import FedsLogin from '../feds/login/login.page.js';
import FedsHeader from '../feds/header/header.page.js';
import { PRICE_PATTERN, constructTestUrl, setupWCSTracker, validateWCSRequests, setupMASTracker, validateMASRequests } from '../../libs/commerce.js';

let COMM;
test.beforeEach(async ({ page, baseURL, browserName }) => {
  test.skip(browserName !== 'chromium', 'Not supported to run on multiple browsers.');

  COMM = new CommercePage(page);
  if (browserName === 'chromium') {
    await page.setExtraHTTPHeaders({ 'sec-ch-ua': '"Chromium";v="123", "Not:A-Brand";v="8"' });
  }

  const skipOn = ['bacom', 'business'];
  skipOn.some((skip) => {
    if (baseURL.includes(skip)) test.skip(true, `Skipping the commerce tests for ${baseURL}`);
    return null;
  });
});

test.describe('Commerce feature test suite', () => {
  // @Commerce-Price-Term - Validate price with term display
  test(`${features[0].name},${features[0].tags}`, async ({ page, baseURL }) => {
    const testPage = constructTestUrl(baseURL, features[0].path);
    console.info('[Test Page]: ', testPage);

    await test.step('Go to the test page', async () => {
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Validate regular price display', async () => {
      await COMM.price.waitFor({ state: 'visible', timeout: 10000 });
      expect(await COMM.price.innerText()).toMatch(PRICE_PATTERN.US.yr);
      expect(await COMM.price.locator('.price-recurrence').innerText()).not.toBe('');
      expect(await COMM.price.locator('.price-unit-type').innerText()).toBe('');
      expect(await COMM.price.locator('.price-tax-inclusivity').innerText()).toBe('');
    });

    await test.step('Validate optical price display', async () => {
      await COMM.priceOptical.waitFor({ state: 'visible', timeout: 10000 });
      expect(await COMM.priceOptical.innerText()).toMatch(PRICE_PATTERN.US.mo);
      expect(await COMM.priceOptical.locator('.price-recurrence').innerText()).not.toBe('');
      expect(await COMM.priceOptical.locator('.price-unit-type').innerText()).toBe('');
      expect(await COMM.priceOptical.locator('.price-tax-inclusivity').innerText()).toBe('');
    });

    await test.step('Validate strikethrough price display', async () => {
      await COMM.priceStrikethrough.waitFor({ state: 'visible', timeout: 10000 });
      expect(await COMM.priceStrikethrough.innerText()).toMatch(PRICE_PATTERN.US.yr);
      expect(await COMM.priceStrikethrough.locator('.price-recurrence').innerText()).not.toBe('');
      expect(await COMM.priceStrikethrough.locator('.price-unit-type').innerText()).toBe('');
      expect(await COMM.priceStrikethrough.locator('.price-tax-inclusivity').innerText()).toBe('');
      const priceStyle = await COMM.priceStrikethrough.evaluate(
        (e) => window.getComputedStyle(e).getPropertyValue('text-decoration'),
      );
      expect(await priceStyle).toContain('line-through');
    });
  });

  // @Commerce-Price-Unit-Term - Validate price with term and unit display
  test(`${features[1].name},${features[1].tags}`, async ({ page, baseURL }) => {
    const testPage = constructTestUrl(baseURL, features[1].path);
    console.info('[Test Page]: ', testPage);

    await test.step('Go to the test page', async () => {
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Validate regular price display', async () => {
      await COMM.price.waitFor({ state: 'visible', timeout: 10000 });
      expect(await COMM.price.innerText()).toContain('US$');
      expect(await COMM.price.locator('.price-recurrence').innerText()).not.toBe('');
      expect(await COMM.price.locator('.price-unit-type').innerText()).not.toBe('');
      expect(await COMM.price.locator('.price-tax-inclusivity').innerText()).toBe('');
    });

    await test.step('Validate optical price display', async () => {
      await COMM.priceOptical.waitFor({ state: 'visible', timeout: 10000 });
      expect(await COMM.priceOptical.innerText()).toContain('US$');
      expect(await COMM.priceOptical.locator('.price-recurrence').innerText()).not.toBe('');
      expect(await COMM.priceOptical.locator('.price-unit-type').innerText()).not.toBe('');
      expect(await COMM.priceOptical.locator('.price-tax-inclusivity').innerText()).toBe('');
    });

    await test.step('Validate strikethrough price display', async () => {
      await COMM.priceStrikethrough.waitFor({ state: 'visible', timeout: 10000 });
      expect(await COMM.priceStrikethrough.innerText()).toContain('US$');
      expect(await COMM.priceStrikethrough.locator('.price-recurrence').innerText()).not.toBe('');
      expect(await COMM.priceStrikethrough.locator('.price-unit-type').innerText()).not.toBe('');
      expect(await COMM.priceStrikethrough.locator('.price-tax-inclusivity').innerText()).toBe('');
      const priceStyle = await COMM.priceStrikethrough.evaluate(
        (e) => window.getComputedStyle(e).getPropertyValue('text-decoration'),
      );
      expect(await priceStyle).toContain('line-through');
    });
  });

  // @Commerce-Price-Taxlabel-Unit-Term - Validate price with term, unit and tax label display
  test(`${features[2].name},${features[2].tags}`, async ({ page, baseURL }) => {
    const testPage = constructTestUrl(baseURL, features[2].path);
    console.info('[Test Page]: ', testPage);

    await test.step('Go to the test page', async () => {
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Validate regular price display', async () => {
      await COMM.price.waitFor({ state: 'visible', timeout: 10000 });
      expect(await COMM.price.innerText()).toContain('€');
      expect(await COMM.price.locator('.price-recurrence').innerText()).not.toBe('');
      expect(await COMM.price.locator('.price-unit-type').innerText()).not.toBe('');
      expect(await COMM.price.locator('.price-tax-inclusivity').innerText()).not.toBe('');
    });

    await test.step('Validate optical price display', async () => {
      await COMM.priceOptical.waitFor({ state: 'visible', timeout: 10000 });
      expect(await COMM.priceOptical.innerText()).toContain('€');
      expect(await COMM.priceOptical.locator('.price-recurrence').innerText()).not.toBe('');
      expect(await COMM.priceOptical.locator('.price-unit-type').innerText()).not.toBe('');
      expect(await COMM.priceOptical.locator('.price-tax-inclusivity').innerText()).not.toBe('');
    });

    await test.step('Validate strikethrough price display', async () => {
      await COMM.priceStrikethrough.waitFor({ state: 'visible', timeout: 10000 });
      expect(await COMM.priceStrikethrough.innerText()).toContain('€');
      expect(await COMM.priceStrikethrough.locator('.price-recurrence').innerText()).not.toBe('');
      expect(await COMM.priceStrikethrough.locator('.price-unit-type').innerText()).not.toBe('');
      expect(await COMM.priceStrikethrough.locator('.price-tax-inclusivity').innerText()).not.toBe('');
      const priceStyle = await COMM.priceStrikethrough.evaluate(
        (e) => window.getComputedStyle(e).getPropertyValue('text-decoration'),
      );
      expect(await priceStyle).toContain('line-through');
    });
  });

  // @Commerce-Promo - Validate price and CTAs have promo code applied
  test(`${features[3].name},${features[3].tags}`, async ({ page, baseURL }) => {
    const testPage = constructTestUrl(baseURL, features[3].path);
    const { data } = features[3];

    console.info('[Test Page]: ', testPage);

    await test.step('Go to the test page', async () => {
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Validate regular price has promo', async () => {
      await COMM.price.waitFor({ state: 'visible', timeout: 10000 });
      await expect(COMM.price).toHaveAttribute('data-promotion-code', data.promo);
      await expect(COMM.price).toHaveAttribute('data-display-old-price', 'true');
      await COMM.price.locator('.price').first().waitFor({ state: 'visible', timeout: 10000 });
      await COMM.price.locator('.price-strikethrough').waitFor({ state: 'visible', timeout: 10000 });
    });

    await test.step('Validate optical price has promo', async () => {
      await COMM.priceOptical.waitFor({ state: 'visible', timeout: 10000 });
      await expect(COMM.priceOptical).toHaveAttribute('data-promotion-code', data.promo);
    });

    await test.step('Validate strikethrough price has promo', async () => {
      await COMM.priceStrikethrough.waitFor({ state: 'visible', timeout: 10000 });
      await expect(COMM.priceStrikethrough).toHaveAttribute('data-promotion-code', data.promo);
    });

    await test.step('Validate Buy now CTA has promo', async () => {
      await COMM.buyNowCta.waitFor({ state: 'visible', timeout: 10000 });
      await expect(COMM.buyNowCta).toHaveAttribute('data-promotion-code', data.promo);
      await expect(COMM.buyNowCta).toHaveAttribute('href', new RegExp(`${data.promo}`));
    });

    await test.step('Validate Free Trial CTA has promo', async () => {
      await COMM.freeTrialCta.waitFor({ state: 'visible', timeout: 10000 });
      await expect(COMM.freeTrialCta).toHaveAttribute('data-promotion-code', data.promo);
      await expect(COMM.freeTrialCta).toHaveAttribute('href', new RegExp(`${data.promo}`));
      await expect(COMM.freeTrialCta).toHaveAttribute('href', new RegExp(`${data.workflow}`));
    });
  });

  // @Commerce-Upgrade-Entitlement - Validate Upgrade commerce flow
  test(`${features[4].name}, ${features[4].tags}`, async ({ page, baseURL }) => {
    test.skip(); // Skipping due to missing login

    const testPage = constructTestUrl(baseURL, features[4].path);
    console.info('[Test Page]: ', testPage);

    const { data } = features[4];
    const Login = new FedsLogin(page);
    const Header = new FedsHeader(page);

    // Go to test example
    await test.step('Go to test page', async () => {
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
    });

    // Login with Adobe test account:
    await test.step('Login with a valid Adobe account', async () => {
      await Header.signInButton.click();
      if (COMM.loginType.isVisible()) {
        await COMM.loginType.click();
      }
      await Login.loginOnAppForm(process.env.IMS_EMAIL_PAID_PS, process.env.IMS_PASS_PAID_PS);
    });

    // Validate Upgrade eligibility check w.r.t Buy CTA
    await test.step('Verify cc all apps card cta title', async () => {
      await page.waitForLoadState('domcontentloaded');
      await COMM.ccAllAppsCTA.waitFor({ state: 'visible', timeout: 10000 });
      await expect(COMM.ccAllAppsCTA).toHaveText(data.UpgradeCTATitle);
    });

    // Validate Upgrade eligibility check w.r.t Switch modal
    await test.step('Verify Switch modal launch for Upgrade', async () => {
      await COMM.ccAllAppsCTA.click();
      await COMM.switchModalIframe.waitFor({ state: 'visible', timeout: 45000 });
      await expect(COMM.switchModalIframe).toBeVisible();
    });
  });

  // @Commerce-Download-Entitlement - Validate Download commerce flow
  test(`${features[5].name}, ${features[5].tags}`, async ({ page, baseURL }) => {
    test.skip(); // Skipping due to missing login

    const testPage = constructTestUrl(baseURL, features[5].path);
    console.info('[Test Page]: ', testPage);
    const { data } = features[5];
    const Login = new FedsLogin(page);
    const Header = new FedsHeader(page);

    // Go to test example
    await test.step('Go to test page', async () => {
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
    });

    // Login with Adobe test account:
    await test.step('Login with a valid Adobe account', async () => {
      await Header.signInButton.click();
      if (COMM.loginType.isVisible()) {
        await COMM.loginType.click();
      }
      await Login.loginOnAppForm(process.env.IMS_EMAIL_PAID_PS, process.env.IMS_PASS_PAID_PS);
    });

    // Validate Download eligibility check w.r.t Buy CTA
    await test.step('Verify photoshop card cta title', async () => {
      await page.waitForLoadState('domcontentloaded');
      await COMM.photoshopBuyCTA.waitFor({ state: 'visible', timeout: 10000 });
      await expect(COMM.photoshopBuyCTA).toHaveText(data.DownloadCTATitle);
      await expect(COMM.photoshopFreeCTA).toHaveText(data.TrialCTATitle);
    });

    // Validate Download eligibility check w.r.t download link
    await test.step('Verify download link for download', async () => {
      await COMM.photoshopBuyCTA.click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page.url()).toContain(data.DownloadUrl);
    });
  });

  // @Commerce-KitchenSink-Smoke - Validate commerce CTA and checkout placeholders
  test(`${features[6].name}, ${features[6].tags}`, async ({ page, baseURL }) => {
    const testPage = constructTestUrl(baseURL, features[6].path);
    const webUtil = new WebUtil(page);

    console.info('[Test Page]: ', testPage);

    // Go to test example
    await test.step('Go to test page', async () => {
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
    });

    // Validate there are no unresolved commerce placeholders
    await test.step('Validate wcs placeholders', async () => {
      await COMM.merchCard.first().waitFor({ state: 'visible', timeout: 45000 });
      await webUtil.scrollPage('down', 'slow');
      const unresolvedPlaceholders = await page.evaluate(
        () => [...document.querySelectorAll('[data-wcs-osi]')].filter(
          (el) => !el.classList.contains('placeholder-resolved'),
        ),
      );
      expect(unresolvedPlaceholders.length).toBe(0);
    });

    // Validate commerce checkout links are indeed commerce
    await test.step('Validate checkout links', async () => {
      const invalidCheckoutLinks = await page.evaluate(
        () => [...document.querySelectorAll('[data-wcs-osi][is="checkout-link"]')].filter(
          (el) => !el.getAttribute('href').includes('commerce'),
        ),
      );
      expect(invalidCheckoutLinks.length).toBe(0);
    });
  });

  // @Commerce-DE - Validate commerce CTA and checkout placeholders in DE locale
  test(`${features[7].name}, ${features[7].tags}`, async ({ page, baseURL }) => {
    const testPage = constructTestUrl(baseURL, features[7].path);
    const { data } = features[7];

    console.info('[Test Page]: ', testPage);

    await test.step('Go to the test page', async () => {
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
    });

    // Validate there are no unresolved commerce placeholders
    await test.step('Validate wcs placeholders', async () => {
      const unresolvedPlaceholders = await page.evaluate(
        () => [...document.querySelectorAll('[data-wcs-osi]')].filter(
          (el) => !el.classList.contains('placeholder-resolved'),
        ),
      );
      expect(unresolvedPlaceholders.length).toBe(0);
    });

    await test.step('Validate Buy now CTA', async () => {
      await COMM.checkoutCTA.nth(0).waitFor({ state: 'visible', timeout: 10000 });
      await expect(COMM.checkoutCTA.nth(0)).toHaveAttribute('data-promotion-code', data.promo);
      await expect(COMM.checkoutCTA.nth(0)).toHaveAttribute('href', new RegExp(`${data.promo}`));
      await expect(COMM.checkoutCTA.nth(0)).toHaveAttribute('href', new RegExp(`${data.CO}`));
      await expect(COMM.checkoutCTA.nth(0)).toHaveAttribute('href', new RegExp(`${data.lang}`));
    });

    await test.step('Validate Free Trial CTA', async () => {
      await COMM.checkoutCTA.nth(1).waitFor({ state: 'visible', timeout: 10000 });
      await expect(COMM.checkoutCTA.nth(1)).toHaveAttribute('data-promotion-code', data.promo);
      await expect(COMM.checkoutCTA.nth(1)).toHaveAttribute('href', new RegExp(`${data.promo}`));
      await expect(COMM.checkoutCTA.nth(1)).toHaveAttribute('href', new RegExp(`${data.CO}`));
      await expect(COMM.checkoutCTA.nth(1)).toHaveAttribute('href', new RegExp(`${data.lang}`));
      await expect(COMM.checkoutCTA.nth(1)).toHaveAttribute('href', new RegExp(`${data.workflow}`));
    });

    await test.step('Validate regular price display', async () => {
      await COMM.price.waitFor({ state: 'visible', timeout: 10000 });
      expect(await COMM.price.innerText()).toContain('€/Jahr');
      expect(await COMM.price.locator('.price-recurrence').innerText()).not.toBe('');
      expect(await COMM.price.locator('.price-unit-type').innerText()).toBe('');
      expect(await COMM.price.locator('.price-tax-inclusivity').innerText()).toBe('');
      await expect(COMM.price).toHaveAttribute('data-promotion-code', data.promo);
    });

    await test.step('Validate optical price display', async () => {
      await COMM.priceOptical.waitFor({ state: 'visible', timeout: 10000 });
      expect(await COMM.priceOptical.innerText()).toContain('€/Monat');
      expect(await COMM.priceOptical.locator('.price-recurrence').innerText()).not.toBe('');
      expect(await COMM.priceOptical.locator('.price-unit-type').innerText()).toBe('');
      expect(await COMM.priceOptical.locator('.price-tax-inclusivity').innerText()).toBe('');
      await expect(COMM.priceOptical).toHaveAttribute('data-promotion-code', data.promo);
    });

    await test.step('Validate strikethrough price display', async () => {
      await COMM.priceStrikethrough.waitFor({ state: 'visible', timeout: 10000 });
      expect(await COMM.priceStrikethrough.innerText()).toContain('€/Jahr');
      expect(await COMM.priceStrikethrough.locator('.price-recurrence').innerText()).not.toBe('');
      expect(await COMM.priceStrikethrough.locator('.price-unit-type').innerText()).toBe('');
      expect(await COMM.priceStrikethrough.locator('.price-tax-inclusivity').innerText()).toBe('');
      const priceStyle = await COMM.priceStrikethrough.evaluate(
        (e) => window.getComputedStyle(e).getPropertyValue('text-decoration'),
      );
      expect(await priceStyle).toContain('line-through');
      await expect(COMM.priceStrikethrough).toHaveAttribute('data-promotion-code', data.promo);
    });
  });

  // @Commerce-Old-Promo - Validate promo price WITHOUT old price
  test(`${features[8].name},${features[8].tags}`, async ({ page, baseURL }) => {
    const testPage = constructTestUrl(baseURL, features[8].path);
    const { data } = features[8];

    console.info('[Test Page]: ', testPage);

    await test.step('Go to the test page', async () => {
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Validate promo price does not show old price', async () => {
      await COMM.price.waitFor({ state: 'visible', timeout: 10000 });
      await expect(COMM.price).toHaveAttribute('data-promotion-code', data.promo);
      await expect(COMM.price).not.toHaveAttribute('data-display-old-price', 'true');
      // expect(await COMM.price.innerText()).toContain('US$17.24');
      // expect(await COMM.price.innerText()).not.toContain('US$34.49');
      await expect(await COMM.price.locator('.price').first()).toBeVisible();
      await expect(await COMM.price.locator('.price-strikethrough')).not.toBeVisible();
    });
  });

  // @Commerce-GB - Validate commerce CTA and checkout placeholders in UK locale
  test(`${features[9].name}, ${features[9].tags}`, async ({ page, baseURL }) => {
    const testPage = constructTestUrl(baseURL, features[9].path);
    const { data } = features[9];

    console.info('[Test Page]: ', testPage);

    await test.step('Go to the test page', async () => {
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
    });

    // Validate there are no unresolved commerce placeholders
    await test.step('Validate wcs placeholders', async () => {
      const unresolvedPlaceholders = await page.evaluate(
        () => [...document.querySelectorAll('[data-wcs-osi]')].filter(
          (el) => !el.classList.contains('placeholder-resolved'),
        ),
      );
      expect(unresolvedPlaceholders.length).toBe(0);
    });

    await test.step('Validate Buy now CTA', async () => {
      await COMM.buyNowCta.waitFor({ state: 'visible', timeout: 10000 });
      await expect(COMM.buyNowCta).toHaveAttribute('data-promotion-code', data.promo);
      await expect(COMM.buyNowCta).toHaveAttribute('href', new RegExp(`${data.promo}`));
      await expect(COMM.buyNowCta).toHaveAttribute('href', new RegExp(`${data.CO}`));
      await expect(COMM.buyNowCta).toHaveAttribute('href', new RegExp(`${data.lang}`));
    });

    await test.step('Validate Free Trial CTA', async () => {
      await COMM.freeTrialCta.waitFor({ state: 'visible', timeout: 10000 });
      await expect(COMM.freeTrialCta).toHaveAttribute('data-promotion-code', data.promo);
      await expect(COMM.freeTrialCta).toHaveAttribute('href', new RegExp(`${data.promo}`));
      await expect(COMM.freeTrialCta).toHaveAttribute('href', new RegExp(`${data.CO}`));
      await expect(COMM.freeTrialCta).toHaveAttribute('href', new RegExp(`${data.lang}`));
      await expect(COMM.freeTrialCta).toHaveAttribute('href', new RegExp(`${data.workflow}`));
    });

    await test.step('Validate regular price display', async () => {
      await COMM.price.waitFor({ state: 'visible', timeout: 10000 });
      expect(await COMM.price.innerText()).toContain('£');
      expect(await COMM.price.innerText()).toContain('/yr');
      expect(await COMM.price.locator('.price-recurrence').first().innerText()).not.toBe('');
      expect(await COMM.price.locator('.price-unit-type').first().innerText()).toBe('');
      expect(await COMM.price.locator('.price-tax-inclusivity').first().innerText()).toBe('');
      await expect(COMM.price).toHaveAttribute('data-promotion-code', data.promo);
      await expect(COMM.price).toHaveAttribute('data-display-old-price', 'true');
      await COMM.price.locator('.price').first().waitFor({ state: 'visible', timeout: 10000 });
      await COMM.price.locator('.price-strikethrough').waitFor({ state: 'visible', timeout: 10000 });
    });

    await test.step('Validate optical price display', async () => {
      await COMM.priceOptical.waitFor({ state: 'visible', timeout: 10000 });
      expect(await COMM.priceOptical.innerText()).toContain('£');
      expect(await COMM.priceOptical.innerText()).toContain('/mo');
      expect(await COMM.priceOptical.locator('.price-recurrence').innerText()).not.toBe('');
      expect(await COMM.priceOptical.locator('.price-unit-type').innerText()).toBe('');
      expect(await COMM.priceOptical.locator('.price-tax-inclusivity').innerText()).toBe('');
      await expect(COMM.priceOptical).toHaveAttribute('data-promotion-code', data.promo);
    });

    await test.step('Validate strikethrough price display', async () => {
      await COMM.priceStrikethrough.waitFor({ state: 'visible', timeout: 10000 });
      expect(await COMM.priceStrikethrough.innerText()).toContain('£');
      expect(await COMM.priceStrikethrough.innerText()).toContain('/yr');
      expect(await COMM.priceStrikethrough.locator('.price-recurrence').innerText()).not.toBe('');
      expect(await COMM.priceStrikethrough.locator('.price-unit-type').innerText()).toBe('');
      expect(await COMM.priceStrikethrough.locator('.price-tax-inclusivity').innerText()).toBe('');
      const priceStyle = await COMM.priceStrikethrough.evaluate(
        (e) => window.getComputedStyle(e).getPropertyValue('text-decoration'),
      );
      expect(await priceStyle).toContain('line-through');
      await expect(COMM.priceStrikethrough).toHaveAttribute('data-promotion-code', data.promo);
    });
  });

  test(`${features[10].name}, ${features[10].tags}`, async ({ page, baseURL }) => {
    const testPage = constructTestUrl(baseURL, features[10].path);
    console.info('[Test Page]: ', testPage);
    const { data } = features[10];

    await test.step('Go to the test page', async () => {
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
    });

    let regularPrice;

    await test.step('Validate the regular price is displayed if quantity is less than the minimum promotion quantity', async () => {
      await COMM.volumeDiscountWithoutQuantity.waitFor({ state: 'visible', timeout: 10000 });
      await expect(COMM.volumeDiscountWithoutQuantity).toHaveAttribute('data-promotion-code', data.promo);
      await expect(COMM.volumeDiscountWithoutQuantity).toHaveAttribute('data-quantity', '1');
      regularPrice = `${await COMM.volumeDiscountWithoutQuantityInteger.innerText()}.${await COMM.volumeDiscountWithoutQuantityDecimals.innerText()}`;
      expect(regularPrice).not.toBe('');
      await expect(COMM.volumeDiscountWithoutQuantityStrikethrough).not.toBeVisible();
      await expect(COMM.volumeDiscountWithoutQuantityAlternative).not.toBeVisible();
    });

    await test.step('Validate the strikethrough price is the same as the regular price', async () => {
      await COMM.volumeDiscountWithQuantity.waitFor({ state: 'visible', timeout: 10000 });
      await expect(COMM.volumeDiscountWithQuantity).toHaveAttribute('data-promotion-code', data.promo);
      await expect(COMM.volumeDiscountWithQuantity).toHaveAttribute('data-quantity', '3');
      const priceStrikedThrough = `${await COMM.volumeDiscountWithQuantityStrikeThroughInteger.innerText()}.${await COMM.volumeDiscountWithQuantityStrikeThroughDecimals.innerText()}`;
      expect(priceStrikedThrough).toBe(regularPrice);
    });

    await test.step('Validate the volume discount price is displayed if quantity is greater than the minimum promotion quantity', async () => {
      await COMM.volumeDiscountWithQuantity.waitFor({ state: 'visible', timeout: 10000 });
      await expect(COMM.volumeDiscountWithQuantity).toHaveAttribute('data-promotion-code', data.promo);
      await expect(COMM.volumeDiscountWithQuantity).toHaveAttribute('data-quantity', '3');
      const volumeDiscountPrice = `${await COMM.volumeDiscountWithQuantityAlternativeInteger.innerText()}.${await COMM.volumeDiscountWithQuantityAlternativeDecimals.innerText()}`;
      expect(regularPrice > volumeDiscountPrice).toBe(true);
    });

    await test.step('Validate the alternative price next to the regular strikethrough price', async () => {
      await COMM.strikethroughPrice.waitFor({ state: 'visible', timeout: 10000 });
      expect(COMM.strikethroughPrice).toBeVisible();
      await COMM.alternativePrice.waitFor({ state: 'visible', timeout: 10000 });
      expect(COMM.alternativePrice).toBeVisible();
      const strikethroughRegularPrice = Number(`${await COMM.strikethroughPriceInteger.innerText()}.${await COMM.strikethroughPriceDecimals.innerText()}`);
      const promoPrice = Number(`${await COMM.alternativePriceInteger.innerText()}.${await COMM.alternativePriceDecimals.innerText()}`);
      expect(promoPrice).not.toBeNull();
      expect(strikethroughRegularPrice).not.toBeNull();
      expect(promoPrice).toBeLessThan(strikethroughRegularPrice);
    });
  });

  test(`${features[11].name}, ${features[11].tags}`, async ({ page, baseURL }) => {
    const testPage = constructTestUrl(baseURL, features[11].path);
    console.info('[Test Page]: ', testPage);
    const { data } = features[11];

    await test.step('Go to the test page', async () => {
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
    });

    let regularPrice;
    let regularAnnualPrice;

    await test.step('Validate the regular price and annual price are displayed if quantity is less than the minimum promotion quantity', async () => {
      await COMM.volumeDiscountWithoutQuantity.waitFor({ state: 'visible', timeout: 10000 });
      await expect(COMM.volumeDiscountWithoutQuantity).toHaveAttribute('data-promotion-code', data.promo);
      await expect(COMM.volumeDiscountWithoutQuantity).toHaveAttribute('data-quantity', '1');
      regularPrice = `${await COMM.volumeDiscountWithoutQuantityInteger.innerText()}.${await COMM.volumeDiscountWithoutQuantityDecimals.innerText()}`;
      regularAnnualPrice = `${await COMM.volumeDiscountWithoutQuantityAnnualInteger.innerText()}.${await COMM.volumeDiscountWithoutQuantityAnnualDecimals.innerText()}`;
      expect(regularPrice).not.toBe('');
      expect(regularAnnualPrice).not.toBe('');
      await expect(COMM.volumeDiscountWithoutQuantityStrikethrough).not.toBeVisible();
      await expect(COMM.volumeDiscountWithoutQuantityAlternative).not.toBeVisible();
    });

    await test.step('Validate the strikethrough price is the same as the regular price', async () => {
      await COMM.volumeDiscountWithQuantity.waitFor({ state: 'visible', timeout: 10000 });
      await expect(COMM.volumeDiscountWithQuantity).toHaveAttribute('data-promotion-code', data.promo);
      await expect(COMM.volumeDiscountWithQuantity).toHaveAttribute('data-quantity', '3');
      const priceStrikedThrough = `${await COMM.volumeDiscountWithQuantityStrikeThroughInteger.innerText()}.${await COMM.volumeDiscountWithQuantityStrikeThroughDecimals.innerText()}`;
      expect(priceStrikedThrough).toBe(regularPrice);
    });

    await test.step('Validate the volume discount price is displayed if quantity is greater than the minimum promotion quantity, and annual price is based on the promo price', async () => {
      await COMM.volumeDiscountWithQuantity.waitFor({ state: 'visible', timeout: 10000 });
      await expect(COMM.volumeDiscountWithQuantity).toHaveAttribute('data-promotion-code', data.promo);
      await expect(COMM.volumeDiscountWithQuantity).toHaveAttribute('data-quantity', '3');
      const volumeDiscountPrice = `${await COMM.volumeDiscountWithQuantityAlternativeInteger.innerText()}.${await COMM.volumeDiscountWithQuantityAlternativeDecimals.innerText()}`;
      expect(regularPrice > volumeDiscountPrice).toBe(true);
      const volumeDiscountAnnualPrice = `${await COMM.volumeDiscountWithQuantityAnnualInteger.innerText()}.${await COMM.volumeDiscountWithQuantityAnnualDecimals.innerText()}`;
      expect(Number(volumeDiscountAnnualPrice.replace(',', '')) < Number(regularAnnualPrice.replace(',', ''))).toBe(true);
    });
  });

  // @Commerce-WCS-Country-Locale - Validate WCS requests have correct country and locale params
  test(`${features[12].name}, ${features[12].tags}`, async ({ browser, baseURL }) => {
    test.setTimeout(600000); // 10 minutes for all countries

    const { data, paths, path: legacyPath, env: specEnv = 'prod', envs: specEnvs } = features[12];
    // Determine which environments to test
    // Priority: COMMERCE_ENV env var > spec envs array > spec env default
    let testEnvs;
    if (process.env.COMMERCE_ENV) {
      // If COMMERCE_ENV is set, use only that environment
      testEnvs = [process.env.COMMERCE_ENV];
    } else if (specEnvs && specEnvs.length > 0) {
      // Use environments from spec
      testEnvs = specEnvs;
    } else {
      // Fallback to spec env default
      testEnvs = [specEnv];
    }
    const { countries } = data;

    // Support both paths array (new) and single path (backward compatibility)
    // Use pathBuilder from spec (always defined for feature 12)
    const defaultPathBuilder = features[12].pathBuilder;

    const testPaths = paths || [{
      path: legacyPath,
    }];

    // Create a browser context for all pages
    const context = await browser.newContext({
      extraHTTPHeaders: { 'sec-ch-ua': '"Chromium";v="123", "Not:A-Brand";v="8"' },
    });

    // Create test configurations: each path × each country × each environment (excluding skipped countries)
    const testConfigs = [];
    testPaths.forEach((pathConfig) => {
      const skipCountries = pathConfig.skipCountries || [];
      countries.forEach((countryConfig) => {
        // Skip this country if it's in the skip list for this path
        if (!skipCountries.includes(countryConfig.country)) {
          testEnvs.forEach((env) => {
            testConfigs.push({
              pathConfig,
              countryConfig,
              env,
            });
          });
        }
      });
    });

    // Run all tests in parallel
    const results = await Promise.allSettled(
      testConfigs.map(async ({ pathConfig, countryConfig, env }) => {
        const { country, locale, urlPrefix } = countryConfig;
        const { path: basePath, pathBuilder: pathSpecificBuilder, expectedServer, skipElementCheck } = pathConfig;
        // Use path-specific pathBuilder if provided, otherwise use feature-level default
        const pathBuilder = pathSpecificBuilder || defaultPathBuilder;
        // Construct path using pathBuilder function (before try block to ensure it's always defined)
        const countryPath = pathBuilder(basePath, country, urlPrefix);
        const page = await context.newPage();
        const errors = [];

        try {
          // Set up tracker for web_commerce_artifact requests
          const WCSRequests = [];
          const tracker = await setupWCSTracker(WCSRequests);

          // Attach listeners to the page before navigation
          page.on('request', tracker.requestListener);
          page.on('response', tracker.responseListener);
          page.on('requestfailed', tracker.requestFailedListener);

          // Use custom baseURL if specified, otherwise use framework baseURL
          const pathBaseURL = pathConfig.baseURL || baseURL;

          // Add commerce.env parameter if stage environment
          const envParam = env === 'stage' ? '?commerce.env=stage' : '';
          const testPage = constructTestUrl(pathBaseURL, countryPath, envParam);
          // console.info(`Page: ${testPage}`);

          await page.goto(testPage, { waitUntil: 'commit', timeout: 30000 });

          // Check for commerce elements - wait for elements themselves, not page load state
          // Skip this check if skipElementCheck is true
          if (!skipElementCheck) {
            try {
              const commPage = new CommercePage(page);
              await Promise.all([
                commPage.price.first().waitFor({ state: 'visible', timeout: 20000 }),
                commPage.checkoutCTA.first().waitFor({ state: 'visible', timeout: 20000 }),
                // Check for resolved placeholders
                page.waitForFunction(
                  () => {
                    const placeholders = document.querySelectorAll('[data-wcs-osi]');
                    return placeholders.length > 0 && Array.from(placeholders).some(
                      (el) => el.classList.contains('placeholder-resolved'),
                    );
                  },
                  { timeout: 20000 },
                ),
              ]);
            } catch (error) {
              errors.push('No commerce elements found on page (no commerce elements visible and no placeholders resolved)');
            }

            await page.waitForTimeout(2000);
          } else {
            // If skipping element check, wait for placeholders to be resolved
            // This ensures WCS requests have been made
            try {
              await page.waitForFunction(
                () => {
                  const placeholders = document.querySelectorAll('[data-wcs-osi]');
                  return placeholders.length > 0 && Array.from(placeholders).some(
                    (el) => el.classList.contains('placeholder-resolved'),
                  );
                },
                { timeout: 30000 },
              );
              // Wait additional time for all WCS requests to complete
              await page.waitForTimeout(45000);
            } catch (error) {
              // If placeholders don't resolve, still wait and try to collect WCS requests
              await page.waitForTimeout(5000);
            }
          }

          // Small wait to allow response handlers to process
          // This timing is critical - console.info was inadvertently providing this delay
          await page.waitForTimeout(100);

          // Wait for all WCS requests to receive responses
          // WCS requests can come in slowly, so we need to check for a stable state
          const maxWaitTime = 120000; // 120 seconds max (increased for stage environment)
          const pollInterval = 2000; // Check every 2 seconds (increased to compensate for removed logging overhead)
          const stableWaitTime = 8000; // Wait 8 seconds of no new requests
          const startTime = Date.now();
          let lastRequestCount = 0;
          let lastChangeTime = Date.now();
          let lastStatusCheckTime = Date.now();
          
          while (Date.now() - startTime < maxWaitTime) {
            await page.waitForTimeout(pollInterval);
            
            const wcsRequests = tracker.getRequests();
            const currentRequestCount = wcsRequests.length;
            
            // Check if we have new requests
            if (currentRequestCount !== lastRequestCount) {
              lastRequestCount = currentRequestCount;
              lastChangeTime = Date.now();
              lastStatusCheckTime = Date.now();
            }
            
            // If we have requests and they've been stable for stableWaitTime
            if (currentRequestCount > 0 && (Date.now() - lastChangeTime) >= stableWaitTime) {
              // Only check status every 3 seconds to avoid race conditions
              if (Date.now() - lastStatusCheckTime >= 3000) {
                const allHaveStatus = wcsRequests.every(req => req.status !== undefined || req.failed);
                if (allHaveStatus) {
                  // Double check after 2 more seconds
                  await page.waitForTimeout(2000);
                  const finalCheck = tracker.getRequests();
                  if (finalCheck.every(req => req.status !== undefined || req.failed)) {
                    break;
                  }
                }
                lastStatusCheckTime = Date.now();
              }
            }
          }
          
          // Final wait to ensure all async operations complete
          await page.waitForTimeout(5000);

          // Get all collected requests and validate them
          const requests = tracker.getRequests();
          const validationErrors = validateWCSRequests(requests, {
            expectedCountry: country,
            expectedLocale: locale,
            env, // Pass environment to validate WCS URL
            expectedServer: expectedServer !== undefined ? expectedServer : false, // Use expectedServer from path config, default to true
          });
          errors.push(...validationErrors);
        } catch (error) {
          errors.push(`Error during test execution: ${error.message || String(error)}`);
        } finally {
          await page.close();
        }

        return { path: countryPath, country, locale, env, errors };
      }),
    );

    // Collect failures
    const allResults = [];
    results.forEach((result, index) => {
      const config = testConfigs[index];
      if (result.status === 'rejected') {
        allResults.push({
          path: config.pathConfig.path,
          country: config.countryConfig.country,
          locale: config.countryConfig.locale,
          env: config.env,
          errors: [`Promise rejected: ${result.reason?.message || String(result.reason)}`],
        });
      } else if (result.value && result.value.errors.length > 0) {
        allResults.push(result.value);
      }
    });

    // Close the context
    await context.close();

    // Report all failures at the end (allResults already contains only failures)
    if (allResults.length > 0) {
      const failureReport = allResults.map((failure, index) => {
        const errorList = failure.errors.map((err, i) => `    ${i + 1}. ${err}`).join('\n');
        const envLabel = failure.env ? `, env=${failure.env}` : '';
        return `${index + 1}. path=${failure.path}, country=${failure.country} (${failure.locale})${envLabel}:\n${errorList}`;
      }).join('\n\n');

      const totalConfigs = testConfigs.length;
      throw new Error(`\n=== FAILURES SUMMARY ===\n\n${failureReport}\n\nTotal: ${allResults.length} out of ${totalConfigs} configurations failed\n`);
    }
  });

  // @Commerce-WCS-Geo-Country-Locale - Validate WCS requests with akamaiLocale parameter
  test(`${features[13].name}, ${features[13].tags}`, async ({ browser, baseURL }) => {
    test.setTimeout(600000); // 10 minutes

    const { data, paths, browserParams, env: specEnv = 'prod', envs: specEnvs } = features[13];
    // Determine which environments to test
    // Priority: COMMERCE_ENV env var > spec envs array > spec env default
    let testEnvs;
    if (process.env.COMMERCE_ENV) {
      // If COMMERCE_ENV is set, use only that environment
      testEnvs = [process.env.COMMERCE_ENV];
    } else if (specEnvs && specEnvs.length > 0) {
      // Use environments from spec
      testEnvs = specEnvs;
    } else {
      // Fallback to spec env default
      testEnvs = [specEnv];
    }
    const { akamaiLocales } = data;
    const { supported, 'non-supported': nonSupported } = akamaiLocales;

    // Support both single path (backward compatibility) and multiple paths
    const testPaths = paths || [{ path: features[13].path, expectedLocale: (akamaiLocale, type) => (type === 'supported' ? `en_${akamaiLocale}` : 'en_US'), expectedServer: false }];

    // Create a browser context for all pages
    const context = await browser.newContext({
      extraHTTPHeaders: { 'sec-ch-ua': '"Chromium";v="123", "Not:A-Brand";v="8"' },
    });

    // Combine both arrays with their types for unified processing
    const allAkamaiLocales = [
      ...supported.map((akamaiLocale) => ({ akamaiLocale, type: 'supported' })),
      ...nonSupported.map((akamaiLocale) => ({ akamaiLocale, type: 'non-supported' })),
    ];

    // Create test configurations: each path × each akamaiLocale × each environment
    const testConfigs = [];
    testPaths.forEach((pathConfig) => {
      allAkamaiLocales.forEach(({ akamaiLocale, type }) => {
        testEnvs.forEach((env) => {
          testConfigs.push({
            path: pathConfig.path,
            akamaiLocale,
            type,
            expectedLocale: pathConfig.expectedLocale(akamaiLocale, type),
            expectedServer: pathConfig.expectedServer !== undefined ? pathConfig.expectedServer : false,
            env,
          });
        });
      });
    });

    // Run all tests in parallel
    const results = await Promise.allSettled(
      testConfigs.map(async ({ path: basePath, akamaiLocale, type, expectedLocale, expectedServer, env }) => {
        const page = await context.newPage();
        const errors = [];

        try {
          // Set up tracker for web_commerce_artifact requests
          const WCSRequests = [];
          const tracker = await setupWCSTracker(WCSRequests);

          // Attach listeners to the page before navigation
          page.on('request', tracker.requestListener);
          page.on('response', tracker.responseListener);
          page.on('requestfailed', tracker.requestFailedListener);

          // Construct URL with akamaiLocale parameter and commerce.env if stage
          const envParam = env === 'stage' ? '&commerce.env=stage' : '';
          const testPage = constructTestUrl(baseURL, basePath, `${browserParams}${akamaiLocale}${envParam}`);
          await page.goto(testPage, { waitUntil: 'commit', timeout: 30000 });

          // Check for commerce elements - wait for elements themselves, not page load state
          try {
            const commPage = new CommercePage(page);
            await Promise.all([
              commPage.price.first().waitFor({ state: 'visible', timeout: 20000 }),
              commPage.checkoutCTA.first().waitFor({ state: 'visible', timeout: 20000 }),
              // Check for resolved placeholders
              page.waitForFunction(
                () => {
                  const placeholders = document.querySelectorAll('[data-wcs-osi]');
                  return placeholders.length > 0 && Array.from(placeholders).some(
                    (el) => el.classList.contains('placeholder-resolved'),
                  );
                },
                { timeout: 20000 },
              ),
            ]);
          } catch (error) {
            errors.push('No commerce elements found on page (no commerce elements visible and no placeholders resolved)');
          }

          await page.waitForTimeout(1000);

          // Get all collected requests and validate them
          const requests = tracker.getRequests();
          // Determine validation parameters based on type
          const expectedCountry = type === 'supported' ? akamaiLocale : 'US';
          const validationErrors = validateWCSRequests(requests, {
            expectedCountry,
            expectedLocale,
            env, // Pass environment to validate WCS URL
            expectedServer, // Use expectedServer from path config
          });
          errors.push(...validationErrors);
        } catch (error) {
          errors.push(`Error during test execution: ${error.message || String(error)}`);
        } finally {
          await page.close();
        }

        return { path: basePath, akamaiLocale, expectedLocale, errors, type, env };
      }),
    );

    // Collect failures
    const allResults = [];
    results.forEach((result, index) => {
      const config = testConfigs[index];
      if (result.status === 'rejected') {
        allResults.push({
          path: config.path,
          akamaiLocale: config.akamaiLocale,
          expectedLocale: config.expectedLocale,
          errors: [`Promise rejected: ${result.reason?.message || String(result.reason)}`],
          type: config.type,
          env: config.env,
        });
      } else if (result.value && result.value.errors.length > 0) {
        allResults.push(result.value);
      }
    });

    // Close the context
    await context.close();

    // Report all failures at the end
    if (allResults.length > 0) {
      const failureReport = allResults.map((failure, index) => {
        const errorList = failure.errors.map((err, i) => `    ${i + 1}. ${err}`).join('\n');
        const typeLabel = failure.type === 'supported' ? 'supported' : 'non-supported';
        const envLabel = failure.env ? `, env=${failure.env}` : '';
        return `${index + 1}. path=${failure.path}, akamaiLocale=${failure.akamaiLocale}, expectedLocale=${failure.expectedLocale} [${typeLabel}]${envLabel}:\n${errorList}`;
      }).join('\n\n');

      const totalConfigs = testConfigs.length;
      throw new Error(`\n=== FAILURES SUMMARY ===\n\n${failureReport}\n\nTotal: ${allResults.length} out of ${totalConfigs} configurations failed\n`);
    }
  });

  // @Commerce-MAS-Geo-Country-Locale - Validate MAS requests with akamaiLocale parameter
  test(`${features[14].name}, ${features[14].tags}`, async ({ browser, baseURL }) => {
    test.setTimeout(600000); // 10 minutes

    const { data, paths, browserParams, env: specEnv = 'prod', envs: specEnvs } = features[14];
    // Determine which environments to test
    // Priority: COMMERCE_ENV env var > spec envs array > spec env default
    let testEnvs;
    if (process.env.COMMERCE_ENV) {
      // If COMMERCE_ENV is set, use only that environment
      testEnvs = [process.env.COMMERCE_ENV];
    } else if (specEnvs && specEnvs.length > 0) {
      // Use environments from spec
      testEnvs = specEnvs;
    } else {
      // Fallback to spec env default
      testEnvs = [specEnv];
    }
    const { akamaiLocales } = data;

    // Support both single path (backward compatibility) and multiple paths
    const testPaths = paths || [{ path: features[14].path, expectedLocale: 'en_US' }];

    // Create a browser context for all pages
    const context = await browser.newContext({
      extraHTTPHeaders: { 'sec-ch-ua': '"Chromium";v="123", "Not:A-Brand";v="8"' },
    });

    // Create test configurations: each path × each akamaiLocale × each environment
    const testConfigs = [];
    testPaths.forEach((pathConfig) => {
      akamaiLocales.forEach((akamaiLocale) => {
        testEnvs.forEach((env) => {
          testConfigs.push({
            path: pathConfig.path,
            akamaiLocale,
            expectedLocale: pathConfig.expectedLocale,
            expectedCountry: akamaiLocale,
            env,
          });
        });
      });
    });

    // Run all tests in parallel
    const results = await Promise.allSettled(
      testConfigs.map(async ({ path: basePath, akamaiLocale, expectedLocale, expectedCountry, env }) => {
        const page = await context.newPage();
        const errors = [];

        try {
          // Set up tracker for /mas/io/ requests
          const MASRequests = [];
          const tracker = await setupMASTracker(MASRequests);

          // Attach listeners to the page before navigation
          page.on('request', tracker.requestListener);
          page.on('response', tracker.responseListener);
          page.on('requestfailed', tracker.requestFailedListener);

          // Construct URL with akamaiLocale parameter and commerce.env if stage
          const envParam = env === 'stage' ? '&commerce.env=stage' : '';
          const testPage = constructTestUrl(baseURL, basePath, `${browserParams}${akamaiLocale}${envParam}`);
          await page.goto(testPage, { waitUntil: 'commit', timeout: 30000 });

          // // Check for commerce elements - wait for elements themselves, not page load state
          // try {
          //   const commPage = new CommercePage(page);
          //   await Promise.all([
          //     commPage.price.first().waitFor({ state: 'visible', timeout: 30000 }),
          //     commPage.checkoutCTA.first().waitFor({ state: 'visible', timeout: 30000 }),
          //     // Check for resolved placeholders
          //     // page.waitForFunction(
          //     //   () => {
          //     //     const placeholders = document.querySelectorAll('[data-wcs-osi]');
          //     //     return placeholders.length > 0 && Array.from(placeholders).some(
          //     //       (el) => el.classList.contains('placeholder-resolved'),
          //     //     );
          //     //   },
          //     //   { timeout: 30000 },
          //     // ),
          //   ]);
          // } catch (error) {
          //   errors.push('No commerce elements found on page (no commerce elements visible and no placeholders resolved)');
          // }

          await page.waitForTimeout(20000);

          // Wait for all MAS requests to be made and receive responses
          // MAS requests come in slowly one by one, so we need to wait longer
          // and check for a stable state (no new requests for a while)
          const maxWaitTime = 60000; // 60 seconds max
          const pollInterval = 500; // Check every 500ms
          const stableWaitTime = 3000; // Wait 3 seconds of no new requests before considering stable
          const startTime = Date.now();
          let lastRequestCount = 0;
          let lastChangeTime = Date.now();
          
          while (Date.now() - startTime < maxWaitTime) {
            const masRequests = tracker.getRequests();
            const currentRequestCount = masRequests.length;
            
            // Check if we have new requests
            if (currentRequestCount !== lastRequestCount) {
              lastRequestCount = currentRequestCount;
              lastChangeTime = Date.now();
            }
            
            // If we have requests and they've been stable (no new ones) for stableWaitTime,
            // check if they all have status
            if (currentRequestCount > 0 && (Date.now() - lastChangeTime) >= stableWaitTime) {
              const allHaveStatus = masRequests.every(req => req.status !== undefined || req.failed);
              if (allHaveStatus) {
                break;
              }
            }
            
            await page.waitForTimeout(pollInterval);
          }

          // Additional wait to ensure all responses are fully processed
          await page.waitForTimeout(1000);

          // Get all collected requests and validate them
          const requests = tracker.getRequests();
          const validationErrors = validateMASRequests(requests, {
            expectedCountry,
            expectedLocale,
            env, // Pass environment to validate MAS URL
            // expectedServer defaults to false in validateMASRequests, no need to pass it
          });
          errors.push(...validationErrors);
        } catch (error) {
          errors.push(`Error during test execution: ${error.message || String(error)}`);
        } finally {
          await page.close();
        }

        return { path: basePath, akamaiLocale, expectedLocale, expectedCountry, errors, env };
      }),
    );

    // Collect failures
    const allResults = [];
    results.forEach((result, index) => {
      const config = testConfigs[index];
      if (result.status === 'rejected') {
        allResults.push({
          path: config.path,
          akamaiLocale: config.akamaiLocale,
          expectedLocale: config.expectedLocale,
          errors: [`Promise rejected: ${result.reason?.message || String(result.reason)}`],
          env: config.env,
        });
      } else if (result.value && result.value.errors.length > 0) {
        allResults.push(result.value);
      }
    });

    // Close the context
    await context.close();

    // Report all failures at the end
    if (allResults.length > 0) {
      const failureReport = allResults.map((failure, index) => {
        const errorList = failure.errors.map((err, i) => `    ${i + 1}. ${err}`).join('\n');
        const envLabel = failure.env ? `, env=${failure.env}` : '';
        return `${index + 1}. path=${failure.path}, akamaiLocale=${failure.akamaiLocale}, expectedLocale=${failure.expectedLocale}${envLabel}:\n${errorList}`;
      }).join('\n\n');

      const totalConfigs = testConfigs.length;
      throw new Error(`\n=== FAILURES SUMMARY ===\n\n${failureReport}\n\nTotal: ${allResults.length} out of ${totalConfigs} configurations failed\n`);
    }
  });
});
