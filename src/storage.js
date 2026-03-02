'use strict';

const RESOLVED_KEY = '@DeferredLinking:resolved';

/**
 * Storage abstraction that wraps AsyncStorage.
 * Accepts the AsyncStorage instance at construction time to allow easy mocking.
 */
class Storage {
  constructor(asyncStorage) {
    this.asyncStorage = asyncStorage;
  }

  async markResolved() {
    await this.asyncStorage.setItem(RESOLVED_KEY, 'true');
  }

  async isResolved() {
    const value = await this.asyncStorage.getItem(RESOLVED_KEY);
    return value === 'true';
  }

  async clearResolved() {
    await this.asyncStorage.removeItem(RESOLVED_KEY);
  }
}

module.exports = { Storage, RESOLVED_KEY };
