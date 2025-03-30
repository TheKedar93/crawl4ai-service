/**
 * Fetch polyfill to ensure consistent fetch behavior across Node versions
 */

/**
 * Check and ensure fetch is polyfilled if needed
 */
function ensurePolyfilled() {
  if (typeof globalThis.fetch !== 'function') {
    console.log('Polyfilling fetch API...');
    
    // Handle older Node versions where native fetch is not available
    try {
      const nodeFetch = require('node-fetch');
      globalThis.fetch = nodeFetch;
      globalThis.Headers = nodeFetch.Headers;
      globalThis.Request = nodeFetch.Request;
      globalThis.Response = nodeFetch.Response;
      
      // Add timeout functionality to AbortSignal if not available
      if (!AbortSignal.timeout) {
        AbortSignal.timeout = function timeout(ms) {
          const controller = new AbortController();
          setTimeout(() => controller.abort(new DOMException('TimeoutError')), ms);
          return controller.signal;
        };
      }
      
      console.log('Fetch API polyfilled successfully');
    } catch (error) {
      console.error('Failed to polyfill fetch API:', error);
      throw new Error('Failed to initialize fetch polyfill. Please ensure node-fetch is installed.');
    }
  } else {
    // Ensure AbortSignal.timeout exists even on newer Node versions
    if (!AbortSignal.timeout) {
      AbortSignal.timeout = function timeout(ms) {
        const controller = new AbortController();
        setTimeout(() => controller.abort(new DOMException('TimeoutError')), ms);
        return controller.signal;
      };
    }
  }
}

module.exports = {
  ensurePolyfilled
};