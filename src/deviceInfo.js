'use strict';

/**
 * Gather device info from React Native APIs.
 * Accepts optional overrides so tests can inject mock values.
 */
async function getDeviceInfo(overrides = {}) {
  // Lazily require React Native modules to avoid hard import failures in test
  let Platform, Dimensions;
  try {
    ({ Platform, Dimensions } = require('react-native'));
  } catch (_) {
    Platform = { OS: 'unknown' };
    Dimensions = { get: () => ({ width: 0, height: 0 }) };
  }

  const { width, height } = Dimensions.get('window');
  const os = Platform.OS;

  let platform = 'ios';
  if (os === 'android') platform = 'android';

  let timezone = 'UTC';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (_) {
    // fallback
  }

  const userAgent = overrides.userAgent || `DeferredLinkingSDK/1.0 (${os})`;

  return {
    userAgent,
    platform: overrides.platform || platform,
    language: overrides.language || 'en',
    screenWidth: overrides.screenWidth !== undefined ? overrides.screenWidth : width,
    screenHeight: overrides.screenHeight !== undefined ? overrides.screenHeight : height,
    timezone: overrides.timezone || timezone,
  };
}

module.exports = { getDeviceInfo };
