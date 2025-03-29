/**
 * This file provides a polyfill for the ReadableStream class
 * which is required by the undici library used in node-fetch v3+
 * 
 * For older Node.js versions, this polyfill ensures compatibility
 */

// Try to polyfill ReadableStream if not available
if (typeof ReadableStream === 'undefined') {
  try {
    // For Node.js >=16.5.0
    global.ReadableStream = require('stream/web').ReadableStream;
    console.log('Using stream/web ReadableStream polyfill');
  } catch (e) {
    // For older Node.js versions
    try {
      const { Readable } = require('stream');
      
      // Simple polyfill based on Node.js streams
      class BasicReadableStream {
        constructor(options) {
          this._source = options?.underlyingSource;
          this._controller = null;
          this._reader = null;
          this._stream = new Readable({
            read: () => {
              if (this._source && this._source.pull) {
                this._source.pull(this._controller);
              }
            }
          });
          
          this._controller = {
            enqueue: (chunk) => {
              this._stream.push(chunk);
            },
            close: () => {
              this._stream.push(null);
            },
            error: (err) => {
              this._stream.destroy(err);
            }
          };
          
          if (this._source && this._source.start) {
            this._source.start(this._controller);
          }
        }
        
        getReader() {
          if (this._reader) {
            throw new Error('A reader has already been created');
          }
          
          this._reader = {
            read: () => {
              return new Promise((resolve, reject) => {
                this._stream.once('data', (chunk) => {
                  resolve({ value: chunk, done: false });
                });
                this._stream.once('end', () => {
                  resolve({ value: undefined, done: true });
                });
                this._stream.once('error', (err) => {
                  reject(err);
                });
              });
            },
            cancel: () => {
              this._stream.destroy();
              return Promise.resolve();
            },
            releaseLock: () => {
              this._reader = null;
            }
          };
          
          return this._reader;
        }
      }
      
      global.ReadableStream = BasicReadableStream;
      console.log('Using custom ReadableStream polyfill');
    } catch (err) {
      console.error('Failed to polyfill ReadableStream:', err);
      // Last resort: create a minimal mock
      global.ReadableStream = class MockReadableStream {
        constructor() {
          console.warn('Using mock ReadableStream - some features may not work');
        }
        getReader() {
          return {
            read: () => Promise.resolve({ value: null, done: true }),
            cancel: () => Promise.resolve(),
            releaseLock: () => {}
          };
        }
      };
    }
  }
}

module.exports = {
  ensurePolyfilled: () => {
    return typeof ReadableStream !== 'undefined';
  }
};