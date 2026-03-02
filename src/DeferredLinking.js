'use strict';

const { ApiClient } = require('./api');
const { Storage } = require('./storage');
const { getDeviceInfo } = require('./deviceInfo');

let _instance = null;

class DeferredLinking {
  /**
   * Initialize the SDK. Call once in your App.tsx/App.js.
   * @param {object} options
   * @param {string} options.apiKey
   * @param {string} options.baseUrl
   * @param {function} [options.onDeferred]
   * @param {object} [options.asyncStorage] AsyncStorage instance
   */
  static init(options) {
    if (!options.apiKey) throw new Error('DeferredLinking.init: apiKey is required');
    if (!options.baseUrl) throw new Error('DeferredLinking.init: baseUrl is required');

    _instance = new DeferredLinking(options);
    return _instance;
  }

  static getInstance() {
    if (!_instance) {
      throw new Error('DeferredLinking not initialized. Call DeferredLinking.init() first.');
    }
    return _instance;
  }

  /** Reset the singleton — useful for testing */
  static _reset() {
    _instance = null;
  }

  constructor(options) {
    this.onDeferred = options.onDeferred || null;
    this.api = new ApiClient(options.baseUrl, options.apiKey);

    const asyncStorage = options.asyncStorage || this._requireAsyncStorage();
    this.storage = new Storage(asyncStorage);
  }

  _requireAsyncStorage() {
    try {
      return require('@react-native-async-storage/async-storage').default;
    } catch (_) {
      throw new Error(
        'DeferredLinking requires @react-native-async-storage/async-storage. ' +
        'Install it or pass asyncStorage in options.'
      );
    }
  }

  /**
   * Call on every cold start (useEffect([], [])).
   * Resolves any pending deferred link and fires onDeferred if matched.
   * Guards against double-resolution via AsyncStorage flag.
   *
   * @param {object} [deviceInfoOverrides]
   * @returns {Promise<import('./api').DeferredLinkResult|null>}
   */
  async resolveDeferred(deviceInfoOverrides = {}) {
    const alreadyResolved = await this.storage.isResolved();
    if (alreadyResolved) return null;

    const deviceInfo = await getDeviceInfo(deviceInfoOverrides);
    const result = await this.api.resolveDeferred(deviceInfo);

    if (result.matched) {
      await this.storage.markResolved();
      if (this.onDeferred) {
        this.onDeferred(result);
      }
      return result;
    }

    return null;
  }

  /**
   * Create a new short link.
   * @param {object} options
   * @param {string} options.deepLinkUri
   * @param {string} [options.fallbackUrl]
   * @param {string} [options.ogTitle]
   * @param {string} [options.ogDescription]
   * @param {string} [options.ogImageUrl]
   * @param {string} [options.expiresAt]
   * @returns {Promise<{link: object, shortUrl: string}>}
   */
  async createLink(options) {
    return this.api.createLink(options);
  }

  /**
   * List links (paginated).
   * @param {number} [page=1]
   */
  async listLinks(page = 1) {
    return this.api.listLinks(page);
  }

  /**
   * Get a single link by short code.
   * @param {string} shortCode
   */
  async getLink(shortCode) {
    return this.api.getLink(shortCode);
  }

  /**
   * Delete a link by short code.
   * @param {string} shortCode
   */
  async deleteLink(shortCode) {
    return this.api.deleteLink(shortCode);
  }

  /**
   * Get analytics for a single link.
   * @param {string} shortCode
   */
  async getAnalytics(shortCode) {
    return this.api.getLinkAnalytics(shortCode);
  }

  /**
   * Get analytics summary for the whole app.
   */
  async getAnalyticsSummary() {
    return this.api.getAnalyticsSummary();
  }

  /**
   * Clear the resolved flag — useful for development or after logout.
   */
  async clearResolved() {
    return this.storage.clearResolved();
  }
}

module.exports = { DeferredLinking };
