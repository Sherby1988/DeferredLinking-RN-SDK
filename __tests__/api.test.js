'use strict';

const { ApiClient } = require('../src/api');

function makeClient(responses = {}) {
  const client = new ApiClient('https://example.com', 'test-key');
  client._request = jest.fn().mockImplementation((path, _options) => {
    if (responses[path] !== undefined) return Promise.resolve(responses[path]);
    throw new Error(`Unexpected request: ${path}`);
  });
  return client;
}

describe('ApiClient', () => {
  test('createLink maps snake_case to camelCase', async () => {
    const client = makeClient({
      '/api/links': {
        link: {
          id: 1,
          app_id: 1,
          short_code: 'abc123',
          deep_link_uri: 'myapp://home',
          fallback_url: null,
          og_title: null,
          og_description: null,
          og_image_url: null,
          expires_at: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        short_url: 'https://example.com/abc123',
      },
    });

    const result = await client.createLink({ deepLinkUri: 'myapp://home' });

    expect(result.link.shortCode).toBe('abc123');
    expect(result.link.deepLinkUri).toBe('myapp://home');
    expect(result.shortUrl).toBe('https://example.com/abc123');
  });

  test('resolveDeferred maps matched response', async () => {
    const client = makeClient({
      '/api/deferred/resolve': {
        matched: true,
        deep_link_uri: 'myapp://products/42',
        short_code: 'abc123',
        link_id: 1,
      },
    });

    const result = await client.resolveDeferred({
      userAgent: 'TestAgent/1.0',
      platform: 'ios',
      language: 'en',
      screenWidth: 390,
      screenHeight: 844,
      timezone: 'UTC',
    });

    expect(result.matched).toBe(true);
    expect(result.deepLinkUri).toBe('myapp://products/42');
  });

  test('resolveDeferred handles no match', async () => {
    const client = makeClient({
      '/api/deferred/resolve': { matched: false },
    });

    const result = await client.resolveDeferred({
      userAgent: 'TestAgent/1.0',
      platform: 'ios',
      language: 'en',
      screenWidth: 390,
      screenHeight: 844,
      timezone: 'UTC',
    });

    expect(result.matched).toBe(false);
  });

  test('throws on non-ok response', async () => {
    const client = new ApiClient('https://example.com', 'bad-key');
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    });

    await expect(client._request('/api/links')).rejects.toThrow('API error 401');
  });
});
