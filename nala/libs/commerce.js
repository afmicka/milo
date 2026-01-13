const { test } = require('@playwright/test');

const MILO_LIBS = process.env.MILO_LIBS || '';
const MAS_LIBS = process.env.MAS_LIBS || '';

const PRICE_PATTERN = {
  US: {
    mo: /US\$\d+\.\d\d\/mo/,
    yr: /US\$\d+\.\d\d\/yr/,
  },
  FR: { mo: /\d+,\d\d\s€\/mois/ },
};

const PLANS_NALA_PATH = { US: '/drafts/nala/features/commerce/plans2' };

const DOCS_GALLERY_PATH = {
  CCD: {
    US: '/libs/features/mas/docs/ccd.html',
    FR: '/libs/features/mas/docs/ccd.html?locale=fr_FR',
  },
  CCD_MINI: {
    US: '/libs/features/mas/docs/ccd-mini.html',
    FR: '/libs/features/mas/docs/ccd-mini.html?country=FR&language=fr',
  },
  ADOBE_HOME: { US: '/libs/features/mas/docs/adobe-home.html' },
  PLANS: '/libs/features/mas/docs/plans.html',
  CHECKOUT_LINK: '/libs/features/mas/docs/checkout-link.html',
  MERCH_CARD: '/libs/features/mas/docs/merch-card.html',
  EXPRESS: '/libs/features/mas/docs/express.html',
};

async function setupMasConsoleListener(consoleErrors) {
  const seenErrors = new Set();

  return (msg) => {
    if (msg.type() === 'error') {
      const errorText = msg.text();
      let errorCode = '';
      let formattedError = '';

      const codeMatch = errorText.match(/(?:\[ERR[_-])?\d+\]?|(?:Error:?\s*)\d+|(?:status(?:\scode)?:?\s*)\d+/i);
      if (codeMatch) {
        [errorCode] = codeMatch;
        formattedError = `[${errorCode}] ${errorText}`;
      } else {
        formattedError = errorText;
      }

      let uniqueKey;

      if (errorText.includes('blocked by CORS policy')) {
        // Only log CORS errors for MAS-related URLs
        if (errorText.includes('/mas/io/') || /commerce[^.]*\.adobe\.com/.test(errorText)) {
          uniqueKey = 'MAS_CORS_POLICY_BLOCKED';
        } else {
          return; // Skip non-MAS CORS errors
        }
      } else if (errorText.includes('MAS Error:')) {
        uniqueKey = 'MAS_ERROR';
      } else if (errorText.includes('AEM Error:')) {
        uniqueKey = 'AEM_ERROR';
      } else if (errorText.includes('server responded with a status of 403')) {
        uniqueKey = 'HTTP_403_FORBIDDEN';
      } else if (errorText.includes('server responded with a status of 404')) {
        uniqueKey = 'HTTP_404_NOT_FOUND';
      } else if (errorText.includes('net::ERR_HTTP2_PROTOCOL_ERROR')) {
        uniqueKey = 'HTTP2_PROTOCOL_ERROR';
      } else if (errorText.includes('net::ERR_FAILED')) {
        uniqueKey = 'NETWORK_ERR_FAILED';
      } else {
        uniqueKey = errorCode || errorText.split('\n')[0].substring(0, 100);
      }

      if (!seenErrors.has(uniqueKey)) {
        seenErrors.add(uniqueKey);
        consoleErrors.push(formattedError);
      }
    }
  };
}

function attachMasConsoleErrorsToFailure(testInfo, consoleErrors) {
  if (testInfo.status === 'failed' && consoleErrors.length > 0) {
    const errorSummary = consoleErrors.map((error, index) => `${index + 1}. ${error}`).join('\n');
    const consoleErrorAttachment = `\n=== MAS CONSOLE ERRORS DURING TEST FAILURE ===\n${errorSummary}\n==========================================\n`;

    // Attach as additional context to the test failure
    testInfo.attach('Console Errors', {
      body: consoleErrorAttachment,
      contentType: 'text/plain',
    });

    return consoleErrorAttachment;
  }
  return '';
}

