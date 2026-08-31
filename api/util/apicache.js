/**
 * @fileoverview API response caching middleware
 *
 * Source: Modified from [Binaryify/NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi)
 *
 * This module provides Express middleware-level API response caching with support for:
 * - In-memory cache (default) and Redis cache (optional)
 * - Cache expiration via time strings (e.g. "2 minutes", "1 hour")
 * - Group-based cache entry management with bulk clearing
 * - Custom cache conditions (status code filtering, request/response toggle functions)
 * - Cache hit rate statistics (optional, for performance monitoring)
 * - ETag/304 negotiated caching support
 * - JSONP request URL parameter stripping
 *
 * Usage example:
 *   const cache = require('./apicache').middleware;
 *   app.use(cache('2 minutes', (req, res) => res.statusCode === 200));
 *
 * @module apicache
 * @requires url - URL parsing (used to strip query parameters in JSONP mode)
 * @requires ./memory-cache - In-memory cache implementation
 */

const url = require('url');
const MemoryCache = require('./memory-cache');

/**
 * Time unit to millisecond conversion table
 * Used to parse human-readable time strings (e.g. "2 minutes", "1 hour")
 * @type {Object.<string, number>}
 */
const t = {
  ms: 1,                    // milliseconds
  second: 1000,             // seconds → 1000ms
  minute: 60000,            // minutes → 60000ms
  hour: 3600000,            // hours → 3600000ms
  day: 3600000 * 24,        // days → 86400000ms
  week: 3600000 * 24 * 7,   // weeks → 604800000ms
  month: 3600000 * 24 * 30, // months (30 days) → 2592000000ms
};

/**
 * Global registry of all ApiCache instances
 * Used to track and manage multiple cache instances
 * @type {Array<ApiCache>}
 */
const instances = [];

/**
 * Create a strict equality matcher function
 * @param {string} a - Value to match
 * @returns {function(string): boolean} Matcher function
 */
const matches = function (a) {
  return function (b) {
    return a === b;
  };
};

/**
 * Create a non-matcher function (inverse of matches)
 * @param {string} a - Value to exclude
 * @returns {function(string): boolean} Non-matcher function
 */
const doesNotMatch = function (a) {
  return function (b) {
    return !matches(a)(b);
  };
};

/**
 * Format duration as a human-readable log string
 * Displays seconds when over 1000ms (e.g. "1.23sec"), otherwise milliseconds (e.g. "456ms")
 * Output includes yellow ANSI escape codes
 *
 * @param {number} d - Duration in milliseconds
 * @param {string} [prefix] - Optional prefix text
 * @returns {string} Colored log string
 */
const logDuration = function (d, prefix) {
  const str = d > 1000 ? `${(d / 1000).toFixed(2)}sec` : `${d}ms`;
  return `\x1B[33m- ${prefix ? `${prefix} ` : ''}${str}\x1B[0m`;
};

/**
 * Safely retrieve the response headers object
 * Compatible with different versions of Express/Node.js
 * @param {Object} res - Express response object
 * @returns {Object} Response header key-value pairs
 */
function getSafeHeaders(res) {
  return res.getHeaders ? res.getHeaders() : res._headers;
}

/**
 * ApiCache caching middleware constructor
 *
 * Each instance maintains its own:
 * - In-memory cache (MemoryCache)
 * - Global configuration options
 * - Cache index (all + groups)
 * - Timer collection (for automatic expiration clearing)
 * - Performance statistics array
 *
 * @constructor
 */
