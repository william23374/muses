/**
 * @fileoverview In-memory cache implementation
 *
 * Provides simple key-value caching with:
 * - Automatic expiration by time (via setTimeout)
 * - Expiration callback notifications
 * - Bulk clearing
 *
 * Used as the underlying storage engine for apicache.
 *
 * @module memory-cache
 */

/**
 * MemoryCache constructor
 *
 * Initializes empty cache storage and counter.
 * @constructor
 */
function MemoryCache() {
  this.cache = {}; // Cache storage { key: { value, expire, timeout } }
  this.size = 0;   // Current number of cache entries
}

/**
 * Add a cache entry
 *
 * @param {string} key - Cache key
 * @param {*} value - Cache value (any type)
 * @param {number} time - Expiration time (milliseconds)
 * @param {function} [timeoutCallback] - Callback on expiration (value, key) => void
 * @returns {Object} Created cache entry { value, expire, timeout }
 */
MemoryCache.prototype.add = function (key, value, time, timeoutCallback) {
  const old = this.cache[key];
  const instance = this;

  const entry = {
    value,                        // Cached value
    expire: time + Date.now(),    // Expiration timestamp (milliseconds)
    timeout: setTimeout(function () {
      // Auto-expire: remove entry and invoke callback
      instance.delete(key);
      return timeoutCallback && typeof timeoutCallback === 'function' && timeoutCallback(value, key);
    }, time),
  };

  this.cache[key] = entry;
  this.size = Object.keys(this.cache).length;

  return entry;
};

/**
 * Delete a cache entry
 *
 * @param {string} key - Cache key
 * @returns {null} Always returns null
 */
MemoryCache.prototype.delete = function (key) {
  const entry = this.cache[key];
  if (entry) clearTimeout(entry.timeout); // Clear auto-expiration timer

  delete this.cache[key];

  this.size = Object.keys(this.cache).length;

  return null;
};

/**
 * Get a cache entry (including metadata)
 *
 * @param {string} key - Cache key
 * @returns {Object|undefined} Cache entry { value, expire, timeout }, or undefined if missing
 */
MemoryCache.prototype.get = function (key) {
  return this.cache[key];
};

/**
 * Get cached value (returns only the value part)
 *
 * @param {string} key - Cache key
 * @returns {*} Cached value, or undefined if missing
 */
MemoryCache.prototype.getValue = function (key) {
  const entry = this.get(key);

  return entry && entry.value;
};

/**
 * Clear all cache entries
 *
 * Iterates all keys and deletes each one (clears corresponding timers).
 * @returns {true} Always returns true
 */
MemoryCache.prototype.clear = function () {
  Object.keys(this.cache).forEach(function (key) {
    this.delete(key);
  }, this);

  return true;
};

module.exports = MemoryCache;