function attachMasRequestErrorsToFailure(testInfo, masRequestErrors) {
  if (testInfo.status === 'failed' && masRequestErrors.length > 0) {
    const errorSummary = masRequestErrors.map((error, index) => `${index + 1}. ${error}`).join('\n');
    const requestErrorAttachment = `\n=== MAS REQUEST ERRORS DURING TEST FAILURE ===\n${errorSummary}\n==========================================\n`;

    // Attach as additional context to the test failure
    testInfo.attach('MAS Request Errors', {
      body: requestErrorAttachment,
      contentType: 'text/plain',
    });

    return requestErrorAttachment;
  }
  return '';
}

/**
 * Helper function to construct URLs with proper query parameter handling
 * @param {string} baseUrl - The base URL (may already contain query parameters)
 * @param {string} browserParams - Browser parameters to append (may start with ? or &)
 * @returns {string} - Properly constructed URL
 */
function addUrlQueryParams(baseUrl, browserParams) {
  if (!browserParams) return baseUrl;
  const hasQueryParams = baseUrl.includes('?');
  const separator = hasQueryParams ? '&' : '?';
  const cleanParams = browserParams.replace(/^[?&]/, '');
  return `${baseUrl}${separator}${cleanParams}`;
}

/**
 * Helper function to validate commerce URLs with flexible query parameter checking
 * @param {string} url - The URL to validate
 * @param {Object} options - Validation options
 * @param {string} options.country - Expected country code (default: 'US')
 * @param {string} options.language - Expected language code (default: 'en')
 * @param {Array<string>} options.requiredParams - Additional required parameters
 * @returns {boolean} - Whether the URL matches commerce link pattern
 *
 * @example
 * // Basic usage (US/English - default)
 * validateCommerceUrl(url)
 * validateCommerceUrl(url, { country: 'US', language: 'en' })
 *
 * @example
 * // Different countries/languages
 * validateCommerceUrl(url, { country: 'FR', language: 'fr' })
 *
 * @example
 * // With additional required parameters
 * validateCommerceUrl(url, { requiredParams: ['apc'] })
 * validateCommerceUrl(url, { country: 'FR', language: 'fr', requiredParams: ['apc', 'promo'] })
 */