function ApiCache() {
  const memCache = new MemoryCache();

  /**
   * Global configuration options
   * @type {Object}
   */
  const globalOptions = {
    debug: false,                // Whether to enable debug logging
    defaultDuration: 3600000,    // Default cache duration (1 hour, in milliseconds)
    enabled: true,               // Whether caching is enabled
    appendKey: [],               // Custom cache key append fields (array or function)
    jsonp: false,                // Whether this is a JSONP request (strips query params from URL when enabled)
    redisClient: false,          // Redis client instance (false means use in-memory cache)
    // CORS / Cookie headers vary per request; replaying cached values causes browser credential requests to fail
    headerBlacklist: [
      'access-control-allow-origin',
      'access-control-allow-credentials',
      'access-control-allow-headers',
      'access-control-allow-methods',
      'set-cookie',
    ],
    statusCodes: {
      include: [],               // Only cache these status codes (empty array means no restriction)
      exclude: [],               // Exclude these status codes
    },
    events: {
      expire: undefined,         // Callback when cache expires
    },
    headers: {},                 // Response headers to force override (e.g. 'cache-control': 'no-cache')
    trackPerformance: false,     // Whether to track cache hit rate (increases memory usage)
  };

  const middlewareOptions = [];  // Registry of all middleware options
  const instance = this;
  let index = null;              // Cache index: { all: [key...], groups: { groupName: [key...] } }
  const timers = {};             // Auto-expiration timer collection { key: setTimeout ID }
  const performanceArray = [];   // Cache hit rate statistics array

  // Register this instance in the global instance list
  instances.push(this);
  this.id = instances.length;

  /**
   * Debug log output function
   * Only outputs when debug mode is on or DEBUG env var includes 'apicache'
   * @param {...*} args - Log arguments
   */
  function debug(a, b, c, d) {
    const arr = ['\x1B[36m[apicache]\x1B[0m', a, b, c, d].filter((arg) => {
      return arg !== undefined;
    });
    const debugEnv = process.env.DEBUG && process.env.DEBUG.split(',').includes('apicache');

    return (globalOptions.debug || debugEnv) && console.log.apply(null, arr);
  }

  /**
   * Determine whether a response should be cached
   *
   * Logic:
   * 1. Response object must exist
   * 2. If a toggle function is provided, toggle must return true
   * 3. Response status code is not in the exclude list
   * 4. Response status code is in the include list (if include is non-empty)
   *
   * @param {Object} request - Express request object
   * @param {Object} response - Express response object
   * @param {function} [toggle] - Optional cache condition function (req, res) => boolean
   * @returns {boolean} Whether the response should be cached
   */
  function shouldCacheResponse(request, response, toggle) {
    const opt = globalOptions;
    const codes = opt.statusCodes;

    if (!response) {
      return false;
    }

    // Custom toggle function check
    if (toggle && !toggle(request, response)) {
      return false;
    }

    // Status code exclude list
    if (codes.exclude && codes.exclude.length && codes.exclude.includes(response.statusCode)) {
      return false;
    }
    // Status code include list (whitelist mode)
    if (codes.include && codes.include.length && codes.include.includes(response.statusCode)) {
      return false;
    }

    return true;
  }

  /**
   * Add a cache key to the index
   *
   * Index structure:
   * - index.all: Array of all cache keys (for full clear)
   * - index.groups: Cache key arrays indexed by group name (for group clear)
   *
   * @param {string} key - Cache key
   * @param {Object} req - Express request object (req.apicacheGroup can specify group name)
   */
  function addIndexEntries(key, req) {
    const groupName = req.apicacheGroup;

    if (groupName) {
      debug(`group detected "${groupName}"`);
      // Add key to group index (unshift adds to array head)
      const group = (index.groups[groupName] = index.groups[groupName] || []);
      group.unshift(key);
    }

    // Add key to global index
    index.all.unshift(key);
  }

  /**
   * Filter out blacklisted response headers
   * @param {Object} headers - Original response headers
   * @returns {Object} Filtered response headers
   */
  function filterBlacklistedHeaders(headers) {
    const blacklist = globalOptions.headerBlacklist.map((k) => String(k).toLowerCase());
    return Object.keys(headers)
      .filter((key) => {
        return !blacklist.includes(String(key).toLowerCase());
      })
      .reduce((acc, header) => {
        acc[header] = headers[header];
        return acc;
      }, {});
  }

  /**
   * Create a cache object
   *
   * @param {number} status - HTTP status code
   * @param {Object} headers - Response headers
   * @param {string|Buffer} data - Response body data
   * @param {string} encoding - Encoding
   * @returns {Object} Cache object
   */
  function createCacheObject(status, headers, data, encoding) {
    return {
      status,
      headers: filterBlacklistedHeaders(headers), // Filter blacklisted headers
      data,
      encoding,
      timestamp: new Date().getTime() / 1000, // Unix timestamp (seconds), used to compute remaining max-age
    };
  }

  /**
   * Store response data in cache
   *
   * Supports two storage backends:
   * - Redis: Uses hset for storage, expire for TTL
   * - Memory: Uses MemoryCache for storage
   *
   * Also sets an auto-clear timer (setTimeout max value limited to 2147483647ms ≈ 24.8 days)
   *
   * @param {string} key - Cache key
   * @param {Object} value - Cache object
   * @param {number} duration - Cache duration in milliseconds
   */
  function cacheResponse(key, value, duration) {
    const redis = globalOptions.redisClient;
    const expireCallback = globalOptions.events.expire;

    if (redis && redis.connected) {
      // Redis storage
      try {
        redis.hset(key, 'response', JSON.stringify(value));
        redis.hset(key, 'duration', duration);
        redis.expire(key, duration / 1000, expireCallback || (() => {}));
      } catch (err) {
        debug('[apicache] error in redis.hset()');
      }
    } else {
      // In-memory storage
      memCache.add(key, value, duration, expireCallback);
    }

    // Set auto-clear timer (cap max value to prevent setTimeout overflow)
    timers[key] = setTimeout(() => {
      instance.clear(key, true);
    }, Math.min(duration, 2147483647));
  }

  /**
   * Accumulate response content into res._apicache.content
   *
   * Express res.write() may be called multiple times, each passing partial content.
   * This function accumulates all partial content for caching the complete response.
   *
   * Supports three content types:
   * - string: String concatenation
   * - Buffer: Buffer.concat concatenation
   * - Other: Direct assignment (e.g. JSON object)
   *
   * @param {Object} res - Express response object
   * @param {string|Buffer} content - Content written in this call
   */
  function accumulateContent(res, content) {
    if (content) {
      if (typeof content == 'string') {
        // String concatenation
        res._apicache.content = (res._apicache.content || '') + content;
      } else if (Buffer.isBuffer(content)) {
        let oldContent = res._apicache.content;

        // Convert old string content to Buffer
        if (typeof oldContent === 'string') {
          oldContent = !Buffer.from ? new Buffer(oldContent) : Buffer.from(oldContent);
        }

        if (!oldContent) {
          oldContent = !Buffer.alloc ? Buffer.alloc(0) : Buffer.alloc(0);
        }

        // Buffer concatenation
        res._apicache.content = Buffer.concat([oldContent, content], oldContent.length + content.length);
      } else {
        // Direct assignment for other types
        res._apicache.content = content;
      }
    }
  }

  /**
   * Make a response cacheable (monkey-patch res methods)
   *
   * By intercepting res.writeHead, res.write, and res.end,
   * automatically stores content in cache when the response completes.
   *
   * Flow:
   * 1. Save original method references to res._apicache
   * 2. Apply global response header overrides
   * 3. Override res.writeHead: add cache-control header, save response header snapshot
   * 4. Override res.write: accumulate partial content
   * 5. Override res.end: decide whether to cache, create cache object and store
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {function} next - Express next function
   * @param {string} key - Cache key
   * @param {number} duration - Cache duration in milliseconds
   * @param {string} strDuration - Original duration string (for logging)
   * @param {function} [toggle] - Cache condition function
   */
  function makeResponseCacheable(req, res, next, key, duration, strDuration, toggle) {
    // Save original method references for later calls
    res._apicache = {
      write: res.write,
      writeHead: res.writeHead,
      end: res.end,
      cacheable: true,
      content: undefined,
    };

    // Apply global response header overrides
    Object.keys(globalOptions.headers).forEach((name) => {
      res.setHeader(name, globalOptions.headers[name]);
    });

    // Override res.writeHead: add cache-control header and save response header snapshot
    res.writeHead = function () {
      if (!globalOptions.headers['cache-control']) {
        if (shouldCacheResponse(req, res, toggle)) {
          // Cacheable: set max-age
          res.setHeader('cache-control', `max-age=${(duration / 1000).toFixed(0)}`);
        } else {
          // Not cacheable: forbid caching
          res.setHeader('cache-control', 'no-cache, no-store, must-revalidate');
        }
      }

      // Save response header snapshot (headers are finalized after writeHead is called)
      res._apicache.headers = Object.assign({}, getSafeHeaders(res));
      return res._apicache.writeHead.apply(this, arguments);
    };

    // Override res.write: accumulate partial content
    res.write = function (content) {
      accumulateContent(res, content);
      return res._apicache.write.apply(this, arguments);
    };

    // Override res.end: decide whether to cache, create cache object and store
    res.end = function (content, encoding) {
      if (shouldCacheResponse(req, res, toggle)) {
        accumulateContent(res, content);

        if (res._apicache.cacheable && res._apicache.content) {
          // Add to cache index
          addIndexEntries(key, req);
          const headers = res._apicache.headers || getSafeHeaders(res);
          // Create cache object and store
          const cacheObject = createCacheObject(res.statusCode, headers, res._apicache.content, encoding);
          cacheResponse(key, cacheObject, duration);

          // Debug logging
          const elapsed = new Date() - req.apicacheTimer;
          debug(`adding cache entry for "${key}" @ ${strDuration}`, logDuration(elapsed));
          debug('_apicache.headers: ', res._apicache.headers);
          debug('res.getHeaders(): ', getSafeHeaders(res));
          debug('cacheObject: ', cacheObject);
        }
      }

      // Call original res.end
      return res._apicache.end.apply(this, arguments);
    };

    next();
  }

  /**
   * Send a cached response
   *
   * Logic:
   * 1. Check whether toggle function allows returning cached response
   * 2. Merge response headers, correctly decrement max-age (subtract elapsed time)
   * 3. Deserialize Buffer data
   * 4. Check ETag/If-None-Match, return 304 if matched
   * 5. Return full cached response
   *
   * @param {Object} request - Express request object
   * @param {Object} response - Express response object
   * @param {Object} cacheObject - Cache object
   * @param {function} [toggle] - Cache condition function
   * @param {function} next - Express next function
   * @param {number} duration - Cache duration in milliseconds
   */
  function sendCachedResponse(request, response, cacheObject, toggle, next, duration) {
    if (toggle && !toggle(request, response)) {
      return next();
    }

    const headers = getSafeHeaders(response);

    // Merge cached response headers and correctly decrement max-age
    Object.assign(headers, filterBlacklistedHeaders(cacheObject.headers || {}), {
      // max-age = original duration - elapsed time, minimum 0
      'cache-control': `max-age=${Math.max(0, (duration / 1000 - (new Date().getTime() / 1000 - cacheObject.timestamp)).toFixed(0))}`,
    });

    // Re-write CORS on cache hit to avoid replaying * and causing browser to block credential requests
    const requestOrigin = request.headers.origin;
    if (requestOrigin) {
      headers['access-control-allow-origin'] = requestOrigin;
      headers['access-control-allow-credentials'] = 'true';
      headers['access-control-allow-headers'] =
        'Authorization,X-Requested-With,Content-Type,Cache-Control';
      headers['access-control-allow-methods'] = 'PUT,POST,GET,DELETE,OPTIONS';
    }

    // Deserialize Buffer data (JSON-serialized Buffer becomes { type: 'Buffer', data: [...] } format)
    let data = cacheObject.data;
    if (data && data.type === 'Buffer') {
      data = typeof data.data === 'number' ? new Buffer.alloc(data.data) : new Buffer.from(data.data);
    }

    // ETag negotiated caching: if request If-None-Match matches cached ETag, return 304
    const cachedEtag = cacheObject.headers.etag;
    const requestEtag = request.headers['if-none-match'];

    if (requestEtag && cachedEtag === requestEtag) {
      response.writeHead(304, headers);
      return response.end();
    }

    // Return cached response
    response.writeHead(cacheObject.status || 200, headers);

    return response.end(data, cacheObject.encoding);
  }

  /**
   * Sync global options to all middleware instances
   * Merges globalOptions into each middleware's opt and applies respective localOptions
   */
  function syncOptions() {
    for (const i in middlewareOptions) {
      Object.assign(middlewareOptions[i].options, globalOptions, middlewareOptions[i].localOptions);
    }
  }

  /**
   * Clear cache
   *
   * Supports three clear modes:
   * 1. Clear by group name: target is group name, clears all cache in that group
   * 2. Clear by cache key: target is a specific cache key
   * 3. Clear all: target is empty, clears all cache
   *
   * @param {string} [target] - Group name or cache key; empty clears all
   * @param {boolean} [isAutomatic] - Whether this is automatic expiration clear (for log distinction)
   * @returns {Object} Current cache index
   */
  this.clear = function (target, isAutomatic) {
    const group = index.groups[target];
    const redis = globalOptions.redisClient;

    if (group) {
      // Mode 1: Clear by group name
      debug(`clearing group "${target}"`);

      group.forEach((key) => {
        debug(`clearing cached entry for "${key}"`);
        clearTimeout(timers[key]);
        delete timers[key];
        if (!globalOptions.redisClient) {
          memCache.delete(key);
        } else {
          try {
            redis.del(key);
          } catch (err) {
            console.log(`[apicache] error in redis.del("${key}")`);
          }
        }
        index.all = index.all.filter(doesNotMatch(key));
      });

      delete index.groups[target];
    } else if (target) {
      // Mode 2: Clear by cache key
      debug(`clearing ${isAutomatic ? 'expired' : 'cached'} entry for "${target}"`);
      clearTimeout(timers[target]);
      delete timers[target];

      if (!redis) {
        memCache.delete(target);
      } else {
        try {
          redis.del(target);
        } catch (err) {
          console.log(`[apicache] error in redis.del("${target}")`);
        }
      }

      // Remove from global index
      index.all = index.all.filter(doesNotMatch(target));

      // Remove from all groups and clean up empty groups
      Object.keys(index.groups).forEach((groupName) => {
        index.groups[groupName] = index.groups[groupName].filter(doesNotMatch(target));

        if (!index.groups[groupName].length) {
          delete index.groups[groupName];
        }
      });
    } else {
      // Mode 3: Clear all
      debug('clearing entire index');

      if (!redis) {
        memCache.clear();
      } else {
        // Clear Redis keys one by one (avoid deleting non-apicache entries)
        index.all.forEach((key) => {
          clearTimeout(timers[key]);
          delete timers[key];
          try {
            redis.del(key);
          } catch (err) {
            console.log(`[apicache] error in redis.del("${key}")`);
          }
        });
      }
      this.resetIndex();
    }

    return this.getIndex();
  };

  /**
   * Parse duration string to milliseconds
   *
   * Supported formats:
   * - Number: returned directly (milliseconds)
   * - String: "2 minutes", "1 hour", "30 seconds", "500ms"
   *   - Numeric part supports decimals (e.g. "1.5 hours")
   *   - Units support plurals (trailing s is stripped automatically)
   *   - "m" is parsed as "ms" (millisecond abbreviation)
   *
   * @param {number|string} duration - Duration (number or string)
   * @param {number} defaultDuration - Default duration when parsing fails
   * @returns {number} Duration in milliseconds
   */
  function parseDuration(duration, defaultDuration) {
    if (typeof duration === 'number') {
      return duration;
    }

    if (typeof duration === 'string') {
      const split = duration.match(/^([\d\.,]+)\s?(\w+)$/);

      if (split.length === 3) {
        const len = Number.parseFloat(split[1]);
        let unit = split[2].replace(/s$/i, '').toLowerCase();
        if (unit === 'm') {
          unit = 'ms';
        }

        return (len || 1) * (t[unit] || 0);
      }
    }

    return defaultDuration;
  }

  /**
   * Get duration (public method)
   * @param {number|string} duration - Duration
   * @returns {number} Parsed duration in milliseconds
   */
  this.getDuration = function (duration) {
    return parseDuration(duration, globalOptions.defaultDuration);
  };

  /**
   * Get cache performance statistics (hit rate)
   *
   * Can be used to create a performance monitoring endpoint:
   * app.get('/api/cache/performance', (req, res) => {
   *    res.json(apicache.getPerformance())
   * })
   *
   * @returns {Array<Object>} Performance report array for each middleware
   */
  this.getPerformance = function () {
    return performanceArray.map((p) => {
      return p.report();
    });
  };

  /**
   * Get cache index
   * @param {string} [group] - Optional group name; omit to return full index
   * @returns {Object} Cache index
   */
  this.getIndex = function (group) {
    if (group) {
      return index.groups[group];
    } else {
      return index;
    }
  };

  /**
   * Create cache middleware
   *
   * This is the main public API, returning an Express middleware function.
   * The middleware intercepts requests, checks cache, returns cached response on hit,
   * or continues processing and caches the response on miss.
   *
   * @param {string|number} strDuration - Cache duration (e.g. "2 minutes" or 120000)
   * @param {function} [middlewareToggle] - Middleware-level cache condition function (req, res) => boolean
   * @param {Object} [localOptions] - Local config for this middleware (overrides global config)
   * @returns {function} Express middleware function
   */
  this.middleware = function cache(strDuration, middlewareToggle, localOptions) {
    const duration = instance.getDuration(strDuration);
    const opt = {};

    // Register middleware options
    middlewareOptions.push({
      options: opt,
    });

    /**
     * Update or get middleware options
     * @param {Object} [localOptions] - Local config
     * @returns {Object} Current middleware config
     */
    const options = function (localOptions) {
      if (localOptions) {
        middlewareOptions.find((middleware) => {
          return middleware.options === opt;
        }).localOptions = localOptions;
      }

      syncOptions();

      return opt;
    };

    options(localOptions);

    /**
     * No-op performance statistics class (used when not tracking performance)
     * All methods are empty functions to avoid conditional check overhead
     */
    function NOOPCachePerformance() {
      this.report = this.hit = this.miss = function () {}; // noop;
    }

    /**
     * Cache hit rate statistics class
     *
     * Uses bit-packing to efficiently store historical hit/miss records:
     * - Each Uint8Array element stores 4 records
     * - Each record uses 2 bits: 00=no record, 01=hit, 10=miss
     * - Supports 4 time windows: last 100/1000/10000/100000 requests
     */
    function CachePerformance() {
      /**
       * Hit records for the last 100 requests (bit-packed storage)
       * @type {Uint8Array}
       */
      this.hitsLast100 = new Uint8Array(100 / 4); // each hit is 2 bits

      /**
       * Hit records for the last 1000 requests
       * @type {Uint8Array}
       */
      this.hitsLast1000 = new Uint8Array(1000 / 4); // each hit is 2 bits

      /**
       * Hit records for the last 10000 requests
       * @type {Uint8Array}
       */
      this.hitsLast10000 = new Uint8Array(10000 / 4); // each hit is 2 bits

      /**
       * Hit records for the last 100000 requests
       * @type {Uint8Array}
       */
      this.hitsLast100000 = new Uint8Array(100000 / 4); // each hit is 2 bits

      /**
       * Total request count (since server start)
       * @type {number}
       */
      this.callCount = 0;

      /**
       * Total hit count
       * @type {number}
       */
      this.hitCount = 0;

      /**
       * Last cache hit key (used to identify the corresponding route)
       * @type {string|null}
       */
      this.lastCacheHit = null;

      /**
       * Last cache miss key
       * @type {string|null}
       */
      this.lastCacheMiss = null;

      /**
       * Generate performance statistics report
       * @returns {Object} Report object with various metrics
       */
      this.report = function () {
        return {
          lastCacheHit: this.lastCacheHit,
          lastCacheMiss: this.lastCacheMiss,
          callCount: this.callCount,
          hitCount: this.hitCount,
          missCount: this.callCount - this.hitCount,
          hitRate: this.callCount == 0 ? null : this.hitCount / this.callCount,
          hitRateLast100: this.hitRate(this.hitsLast100),
          hitRateLast1000: this.hitRate(this.hitsLast1000),
          hitRateLast10000: this.hitRate(this.hitsLast10000),
          hitRateLast100000: this.hitRate(this.hitsLast100000),
        };
      };

      /**
       * Compute hit rate from bit-packed array
       *
       * Iterates over 4 two-bit records per byte:
       * - 01 (1) = hit
       * - 10 (2) = miss
       * - 00 (0) = no record (ignored)
       *
       * @param {Uint8Array} array - Bit-packed hit record array
       * @returns {number|null} Hit rate (0~1), null when no records
       */
      this.hitRate = function (array) {
        let hits = 0;
        let misses = 0;
        for (let i = 0; i < array.length; i++) {
          let n8 = array[i];
          for (j = 0; j < 4; j++) {
            switch (n8 & 3) {
              case 1:
                hits++;
                break;
              case 2:
                misses++;
                break;
            }
            n8 >>= 2;
          }
        }
        const total = hits + misses;
        if (total == 0) {
          return null;
        }
        return hits / total;
      };

      /**
       * Record a hit or miss in a bit-packed array
       *
       * Encoding rules (each 2-bit record):
       * - 00: no record
       * - 01: hit
       * - 10: miss
       *
       * @param {Uint8Array} array - Bit-packed array
       * @param {boolean} hit - true=hit, false=miss
       */
      this.recordHitInArray = function (array, hit) {
        const arrayIndex = ~~(this.callCount / 4) % array.length;   // Array index
        const bitOffset = (this.callCount % 4) * 2;                  // Bit offset (2 bits per record)
        const clearMask = ~(3 << bitOffset);                         // Clear mask
        const record = (hit ? 1 : 2) << bitOffset;                   // Encoded record
        array[arrayIndex] = (array[arrayIndex] & clearMask) | record;
      };

      /**
       * Record a hit/miss in all time window arrays
       * @param {boolean} hit - true=hit, false=miss
       */
      this.recordHit = function (hit) {
        this.recordHitInArray(this.hitsLast100, hit);
        this.recordHitInArray(this.hitsLast1000, hit);
        this.recordHitInArray(this.hitsLast10000, hit);
        this.recordHitInArray(this.hitsLast100000, hit);
        if (hit) {
          this.hitCount++;
        }
        this.callCount++;
      };

      /**
       * Record a cache hit
       * @param {string} key - Cache key that was hit
       */
      this.hit = function (key) {
        this.recordHit(true);
        this.lastCacheHit = key;
      };

      /**
       * Record a cache miss
       * @param {string} key - Cache key that was missed
       */
      this.miss = function (key) {
        this.recordHit(false);
        this.lastCacheMiss = key;
      };
    }

    // Use real performance tracking or no-op based on config
    const perf = globalOptions.trackPerformance ? new CachePerformance() : new NOOPCachePerformance();

    performanceArray.push(perf);

    /**
     * Core cache middleware function
     *
     * Request handling flow:
     * 1. Check whether cache is enabled and whether bypass header is present
     * 2. Generate cache key (hostname + URL + appendKey)
     * 3. Try in-memory cache → return on hit
     * 4. Try Redis cache → return on hit
     * 5. Miss → intercept res methods, cache after response completes
     */
    const cache = function (req, res, next) {
      /**
       * Skip cache and proceed to next middleware
       */
      function bypass() {
        debug('bypass detected, skipping cache.');
        return next();
      }

      // Initial bypass checks
      if (!opt.enabled) {
        return bypass();
      }
      // Force bypass via request header
      if (req.headers['x-apicache-bypass'] || req.headers['x-apicache-force-fetch']) {
        return bypass();
      }

      // Record request start time (for elapsed time calculation)
      req.apicacheTimer = new Date();

      // Generate cache key: hostname + URL
      // In Express 4.x req.url may be route-relative; use originalUrl for full path
      let key = req.hostname + (req.originalUrl || req.url);
      // JSONP mode: strip query parameters (avoid different callback params creating different cache keys)
      if (opt.jsonp) {
        key = url.parse(key).pathname;
      }

      // Append custom cache key (supports function or property path array)
      if (typeof opt.appendKey === 'function') {
        key += `$$appendKey=${opt.appendKey(req, res)}`;
      } else if (opt.appendKey.length > 0) {
        let appendKey = req;

        for (let i = 0; i < opt.appendKey.length; i++) {
          appendKey = appendKey[opt.appendKey[i]];
        }
        key += `$$appendKey=${appendKey}`;
      }

      // Try to get from cache
      const redis = opt.redisClient;
      const cached = !redis ? memCache.getValue(key) : null;

      // In-memory cache hit
      if (cached) {
        const elapsed = new Date() - req.apicacheTimer;
        debug('sending cached (memory-cache) version of', key, logDuration(elapsed));

        perf.hit(key);
        return sendCachedResponse(req, res, cached, middlewareToggle, next, duration);
      }

      // Redis cache hit
      if (redis && redis.connected) {
        try {
          redis.hgetall(key, (err, obj) => {
            if (!err && obj && obj.response) {
              const elapsed = new Date() - req.apicacheTimer;
              debug('sending cached (redis) version of', key, logDuration(elapsed));

              perf.hit(key);
              return sendCachedResponse(req, res, JSON.parse(obj.response), middlewareToggle, next, duration);
            } else {
              // Redis miss, enter cache write flow
              perf.miss(key);
              return makeResponseCacheable(req, res, next, key, duration, strDuration, middlewareToggle);
            }
          });
        } catch (err) {
          // Degrade to miss on Redis error
          perf.miss(key);
          return makeResponseCacheable(req, res, next, key, duration, strDuration, middlewareToggle);
        }
      } else {
        // No Redis and memory miss, enter cache write flow
        perf.miss(key);
        return makeResponseCacheable(req, res, next, key, duration, strDuration, middlewareToggle);
      }
    };

    // Expose options function to allow runtime config changes
    cache.options = options;

    return cache;
  };

  /**
   * Set or get global configuration options
   *
   * @param {Object} [options] - Config object; omit to return current config
   * @returns {ApiCache|Object} Returns this when options is passed (chainable), otherwise current config
   */
  this.options = function (options) {
    if (options) {
      Object.assign(globalOptions, options);
      syncOptions();

      if ('defaultDuration' in options) {
        // Convert default duration to milliseconds
        globalOptions.defaultDuration = parseDuration(globalOptions.defaultDuration, 3600000);
      }

      if (globalOptions.trackPerformance) {
        debug('WARNING: using trackPerformance flag can cause high memory usage!');
      }

      return this;
    } else {
      return globalOptions;
    }
  };

  /**
   * Reset cache index (clear all index records)
   */
  this.resetIndex = function () {
    index = {
      all: [],      // All cache keys
      groups: {},   // Group index { groupName: [key...] }
    };
  };

  /**
   * Create a new ApiCache instance (optional config)
   * @param {Object} [config] - Initial config
   * @returns {ApiCache} New instance
   */
  this.newInstance = function (config) {
    const instance = new ApiCache();

    if (config) {
      instance.options(config);
    }

    return instance;
  };

  /**
   * Clone current instance (copy config)
   * @returns {ApiCache} Cloned instance
   */
  this.clone = function () {
    return this.newInstance(this.options());
  };

  // Initialize cache index
  this.resetIndex();
}

// Export singleton instance (shared cache manager for the entire application)
module.exports = new ApiCache();
