'use strict';

const { Storage, RESOLVED_KEY } = require('../src/storage');

function makeAsyncStorage() {
  const store = {};
  return {
    setItem: jest.fn((key, value) => { store[key] = value; return Promise.resolve(); }),
    getItem: jest.fn((key) => Promise.resolve(store[key] || null)),
    removeItem: jest.fn((key) => { delete store[key]; return Promise.resolve(); }),
  };
}

describe('Storage', () => {
  test('markResolved sets resolved flag', async () => {
    const as = makeAsyncStorage();
    const storage = new Storage(as);
    await storage.markResolved();
    expect(as.setItem).toHaveBeenCalledWith(RESOLVED_KEY, 'true');
  });

  test('isResolved returns true after markResolved', async () => {
    const as = makeAsyncStorage();
    const storage = new Storage(as);
    await storage.markResolved();
    const result = await storage.isResolved();
    expect(result).toBe(true);
  });

  test('isResolved returns false initially', async () => {
    const as = makeAsyncStorage();
    const storage = new Storage(as);
    const result = await storage.isResolved();
    expect(result).toBe(false);
  });

  test('clearResolved removes the flag', async () => {
    const as = makeAsyncStorage();
    const storage = new Storage(as);
    await storage.markResolved();
    await storage.clearResolved();
    const result = await storage.isResolved();
    expect(result).toBe(false);
  });
});