function validateCommerceUrl(url, options = {}) {
  const { country = 'US', language = 'en', requiredParams = [] } = options;

  try {
    const urlObj = new URL(url);

    if (urlObj.hostname !== 'commerce.adobe.com') return false;
    if (!urlObj.pathname.startsWith('/store/email')) return false;

    const params = new URLSearchParams(urlObj.search);

    const itemId = params.get('items[0][id]');
    if (!itemId || !/^[A-F0-9]{32}$/.test(itemId)) return false;

    if (params.get('cli') !== 'adobe_com') return false;
    if (params.get('ctx') !== 'fp') return false;
    if (params.get('co') !== country) return false;
    if (params.get('lang') !== language) return false;

    // Check any additional required parameters
    for (const param of requiredParams) {
      if (!params.has(param)) return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Default path builder: uses basePath with country prefix
 * Constructs localized paths based on country and urlPrefix
 * @param {string} basePath - The base path to localize
 * @param {string} country - The country code (e.g., 'US', 'DE', 'FR')
 * @param {string} urlPrefix - Optional URL prefix (e.g., 'ae_en', 'be_fr')
 * @returns {string} - The localized path
 */
function buildCountryPath(basePath, country, urlPrefix) {
  if (country === 'US') {
    return basePath;
  } else if (urlPrefix) {
    return `/${urlPrefix}${basePath}`;
  } else {
    return `/${country.toLowerCase()}${basePath}`;
  }
}

/**
 * Helper function to construct test URLs with proper query parameter handling
 * Includes MILO_LIBS and MAS_LIBS environment variables
 * @param {string} baseURL - The base URL from Playwright test context
 * @param {string} path - The path to append to the base URL
 * @param {string} browserParams - Browser parameters to append (optional, may start with ? or &)
 * @returns {string} - Properly constructed URL with all parameters
 */
function constructTestUrl(baseURL, path, browserParams = '') {
  let fullUrl = `${baseURL}${path}`;
  fullUrl = addUrlQueryParams(fullUrl, browserParams);
  fullUrl = addUrlQueryParams(fullUrl, MILO_LIBS);
  fullUrl = addUrlQueryParams(fullUrl, MAS_LIBS);
  return fullUrl;
}

async function setupMasRequestLogger(masRequestErrors) {
  const seenRequests = new Set();

  return {
    responseListener: async (response) => {
      const url = response.url();
      const status = response.status();

      if (url.includes('/mas/io/') && status >= 400) {
        let uniqueKey;
        if (status === 403) {
          uniqueKey = 'MAS_IO_403_FORBIDDEN';
        } else if (status === 404) {
          uniqueKey = 'MAS_IO_404_NOT_FOUND';
        } else if (status === 429) {
          uniqueKey = 'MAS_IO_429_TOO_MANY_REQUESTS';
        } else if (status >= 500) {
          uniqueKey = 'MAS_IO_5XX_SERVER_ERROR';
        } else {
          uniqueKey = `MAS_IO_${status}_ERROR`;
        }

        if (!seenRequests.has(uniqueKey)) {
          seenRequests.add(uniqueKey);

          const headers = response.headers();
          const corsHeaders = {
            'access-control-allow-origin': headers['access-control-allow-origin'] || 'MISSING',
            'access-control-allow-methods': headers['access-control-allow-methods'] || 'MISSING',
            'access-control-allow-headers': headers['access-control-allow-headers'] || 'MISSING',
            'access-control-allow-credentials': headers['access-control-allow-credentials'] || 'MISSING',
          };
          const akamaiGrn = headers['akamai-grn-www.adobe.com'] || 'MISSING';

          const errorDetails = `[${status}] Failed MAS I/O Request: ${url} | CORS: ${JSON.stringify(corsHeaders)} | Akamai GRN: ${akamaiGrn}`;
          masRequestErrors.push(errorDetails);

          console.log('\n🚫 Failed MAS I/O Request:');
          console.log(`URL: ${url}`);
          console.log(`Status: ${status}`);
          console.log('CORS Headers:', JSON.stringify(corsHeaders, null, 2));
          console.log(`Akamai GRN: ${akamaiGrn}`);
          console.log('─────────────────────────────────────\n');
        }
      }
    },

    requestFailedListener: async (request) => {
      const url = request.url();

      if (url.includes('/mas/io/')) {
        const failure = request.failure();
        const uniqueKey = `MAS_IO_REQUEST_FAILED_${failure ? failure.errorText : 'UNKNOWN'}`;

        if (!seenRequests.has(uniqueKey)) {
          seenRequests.add(uniqueKey);

          const errorDetails = `[FAILED] MAS I/O Request Failed: ${url} | Method: ${request.method()} | Failure: ${failure ? failure.errorText : 'Unknown error'}`;
          masRequestErrors.push(errorDetails);

          console.log('\n❌ MAS I/O Request Failed:');
          console.log(`URL: ${url}`);
          console.log(`Method: ${request.method()}`);
          console.log(`Failure: ${failure ? failure.errorText : 'Unknown error'}`);
          console.log('❌ NO RESPONSE RECEIVED (CORS blocked by browser)');
          console.log('─────────────────────────────────────\n');
        }
      }
    },
  };
}

/**
 * Sets up a tracker to collect all network requests containing "web_commerce_artifact"
 * @param {Array} WCSRequests - Array to store collected requests
 * @returns {Object} - Object with listeners and getter method
 */
async function setupWCSTracker(WCSRequests) {
  const seenRequestUrls = new Set();

  return {
    requestListener: async (request) => {
      const url = request.url();

      if (url.includes('web_commerce_artifact')) {
        // Track all unique WCS requests (same URL only added once)
        if (!seenRequestUrls.has(url)) {
          seenRequestUrls.add(url);

          const requestData = {
            url,
            method: request.method(),
            headers: request.headers(),
            postData: request.postData(),
            resourceType: request.resourceType(),
            timestamp: Date.now(),
          };

          WCSRequests.push(requestData);
        }
      }
    },

    responseListener: (response) => {
      const url = response.url();

      if (url.includes('web_commerce_artifact')) {
        // Update existing request with response data if URL already tracked
        const existingRequest = WCSRequests.find((req) => req.url === url);
        if (existingRequest) {
          existingRequest.status = response.status();
          existingRequest.statusText = response.statusText();
          existingRequest.responseHeaders = response.headers();
          existingRequest.responseTimestamp = Date.now();
        } else {
          // New response without prior request tracking
          const responseData = {
            url,
            method: response.request().method(),
            status: response.status(),
            statusText: response.statusText(),
            responseHeaders: response.headers(),
            responseTimestamp: Date.now(),
          };

          WCSRequests.push(responseData);
          seenRequestUrls.add(url);
        }
      }
    },

    requestFailedListener: async (request) => {
      const url = request.url();

      if (url.includes('web_commerce_artifact')) {
        const failure = request.failure();
        const requestData = {
          url,
          method: request.method(),
          failed: true,
          failure: failure ? failure.errorText : 'Unknown error',
          timestamp: Date.now(),
        };

        // Update existing request if found, otherwise add new
        const existingRequest = WCSRequests.find((req) => req.url === url);
        if (existingRequest) {
          Object.assign(existingRequest, requestData);
        } else {
          WCSRequests.push(requestData);
          seenRequestUrls.add(url);
        }
      }
    },

    /**
     * Gets all collected unique web_commerce_artifact requests
     * @returns {Array} - Array of unique request objects (one per unique URL)
     */
    getRequests: () => WCSRequests,
  };
}

/**
 * Sets up a tracker to collect all network requests containing "/mas/io/"
 * @param {Array} MASRequests - Array to store collected requests
 * @returns {Object} - Object with listeners and getter method
 */
async function setupMASTracker(MASRequests) {
  const seenRequestUrls = new Set();

  return {
    requestListener: async (request) => {
      const url = request.url();

      if (url.includes('/mas/io/')) {
        // Track all unique MAS requests (same URL only added once)
        if (!seenRequestUrls.has(url)) {
          seenRequestUrls.add(url);
          seenRequestUrls.add(url);

          const requestData = {
            url,
            method: request.method(),
            headers: request.headers(),
            postData: request.postData(),
            resourceType: request.resourceType(),
            timestamp: Date.now(),
          };

          MASRequests.push(requestData);
        }
      }
    },

    responseListener: async (response) => {
      const url = response.url();

      if (url.includes('/mas/io/')) {
        // Update existing request with response data if URL already tracked
        const existingRequest = MASRequests.find((req) => req.url === url);
        if (existingRequest) {
          existingRequest.status = response.status();
          existingRequest.statusText = response.statusText();
          existingRequest.responseHeaders = response.headers();
          existingRequest.responseTimestamp = Date.now();

          // Try to get response body if available
          try {
            const responseBody = await response.text();
            existingRequest.responseBody = responseBody;
          } catch (error) {
            // Response body may not be available (already consumed or failed)
            existingRequest.responseBodyError = error.message;
          }
        } else {
          // New response without prior request tracking
          const responseData = {
            url,
            method: response.request().method(),
            status: response.status(),
            statusText: response.statusText(),
            responseHeaders: response.headers(),
            responseTimestamp: Date.now(),
          };

          try {
            const responseBody = await response.text();
            responseData.responseBody = responseBody;
          } catch (error) {
            responseData.responseBodyError = error.message;
          }

          MASRequests.push(responseData);
          seenRequestUrls.add(url);
        }
      }
    },

    requestFailedListener: async (request) => {
      const url = request.url();

      if (url.includes('/mas/io/')) {
        const failure = request.failure();
        const requestData = {
          url,
          method: request.method(),
          failed: true,
          failure: failure ? failure.errorText : 'Unknown error',
          timestamp: Date.now(),
        };

        // Update existing request if found, otherwise add new
        const existingRequest = MASRequests.find((req) => req.url === url);
        if (existingRequest) {
          Object.assign(existingRequest, requestData);
        } else {
          MASRequests.push(requestData);
          seenRequestUrls.add(url);
        }
      }
    },

    /**
     * Gets all collected unique /mas/io/ requests
     * @returns {Array} - Array of unique request objects (one per unique URL)
     */
    getRequests: () => MASRequests,
  };
}

/**
 * Validates WCS requests for country, locale, status, server header, and environment URL
 * @param {Array} requests - Array of WCS request objects from setupWCSTracker
 * @param {Object} options - Validation options
 * @param {string} options.expectedCountry - Expected country code
 * @param {string} options.expectedLocale - Expected locale code
 * @param {string} [options.env] - Optional environment: 'stage' (defaults to 'prod' if not provided)
 * @param {boolean} [options.expectedServer] - Optional: if true, checks that server header equals 'adobe' (check skipped if omitted or false)
 * @returns {Array} - Array of error messages (empty if all validations pass)
 */
function validateWCSRequests(requests, { expectedCountry, expectedLocale, env = 'prod', expectedServer }) {
  const errors = [];

  if (requests.length === 0) {
    errors.push('No web_commerce_artifact requests found');
    return errors;
  }

  // Determine expected URL pattern based on environment
  // Defaults to 'prod' if env is not provided, checks 'stage' only if explicitly set
  const expectedUrlPattern = env === 'stage'
    ? 'https://www.stage.adobe.com/web_commerce_artifact_stage'
    : 'https://www.adobe.com/web_commerce_artifact';

  for (const request of requests) {
    try {
      const url = new URL(request.url);
      // console.log('wcs request url: ', request.url);

      // Validate URL contains correct environment domain
      if (!request.url.includes(expectedUrlPattern)) {
        const expectedEnv = env === 'stage' ? 'stage (www.stage.adobe.com)' : 'prod (www.adobe.com)';
        errors.push(`${request.url} - Expected: environment=${expectedEnv} | URL does not contain ${expectedUrlPattern}`);
      }

      // Validate country parameter
      const countryParam = url.searchParams.get('country');
      if (countryParam !== expectedCountry) {
        errors.push(`${request.url} - Expected: country=${expectedCountry} | Received: country=${countryParam}`);
      }

      // Validate locale parameter
      const localeParam = url.searchParams.get('locale');
      if (localeParam !== expectedLocale) {
        errors.push(`${request.url} - Expected: locale=${expectedLocale} | Received: locale=${localeParam}`);
      }

      // Validate status code is 200
      if (request.status !== 200) {
        errors.push(`${request.url} - Expected: status=200 | Received: status=${request.status || 'undefined'}`);
      }

      // Validate server header equals "adobe" only if expectedServer is true
      if (expectedServer === true) {
        const serverHeader = request.responseHeaders?.['server'] || request.responseHeaders?.server;
        if (serverHeader !== 'adobe') {
          errors.push(`${request.url} - Expected: server header=adobe | Received: server header=${serverHeader || 'undefined'}`);
        }
      }
    } catch (error) {
      errors.push(`${request.url} - Error parsing URL: ${error.message}`);
    }
  }

  return errors;
}

/**
 * Validates MAS/IO requests for country and locale parameters
 * @param {Array} requests - Array of MAS request objects from setupMASTracker
 * @param {Object} options - Validation options
 * @param {string} options.expectedCountry - Expected country code (checked in 'country' parameter)
 * @param {string} options.expectedLocale - Expected locale code (checked in 'locale' parameter)
 * @param {string} [options.env] - Optional environment: 'stage' (defaults to 'prod' if not provided)
 * @param {boolean} [options.expectedServer] - Optional: if true, checks that server header equals 'adobe' (check skipped if omitted or false)
 * @returns {Array} - Array of error messages (empty if all validations pass)
 */
function validateMASRequests(requests, { expectedCountry, expectedLocale, env = 'prod', expectedServer }) {
  const errors = [];

  if (requests.length === 0) {
    errors.push('No /mas/io/ requests found');
    return errors;
  }

  // Determine expected URL pattern based on environment
  // Defaults to 'prod' if env is not provided, checks 'stage' only if explicitly set
  const expectedUrlPattern = env === 'stage'
    ? 'https://www.stage.adobe.com/mas/io/'
    : 'https://www.adobe.com/mas/io/';

  for (const request of requests) {
    try {
      const url = new URL(request.url);

      // Validate URL contains correct environment domain
      if (!request.url.includes(expectedUrlPattern)) {
        const expectedEnv = env === 'stage' ? 'stage (www.stage.adobe.com)' : 'prod (www.adobe.com)';
        errors.push(`${request.url} - Expected: environment=${expectedEnv} | URL does not contain ${expectedUrlPattern}`);
      }

      // Validate country parameter (MAS uses 'country' parameter)
      // Note: US doesn't include country parameter in the request
      const countryParam = url.searchParams.get('country');
      if (expectedCountry === 'US') {
        // For US, country param should be absent or null
        if (countryParam !== null && countryParam !== undefined) {
          errors.push(`${request.url} - Expected: country parameter to be absent for US | Received: country=${countryParam}`);
        }
      } else {
        // For non-US, country param should match expected
        if (countryParam !== expectedCountry) {
          errors.push(`${request.url} - Expected: country=${expectedCountry} | Received: country=${countryParam}`);
        }
      }

      // Validate locale parameter
      const localeParam = url.searchParams.get('locale');
      if (localeParam !== expectedLocale) {
        errors.push(`${request.url} - Expected: locale=${expectedLocale} | Received: locale=${localeParam}`);
      }

      // Validate status code is 200
      if (request.status !== 200) {
        errors.push(`${request.url} - Expected: status=200 | Received: status=${request.status || 'undefined'}`);
      }

      // Validate server header only if expectedServer is true
      if (expectedServer === true) {
        const serverHeader = request.responseHeaders?.['server'] || request.responseHeaders?.server;
        if (serverHeader !== 'adobe') {
          errors.push(`${request.url} - Expected: server header=adobe | Received: server header=${serverHeader || 'undefined'}`);
        }
      }
    } catch (error) {
      errors.push(`${request.url} - Error parsing URL: ${error.message}`);
    }
  }

  return errors;
}

/**
 * Creates a worker-scoped page setup utility
 * @param {Object} config - Configuration object
 * @param {Array} config.pages - Array of page configurations [{ name: 'US', url: '/path' }, ...]
 * @param {Object} config.extraHTTPHeaders - HTTP headers to set on the context
 * @param {number} config.loadTimeout - Timeout after networkidle (default: 5000ms)
 * @param {number} config.setupTimeout - Timeout for beforeAll hook setup (default: 60000ms)
 * @returns {Object} - Setup object with pages, setup/cleanup methods, and error arrays
 */
function createWorkerPageSetup(config = {}) {
  const {
    pages = [],
    extraHTTPHeaders = { 'sec-ch-ua': '"Chromium";v="123", "Not:A-Brand";v="8"' },
    loadTimeout = 5000,
    setupTimeout = 60000, // Default 60 second timeout for worker setup
  } = config;

  let workerContext;
  const workerPages = {};
  let consoleErrors = [];
  let masRequestErrors = [];

  /**
   * Sets up worker-scoped pages and listeners
   * @param {Object} params - Playwright test parameters
   * @param {Object} params.browser - Playwright browser object
   * @param {string} params.baseURL - Base URL for the test environment
   */
  async function setupWorkerPages({ browser, baseURL }) {
    console.info('[Worker Setup]: Initializing worker-scoped pages...');

    // Set timeout for the current test (beforeAll hook)
    test.setTimeout(setupTimeout);

    workerContext = await browser.newContext({ extraHTTPHeaders });

    consoleErrors = [];
    masRequestErrors = [];

    const pagePromises = pages.map(async (pageConfig) => {
      const { name, url } = pageConfig;

      let fullUrl = `${baseURL}${url}`;
      fullUrl = addUrlQueryParams(fullUrl, MILO_LIBS);
      fullUrl = addUrlQueryParams(fullUrl, MAS_LIBS);

      console.info(`[Worker Setup]: Creating page for ${name}:`, fullUrl);

      const page = await workerContext.newPage();
      workerPages[name] = page;

      // Set up MAS request logger
      const masRequestLogger = await setupMasRequestLogger(masRequestErrors);
      page.on('response', masRequestLogger.responseListener);
      page.on('requestfailed', masRequestLogger.requestFailedListener);

      // Set up console listener
      const consoleListener = await setupMasConsoleListener(consoleErrors);
      page.on('console', consoleListener);

      // Load the page
      await page.goto(fullUrl);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(loadTimeout);

      console.info(`[Worker Setup]: ${name} page fully loaded:`, await page.url());

      return { name, page, url: fullUrl };
    });

    await Promise.all(pagePromises);
    console.info('[Worker Setup]: All worker-scoped pages ready');
  }

  /**
   * Cleans up worker-scoped resources and reports errors
   */
  async function cleanupWorkerPages() {
    // Only run cleanup if setup was executed
    if (!consoleErrors && !masRequestErrors) {
      return; // Test was skipped, no cleanup needed
    }

    // Report console errors
    if (consoleErrors && consoleErrors.length > 0) {
      console.log('\n=== MAS CONSOLE ERRORS DURING PAGE LOADING ===');
      consoleErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
      console.log('==========================================\n');
    }

    // Report MAS request errors
    if (masRequestErrors && masRequestErrors.length > 0) {
      console.log('\n=== MAS REQUEST ERRORS DURING WORKER LIFETIME ===');
      masRequestErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
      console.log('==========================================\n');
    }

    // Clean up worker context
    if (workerContext) {
      await workerContext.close();
      console.info('[Worker Cleanup]: Worker context closed');
    }
  }

  /**
   * Attaches worker-scoped errors to failed test stack traces
   * @param {Object} testInfo - Playwright test info object
   */
  function attachWorkerErrorsToFailure(testInfo) {
    if (testInfo.status === 'failed') {
      const consoleErrorText = attachMasConsoleErrorsToFailure(testInfo, consoleErrors);
      const requestErrorText = attachMasRequestErrorsToFailure(testInfo, masRequestErrors);

      let enhancedMessage = '';

      if (consoleErrors.length > 0) {
        enhancedMessage += consoleErrorText;
      }

      if (masRequestErrors.length > 0) {
        enhancedMessage += requestErrorText;
      }

      if (enhancedMessage && testInfo.error) {
        testInfo.error.message = `${testInfo.error.message}${enhancedMessage}`;
      }
    }
  }

  /**
   * Gets a worker page by name
   * @param {string} pageName - Name of the page to retrieve
   * @returns {Object} - Playwright page object
   */
  function getPage(pageName) {
    const page = workerPages[pageName];
    if (!page) {
      throw new Error(`Worker page '${pageName}' not found. Available pages: ${Object.keys(workerPages).join(', ')}`);
    }
    return page;
  }

  /**
   * Verifies a page URL matches the expected pattern (requires Playwright expect)
   * @param {string} pageName - Name of the page to verify
   * @param {string} expectedPath - Expected URL path (will be converted to regex with ? escaping)
   * @param {Function} expect - Playwright expect function
   */
  async function verifyPageURL(pageName, expectedPath, expect) {
    const page = getPage(pageName);
    // Create regex that matches the expected path with optional miloLibs and masLibs parameters
    const escapedPath = expectedPath.replace('?', '\\?');
    const regex = new RegExp(`${escapedPath}.*`);
    await expect(page).toHaveURL(regex);
  }

  return {
    // Setup methods
    setupWorkerPages,
    cleanupWorkerPages,
    attachWorkerErrorsToFailure,

    // Page access methods
    getPage,
    verifyPageURL,

    // Direct access to error arrays
    get consoleErrors() { return consoleErrors; },
    get masRequestErrors() { return masRequestErrors; },

    // Direct access to all pages
    get pages() { return workerPages; },
  };
}

module.exports = {
  setupMasConsoleListener,
  attachMasConsoleErrorsToFailure,
  setupMasRequestLogger,
  attachMasRequestErrorsToFailure,
  setupWCSTracker,
  validateWCSRequests,
  setupMASTracker,
  validateMASRequests,
  createWorkerPageSetup,
  addUrlQueryParams,
  validateCommerceUrl,
  constructTestUrl,
  buildCountryPath,
  PRICE_PATTERN,
  DOCS_GALLERY_PATH,
  PLANS_NALA_PATH,
};
