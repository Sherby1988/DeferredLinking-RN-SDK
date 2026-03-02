'use strict';

class ApiClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  async _request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-Api-Key': this.apiKey,
      ...(options.headers || {}),
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`API error ${response.status}: ${body}`);
    }

    return response.json();
  }

  async createLink(options) {
    const body = {
      deep_link_uri: options.deepLinkUri,
      fallback_url: options.fallbackUrl || null,
      og_title: options.ogTitle || null,
      og_description: options.ogDescription || null,
      og_image_url: options.ogImageUrl || null,
      expires_at: options.expiresAt || null,
    };

    const raw = await this._request('/api/links', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return {
      link: this._mapLink(raw.link),
      shortUrl: raw.short_url,
    };
  }

  async listLinks(page = 1) {
    const raw = await this._request(`/api/links?page=${page}`);
    return {
      data: raw.data.map((l) => this._mapLink(l)),
      total: raw.total,
      perPage: raw.per_page,
      currentPage: raw.current_page,
      lastPage: raw.last_page,
    };
  }

  async getLink(shortCode) {
    const raw = await this._request(`/api/links/${shortCode}`);
    return { link: this._mapLink(raw.link), shortUrl: raw.short_url };
  }

  async deleteLink(shortCode) {
    await this._request(`/api/links/${shortCode}`, { method: 'DELETE' });
  }

  async getLinkAnalytics(shortCode) {
    const raw = await this._request(`/api/links/${shortCode}/analytics`);
    return {
      link: this._mapLink(raw.link),
      totalClicks: raw.total_clicks,
      byPlatform: raw.by_platform,
      clicksByDay: raw.clicks_by_day,
    };
  }

  async getAnalyticsSummary() {
    const raw = await this._request('/api/analytics/summary');
    return {
      totalLinks: raw.total_links,
      totalClicks: raw.total_clicks,
      byPlatform: raw.by_platform,
      topLinks: raw.top_links,
      clicksLast7Days: raw.clicks_last_7_days,
    };
  }

  async resolveDeferred(deviceInfo) {
    const body = {
      user_agent: deviceInfo.userAgent,
      platform: deviceInfo.platform,
      language: deviceInfo.language,
      screen_width: deviceInfo.screenWidth,
      screen_height: deviceInfo.screenHeight,
      timezone: deviceInfo.timezone,
    };

    const raw = await this._request('/api/deferred/resolve', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!raw.matched) {
      return { matched: false };
    }

    return {
      matched: true,
      deepLinkUri: raw.deep_link_uri,
      shortCode: raw.short_code,
      linkId: raw.link_id,
    };
  }

  _mapLink(raw) {
    return {
      id: raw.id,
      appId: raw.app_id,
      shortCode: raw.short_code,
      deepLinkUri: raw.deep_link_uri,
      fallbackUrl: raw.fallback_url || null,
      ogTitle: raw.og_title || null,
      ogDescription: raw.og_description || null,
      ogImageUrl: raw.og_image_url || null,
      expiresAt: raw.expires_at || null,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }
}

module.exports = { ApiClient };
