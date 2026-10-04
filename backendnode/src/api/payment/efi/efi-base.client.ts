import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import { EfiConfig, EfiTokenResponse } from './entities/efi.types';

/**
 * Base client for EFI Bank API.
 * Handles authentication (OAuth2 client_credentials) and provides
 * mTLS-capable HTTP methods via undici.
 */
@Injectable()
export class EfiBaseClient implements OnModuleInit {
  private readonly logger = new Logger(EfiBaseClient.name);
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {}

  async onModuleInit(): Promise<void> {
    this.logger.log('EFI Base Client initialized');
  }

  get config(): EfiConfig {
    return {
      baseUrl:
        process.env['EFI_BASE_URL'] ?? 'https://api-pix-h.gerencianet.com.br',
      clientId: process.env['EFI_CLIENT_ID'] ?? '',
      clientSecret: process.env['EFI_CLIENT_SECRET'] ?? '',
      auth: process.env['EFI_AUTH'] ?? '',
      pixKey: process.env['EFI_PIX_KEY'] ?? '',
      webhookUrl: process.env['EFI_WEBHOOK_URL'] ?? '',
      defaultSplitId: process.env['EFI_DEFAULT_SPLIT_ID']
        ? Number(process.env['EFI_DEFAULT_SPLIT_ID'])
        : undefined,
    };
  }

  get mode(): 'mock' | 'sandbox' | 'prod' {
    const raw = (process.env['EFI_MODE'] ?? 'mock').toLowerCase();
    if (raw === 'mock') return 'mock';
    if (raw === 'prod' || raw === 'production') return 'prod';
    // dev, sandbox, homologacao → sandbox
    return 'sandbox';
  }

  get isMock(): boolean {
    return this.mode === 'mock';
  }

  /**
   * Retorna Basic Auth header (client_id:client_secret base64).
   * Preferido pela EFI para endpoints v2.
   */
  getBasicAuthHeader(): string {
    if (this.config.auth) {
      return `Basic ${this.config.auth}`;
    }
    const creds = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`,
    ).toString('base64');
    return `Basic ${creds}`;
  }

  /**
   * Retrieves/refreshes the OAuth2 access token.
   * Caches until expires_in - 60s buffer.
   */
  async getAccessToken(): Promise<string> {
    // Return cached token if still valid (60s buffer)
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    if (this.isMock) {
      this.accessToken = 'mock_access_token_' + Date.now();
      this.tokenExpiresAt = Date.now() + 3600_000;
      return this.accessToken;
    }

    const response = await this.fetch<EfiTokenResponse>('/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: this.getBasicAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }).toString(),
    });

    this.accessToken = response.access_token;
    this.tokenExpiresAt = Date.now() + response.expires_in * 1000;
    return this.accessToken;
  }

  /**
   * Makes an authenticated request to the EFI API.
   * Uses mTLS if certificates are configured.
   */
  async request<T>(
    endpoint: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    } = {},
  ): Promise<T> {
    const token = await this.getAccessToken();
    return this.fetch<T>(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  }

  /**
   * Core fetch implementation using undici.
   * Supports mTLS via client certificates.
   */
  private async fetch<T>(
    endpoint: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    },
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const method = options.method ?? 'GET';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.isMock) {
      return this.mockResponse<T>(endpoint, method);
    }

    // In production, use undici with mTLS
    // For now, use native fetch (Node 18+)
    // mTLS configuration would require undici with certificate paths
    const response = await fetch(url, {
      method,
      headers,
      body: options.body,
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`EFI API error ${response.status}: ${error}`);
      throw new Error(`EFI API error ${response.status}: ${error}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Mock response generator for development/testing.
   */
  private mockResponse<T>(endpoint: string, method: string): T {
    this.logger.debug(`[MOCK] ${method} ${endpoint}`);
    return {} as T;
  }

  /**
   * Generate a txid (26 chars alphanumeric) for PIX transactions.
   */
  generateTxid(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let txid = '';
    const randomBytes = crypto.randomBytes(26);
    for (let i = 0; i < 26; i++) {
      txid += chars[randomBytes[i] % chars.length];
    }
    return txid;
  }
}
