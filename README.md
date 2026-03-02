# Deferred Linking SDK

React Native SDK for the [Deferred Linking](https://github.com/Sherby1988/DeferredLinking-RN-SDK) platform — a self-hosted alternative to Firebase Dynamic Links.

Deferred deep linking lets you send a user to the right screen inside your app even when they install it *after* clicking a short link. The SDK handles the cold-start resolution, AsyncStorage guard against double-firing, and all API calls.

---

## Requirements

- React Native >= 0.70
- `@react-native-async-storage/async-storage` >= 1.0

---

## Installation

### 1. Add the package

Copy the `sdk/` directory into your project (or publish it to a private registry):

```
my-rn-app/
└── packages/
    └── deferred-linking-sdk/
```

Add it to `package.json`:

```json
{
  "dependencies": {
    "deferred-linking-sdk": "file:./packages/deferred-linking-sdk"
  }
}
```

```bash
npm install
```

### 2. Install the peer dependency

```bash
npm install @react-native-async-storage/async-storage
```

iOS — link native modules:

```bash
cd ios && pod install
```

---

## Quick start

```js
// App.js
import React, { useEffect } from 'react';
import { Linking } from 'react-native';
const { DeferredLinking } = require('deferred-linking-sdk');

// 1. Initialize once before any navigation renders
DeferredLinking.init({
  apiKey: 'YOUR_API_KEY',
  baseUrl: 'https://links.yourapp.com',
  onDeferred: (result) => {
    // Fires once on the cold start that matched a deferred link
    Linking.openURL(result.deepLinkUri);
  },
});

export default function App() {
  useEffect(() => {
    // 2. Attempt resolution on every cold start — skips automatically after first match
    DeferredLinking.getInstance().resolveDeferred().catch(console.error);
  }, []);

  return <>{/* your navigation tree */}</>;
}
```

---

## How deferred linking works

```
User clicks short link (https://links.yourapp.com/xK9pQr)
        │
        ▼
Backend records click and stores a fingerprint (ip + ua + language + screen)
        │
        ▼
Redirect page attempts to open URI scheme (yourapp://...)
        │
        ├── App installed → opens directly ✓
        │
        └── App not installed → redirects to App Store / Play Store
                    │
                    ▼
              User installs and opens the app for the first time
                    │
                    ▼
         SDK calls POST /api/deferred/resolve on cold start
                    │
                    ▼
         Backend matches fingerprint → returns deep_link_uri
                    │
                    ▼
              onDeferred fires → navigate to the right screen
```

---

## API

### `DeferredLinking.init(options)`

Initializes the singleton. Call once at app startup, outside any component.

| Option | Type | Required | Description |
|---|---|---|---|
| `apiKey` | `string` | yes | API key from the backend (`deferred-linking:create-app`) |
| `baseUrl` | `string` | yes | Base URL of your backend, e.g. `https://links.yourapp.com` |
| `onDeferred` | `function` | no | Callback fired when a deferred link is matched. Receives a [result object](#deferred-result) |
| `asyncStorage` | `object` | no | AsyncStorage instance to use. Defaults to `@react-native-async-storage/async-storage`. Pass a custom one for testing |

Returns the `DeferredLinking` instance.

---

### `DeferredLinking.getInstance()`

Returns the initialized singleton. Throws if `init()` has not been called.

---

### `instance.resolveDeferred([deviceInfoOverrides])`

Checks the backend for a pending deferred link matching this device. Call inside `useEffect([], [])` on every cold start.

- Skips silently if already resolved (reads `@DeferredLinking:resolved` from AsyncStorage)
- On a match: writes the resolved flag, fires `onDeferred`, returns the result
- On no match: returns `null`

```js
const result = await DeferredLinking.getInstance().resolveDeferred();
// result = { matched: true, deepLinkUri, shortCode, linkId }
// result = null  (no match or already resolved)
```

**`deviceInfoOverrides`** — optional object to override any field collected from the device:

| Field | Type | Default |
|---|---|---|
| `userAgent` | `string` | `DeferredLinkingSDK/1.0 (ios\|android)` |
| `platform` | `'ios' \| 'android'` | from `Platform.OS` |
| `language` | `string` | `'en'` |
| `screenWidth` | `number` | from `Dimensions.get('window').width` |
| `screenHeight` | `number` | from `Dimensions.get('window').height` |
| `timezone` | `string` | from `Intl.DateTimeFormat().resolvedOptions().timeZone` |

---

### `instance.createLink(options)`

Creates a new short link.

```js
const { link, shortUrl } = await DeferredLinking.getInstance().createLink({
  deepLinkUri: 'yourapp://products/42',
  fallbackUrl: 'https://yourapp.com/products/42',  // optional
  ogTitle: 'Check this out',                        // optional
  ogDescription: 'Limited stock.',                  // optional
  ogImageUrl: 'https://cdn.yourapp.com/42.jpg',     // optional
  expiresAt: '2024-12-31T23:59:59Z',               // optional ISO 8601
});

console.log(shortUrl); // https://links.yourapp.com/abc123
```

**Returns:**

| Field | Type | Description |
|---|---|---|
| `link.id` | `number` | |
| `link.shortCode` | `string` | 6-char code |
| `link.deepLinkUri` | `string` | |
| `link.fallbackUrl` | `string \| null` | |
| `link.ogTitle` | `string \| null` | |
| `link.ogDescription` | `string \| null` | |
| `link.ogImageUrl` | `string \| null` | |
| `link.expiresAt` | `string \| null` | ISO 8601 |
| `link.createdAt` | `string` | ISO 8601 |
| `shortUrl` | `string` | Full short URL ready to share |

---

### `instance.listLinks([page])`

Returns a paginated list of links for this app.

```js
const { data, total, perPage, currentPage, lastPage } =
  await DeferredLinking.getInstance().listLinks(1);
```

---

### `instance.getLink(shortCode)`

Fetch a single link by its short code.

```js
const { link, shortUrl } = await DeferredLinking.getInstance().getLink('abc123');
```

---

### `instance.deleteLink(shortCode)`

Delete a link.

```js
await DeferredLinking.getInstance().deleteLink('abc123');
```

---

### `instance.getAnalytics(shortCode)`

Per-link click stats.

```js
const analytics = await DeferredLinking.getInstance().getAnalytics('abc123');

analytics.totalClicks           // 142
analytics.byPlatform            // { ios: 89, android: 41, web: 12 }
analytics.clicksByDay           // [{ date: '2024-06-01', count: 23 }, ...]
```

---

### `instance.getAnalyticsSummary()`

App-wide stats across all links.

```js
const summary = await DeferredLinking.getInstance().getAnalyticsSummary();

summary.totalLinks              // 37
summary.totalClicks             // 4821
summary.byPlatform              // { ios: 2100, android: 2400, web: 321 }
summary.clicksLast7Days         // [{ date: '2024-05-26', count: 310 }, ...]
summary.topLinks                // [{ shortCode, clicksCount, deepLinkUri }, ...]
```

---

### `instance.clearResolved()`

Removes the `@DeferredLinking:resolved` flag from AsyncStorage. Call this on logout or during development to allow `resolveDeferred` to run again.

```js
await DeferredLinking.getInstance().clearResolved();
```

---

## Deferred result

The object passed to `onDeferred` and returned by `resolveDeferred`:

```js
{
  matched: true,
  deepLinkUri: 'yourapp://invite/user_456',
  shortCode: 'xK9pQr',
  linkId: 7,
}
```

---

## Recipes

### Navigate with React Navigation instead of Linking.openURL

```js
import { navigationRef } from './navigationRef';

DeferredLinking.init({
  apiKey: 'YOUR_API_KEY',
  baseUrl: 'https://links.yourapp.com',
  onDeferred: ({ deepLinkUri }) => {
    const url = new URL(deepLinkUri);
    // e.g. yourapp://products/42
    if (url.host === 'products') {
      const id = url.pathname.replace('/', '');
      navigationRef.current?.navigate('ProductDetail', { id });
    }
  },
});
```

### Sharing a link from inside the app

```js
import { Share } from 'react-native';

async function shareProduct(productId) {
  const { shortUrl } = await DeferredLinking.getInstance().createLink({
    deepLinkUri: `yourapp://products/${productId}`,
    ogTitle: 'Check out this product',
    fallbackUrl: `https://yourapp.com/products/${productId}`,
  });

  await Share.share({ message: shortUrl });
}
```

### Reset on logout

```js
async function logout() {
  await signOut();
  await DeferredLinking.getInstance().clearResolved();
}
```

### Using a custom AsyncStorage (e.g. in tests)

```js
DeferredLinking.init({
  apiKey: 'test-key',
  baseUrl: 'https://example.com',
  asyncStorage: myMockAsyncStorage,
});
```

---

## Error handling

All methods throw on non-2xx responses:

```js
try {
  const { link, shortUrl } = await DeferredLinking.getInstance().createLink({
    deepLinkUri: 'yourapp://home',
  });
} catch (err) {
  console.error(err.message); // "API error 401: Invalid API key"
}
```

`resolveDeferred` never throws — wrap it in `.catch` to log silently:

```js
DeferredLinking.getInstance().resolveDeferred().catch(console.error);
```

---

## Testing

```bash
npm test
```

Inject a mock AsyncStorage via the `asyncStorage` init option and replace `instance.api.resolveDeferred` with a jest mock to unit-test your `onDeferred` handler without hitting the network.

```js
const mockStorage = {
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
};

DeferredLinking.init({
  apiKey: 'test',
  baseUrl: 'https://example.com',
  asyncStorage: mockStorage,
  onDeferred: (result) => { /* assert here */ },
});

DeferredLinking.getInstance().api.resolveDeferred = jest.fn().mockResolvedValue({
  matched: true,
  deepLinkUri: 'yourapp://home',
  shortCode: 'abc123',
  linkId: 1,
});

await DeferredLinking.getInstance().resolveDeferred();
```

---

## License

MIT
