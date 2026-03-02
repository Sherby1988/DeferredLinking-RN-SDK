'use strict';

const { DeferredLinking } = require('../src/DeferredLinking');

function makeAsyncStorage() {
  const store = {};
  return {
    default: {
      setItem: jest.fn((key, value) => { store[key] = value; return Promise.resolve(); }),
      getItem: jest.fn((key) => Promise.resolve(store[key] || null)),
      removeItem: jest.fn((key) => { delete store[key]; return Promise.resolve(); }),
    },
  };
}

function makeInstance(onDeferred = null) {
  const as = makeAsyncStorage().default;
  const instance = DeferredLinking.init({
    apiKey: 'test-key',
    baseUrl: 'https://example.com',
    onDeferred,
    asyncStorage: as,
  });
  return { instance, asyncStorage: as };
}

afterEach(() => {
  DeferredLinking._reset();
});

describe('DeferredLinking', () => {
  test('init throws without apiKey', () => {
    expect(() => DeferredLinking.init({ baseUrl: 'https://x.com' })).toThrow('apiKey');
  });

  test('init throws without baseUrl', () => {
    expect(() => DeferredLinking.init({ apiKey: 'key' })).toThrow('baseUrl');
  });

  test('getInstance throws before init', () => {
    expect(() => DeferredLinking.getInstance()).toThrow('not initialized');
  });

  test('getInstance returns same instance after init', () => {
    const { instance } = makeInstance();
    expect(DeferredLinking.getInstance()).toBe(instance);
  });

  test('resolveDeferred calls onDeferred on match', async () => {
    const onDeferred = jest.fn();
    const { instance } = makeInstance(onDeferred);

    instance.api.resolveDeferred = jest.fn().mockResolvedValue({
      matched: true,
      deepLinkUri: 'myapp://home',
      shortCode: 'abc123',
      linkId: 1,
    });

    const result = await instance.resolveDeferred({ userAgent: 'test', platform: 'ios', language: 'en', screenWidth: 0, screenHeight: 0, timezone: 'UTC' });

    expect(result.matched).toBe(true);
    expect(onDeferred).toHaveBeenCalledWith(result);
  });

  test('resolveDeferred skips if already resolved', async () => {
    const { instance } = makeInstance();
    instance.api.resolveDeferred = jest.fn().mockResolvedValue({ matched: true, deepLinkUri: 'x', shortCode: 'y', linkId: 1 });

    // First call resolves
    await instance.resolveDeferred({ userAgent: 'test', platform: 'ios', language: 'en', screenWidth: 0, screenHeight: 0, timezone: 'UTC' });
    instance.api.resolveDeferred.mockClear();

    // Second call should not hit the API
    const result = await instance.resolveDeferred({ userAgent: 'test', platform: 'ios', language: 'en', screenWidth: 0, screenHeight: 0, timezone: 'UTC' });
    expect(result).toBeNull();
    expect(instance.api.resolveDeferred).not.toHaveBeenCalled();
  });

  test('resolveDeferred returns null on no match', async () => {
    const { instance } = makeInstance();
    instance.api.resolveDeferred = jest.fn().mockResolvedValue({ matched: false });

    const result = await instance.resolveDeferred({ userAgent: 'test', platform: 'ios', language: 'en', screenWidth: 0, screenHeight: 0, timezone: 'UTC' });
    expect(result).toBeNull();
  });

  test('clearResolved allows re-resolution', async () => {
    const { instance } = makeInstance();
    instance.api.resolveDeferred = jest.fn().mockResolvedValue({ matched: false });

    await instance.resolveDeferred({ userAgent: 'test', platform: 'ios', language: 'en', screenWidth: 0, screenHeight: 0, timezone: 'UTC' });
    await instance.clearResolved();

    instance.api.resolveDeferred = jest.fn().mockResolvedValue({ matched: true, deepLinkUri: 'myapp://home', shortCode: 'abc', linkId: 1 });
    const result = await instance.resolveDeferred({ userAgent: 'test', platform: 'ios', language: 'en', screenWidth: 0, screenHeight: 0, timezone: 'UTC' });
    expect(result).not.toBeNull();
    expect(instance.api.resolveDeferred).toHaveBeenCalled();
  });
});
