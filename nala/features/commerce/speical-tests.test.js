import { expect, test } from '@playwright/test';
import WebUtil from '../../libs/webutil.js';
import { features } from './special-tests.spec.js';
import CommercePage from './commerce.page.js';
import FedsLogin from '../feds/login/login.page.js';
import FedsHeader from '../feds/header/header.page.js';
import { PRICE_PATTERN, constructTestUrl, setupWCSTracker, validateWCSRequests, setupMASTracker, validateMASRequests } from '../../libs/commerce.js';
import taxLabelMapping from './tax-label-mapping.js';

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
  // @Commerce-WCS-Country-Locale - Validate WCS requests have correct country and locale params
  test(`${features[0].name}, ${features[0].tags}`, async ({ browser, baseURL }) => {
    test.setTimeout(600000); // 10 minutes for all countries

    const { data, paths, path: legacyPath, env: specEnv = 'prod', envs: specEnvs } = features[0];
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
    const defaultPathBuilder = features[0].pathBuilder;

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
  test(`${features[1].name}, ${features[1].tags}`, async ({ browser, baseURL }) => {
    test.setTimeout(600000); // 10 minutes

    const { data, paths, browserParams, env: specEnv = 'prod', envs: specEnvs } = features[1];
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
    const testPaths = paths || [{ path: features[1].path, expectedLocale: (akamaiLocale, type) => (type === 'supported' ? `en_${akamaiLocale}` : 'en_US'), expectedServer: false }];

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
  test(`${features[2].name}, ${features[2].tags}`, async ({ browser, baseURL }) => {
    test.setTimeout(600000); // 10 minutes

    const { data, paths, browserParams, env: specEnv = 'prod', envs: specEnvs } = features[2];
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
    const testPaths = paths || [{ path: features[2].path, expectedLocale: 'en_US' }];

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

  // @Commerce-Tax-Labels-Defaults - Validate tax labels for all 4 price segments
  test(`${features[3].name}, ${features[3].tags}`, async ({ browser, baseURL }) => {
    test.setTimeout(600000); // 10 minutes for all countries

    const { data, path: basePath } = features[3];
    const { countries } = data;

    // Use pathBuilder from feature[3]
    const defaultPathBuilder = features[3].pathBuilder;

    // Create a browser context for all pages
    const context = await browser.newContext({
      extraHTTPHeaders: { 'sec-ch-ua': '"Chromium";v="123", "Not:A-Brand";v="8"' },
    });

    // Create test configurations: one per country
    const testConfigs = countries.map((countryConfig) => ({
      countryConfig,
    }));

    // Run all tests in parallel
    const results = await Promise.allSettled(
      testConfigs.map(async ({ countryConfig }) => {
        const { country, locale, urlPrefix } = countryConfig;
        // Construct path using pathBuilder function
        const countryPath = defaultPathBuilder(basePath, country, urlPrefix);
        const page = await context.newPage();
        const errors = [];

        try {
          // Construct test URL
          const testPage = constructTestUrl(baseURL, countryPath);
          // console.info(`[Test Page]: ${testPage} (country=${country}, locale=${locale}${urlPrefix ? `, urlPrefix=${urlPrefix}` : ''})`);

          await page.goto(testPage, { waitUntil: 'commit', timeout: 30000 });
          await page.waitForLoadState('domcontentloaded');

          // Wait for commerce elements to load
          let pricesFound = false;
          try {
            // Wait for at least one inline-price element to exist
            await page.waitForFunction(
              () => {
                const prices = document.querySelectorAll('span[is="inline-price"]');
                return prices.length > 0;
              },
              { timeout: 20000 },
            );
            pricesFound = true;
            
            // Wait for placeholders to be resolved
            await page.waitForFunction(
              () => {
                const placeholders = document.querySelectorAll('[data-wcs-osi]');
                return placeholders.length > 0 && Array.from(placeholders).some(
                  (el) => el.classList.contains('placeholder-resolved'),
                );
              },
              { timeout: 20000 },
            );
            
            // Wait for prices to stabilize - check that price count doesn't change for 3 seconds
            let lastPriceCount = 0;
            let stableCount = 0;
            const maxWaitTime = 30000; // 30 seconds max
            const stableTime = 3000; // 3 seconds of stability
            const pollInterval = 500; // Check every 500ms
            const startTime = Date.now();
            
            while (Date.now() - startTime < maxWaitTime) {
              const currentPriceCount = await page.evaluate(() => {
                return document.querySelectorAll('span[is="inline-price"]').length;
              });
              
              if (currentPriceCount === lastPriceCount && currentPriceCount > 0) {
                stableCount += pollInterval;
                if (stableCount >= stableTime) {
                  break; // Prices have been stable for stableTime
                }
              } else {
                stableCount = 0; // Reset stability counter
                lastPriceCount = currentPriceCount;
              }
              
              await page.waitForTimeout(pollInterval);
            }
          } catch (error) {
            if (!pricesFound) {
              errors.push('No commerce elements found on page (no price elements found and no placeholders resolved)');
            } else {
              errors.push('Placeholders not resolved on page or prices did not stabilize');
            }
          }

          await page.waitForTimeout(2000);

          // Find all prices on the page - they should be in order: INDIVIDUAL_COM, TEAM_COM, INDIVIDUAL_EDU, TEAM_EDU
          const allPrices = await page.locator('span[is="inline-price"]').all();
          
          // If no prices found, add error and skip tax label validation
          if (allPrices.length === 0) {
            errors.push('No price elements found on page (span[is="inline-price"])');
          }

          // Get expected tax labels for this locale
          // Always use locale-based mapping (e.g., 'MU_en' from locale 'en_MU')
          // urlPrefix is only for URL construction, not for tax label mapping
          const localeParts = locale.split('_');
          const languageCode = localeParts[0] || 'en';
          const mappingKey = `${country}_${languageCode}`;
          let expectedLabels = taxLabelMapping[mappingKey];

          // If locale is not in mapping, expect no labels for all 4 segments
          if (!expectedLabels) {
            expectedLabels = [null, null, null, null];
          }
          const segmentNames = ['INDIVIDUAL_COM', 'TEAM_COM', 'INDIVIDUAL_EDU', 'TEAM_EDU'];
          const priceCount = allPrices.length;
          
          // Check for placeholder-failed or placeholder-rejected states and collect price states
          const priceStates = [];
          for (let i = 0; i < Math.min(priceCount, 4); i++) {
            const priceElement = allPrices[i];
            const placeholderState = await priceElement.evaluate((el) => {
              if (el.classList.contains('placeholder-failed')) return 'placeholder-failed';
              if (el.classList.contains('placeholder-rejected')) return 'placeholder-rejected';
              return null;
            });
            priceStates[i] = placeholderState;
            if (placeholderState) {
              errors.unshift(`Segment ${segmentNames[i]} (${locale}): Price has ${placeholderState} state`);
            }
          }
          
          // Verify that exactly 4 prices are displayed
          if (priceCount !== 4) {
            if (priceCount < 4) {
              const missingSegments = segmentNames.slice(priceCount);
              errors.unshift(`Missing ${4 - priceCount} price(s). Found ${priceCount} price(s), missing segments: ${missingSegments.join(', ')}`);
            } else {
              errors.unshift(`Expected exactly 4 prices, but found ${priceCount} prices`);
            }
          }
          
          // Check tax labels for each price that exists and is not in failed/rejected state
          for (let i = 0; i < Math.min(priceCount, 4); i++) {
            // Skip tax label validation if price is in failed/rejected state
            if (priceStates[i]) {
              continue;
            }
            
            const expectedLabel = expectedLabels[i];
            const priceElement = allPrices[i];
            const taxLabelElement = priceElement.locator('.price-tax-inclusivity:not(.disabled)');
            const taxLabelExists = await taxLabelElement.count() > 0;
            
            if (expectedLabel === null || expectedLabel === '-') {
              if (taxLabelExists) {
                const actualLabel = await taxLabelElement.textContent();
                errors.push(`Segment ${segmentNames[i]} (${locale}): Expected no tax label, but found "${actualLabel.trim()}"`);
              }
            } else {
              if (!taxLabelExists) {
                errors.push(`Segment ${segmentNames[i]} (${locale}): Expected tax label "${expectedLabel}", but no tax label found`);
              } else {
                const actualLabel = await taxLabelElement.textContent();
                if (actualLabel.trim() !== expectedLabel.trim()) {
                  errors.push(`Segment ${segmentNames[i]} (${locale}): Expected tax label "${expectedLabel}", but found "${actualLabel.trim()}"`);
                }
              }
            }
            
            // Check unit text: TEAM prices (indices 1 and 3) should have unit text, INDIVIDUAL prices (indices 0 and 2) should not
            const isTeamPrice = i === 1 || i === 3; // TEAM_COM or TEAM_EDU
            // Use first() to handle multiple .price-unit-type elements, and filter out disabled ones
            const unitTextElement = priceElement.locator('.price-unit-type:not(.disabled)').first();
            const unitTextCount = await priceElement.locator('.price-unit-type:not(.disabled)').count();
            const unitTextExists = unitTextCount > 0;
            const unitText = unitTextExists ? await unitTextElement.textContent() : '';
            
            if (isTeamPrice) {
              // TEAM prices should have unit text
              if (!unitTextExists || unitText.trim() === '') {
                errors.push(`Segment ${segmentNames[i]} (${locale}): Expected unit text to be displayed for TEAM price, but no unit text found`);
              }
            } else {
              // INDIVIDUAL prices should NOT have unit text
              if (unitTextExists && unitText.trim() !== '') {
                errors.push(`Segment ${segmentNames[i]} (${locale}): Expected no unit text for INDIVIDUAL price, but found "${unitText.trim()}"`);
              }
            }
          }

        } catch (error) {
          errors.push(`Error during test execution: ${error.message || String(error)}`);
        } finally {
          await page.close();
        }

        return { path: countryPath, country, locale, errors };
      }),
    );

    // Collect failures
    const allResults = [];
    results.forEach((result, index) => {
      const config = testConfigs[index];
      if (result.status === 'rejected') {
        allResults.push({
          path: basePath,
          country: config.countryConfig.country,
          locale: config.countryConfig.locale,
          errors: [`Promise rejected: ${result.reason?.message || String(result.reason)}`],
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
        return `${index + 1}. path=${failure.path}, country=${failure.country} (${failure.locale}):\n${errorList}`;
      }).join('\n\n');

      const totalConfigs = testConfigs.length;
      throw new Error(`\n=== FAILURES SUMMARY ===\n\n${failureReport}\n\nTotal: ${allResults.length} out of ${totalConfigs} configurations failed\n`);
    }
  });
});
