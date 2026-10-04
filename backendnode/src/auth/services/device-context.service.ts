import { Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';

export interface NormalizedDevice {
  label: string;
  browser: string;
  operatingSystem: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown';
  hash: string;
}

@Injectable()
export class DeviceContextService {
  normalize(userAgent: string | null | undefined): NormalizedDevice {
    const raw = typeof userAgent === 'string' ? userAgent.slice(0, 512) : '';
    const value = raw.toLowerCase();
    const browser = value.includes('edg/')
      ? 'Edge'
      : value.includes('chrome/') && !value.includes('chromium')
        ? 'Chrome'
        : value.includes('firefox/')
          ? 'Firefox'
          : value.includes('safari/') && !value.includes('chrome/')
            ? 'Safari'
            : value.includes('opr/')
              ? 'Opera'
              : value.includes('curl/') ||
                  value.includes('bot') ||
                  value.includes('spider')
                ? 'Bot'
                : 'Navegador não identificado';
    const operatingSystem = value.includes('windows')
      ? 'Windows'
      : value.includes('android')
        ? 'Android'
        : value.includes('iphone') ||
            value.includes('ipad') ||
            value.includes('ios')
          ? 'iOS'
          : value.includes('mac os') || value.includes('macintosh')
            ? 'macOS'
            : value.includes('linux')
              ? 'Linux'
              : 'Sistema não identificado';
    const deviceType =
      value.includes('bot') ||
      value.includes('spider') ||
      value.includes('curl/')
        ? 'bot'
        : value.includes('ipad') || value.includes('tablet')
          ? 'tablet'
          : value.includes('mobile') ||
              value.includes('iphone') ||
              value.includes('android')
            ? 'mobile'
            : raw
              ? 'desktop'
              : 'unknown';
    const label =
      !raw ||
      browser === 'Bot' ||
      browser === 'Navegador não identificado' ||
      operatingSystem === 'Sistema não identificado'
        ? browser === 'Bot'
          ? 'Bot ou automação'
          : 'Dispositivo não identificado'
        : `${browser} no ${operatingSystem}`;
    return {
      label: label.slice(0, 80),
      browser,
      operatingSystem,
      deviceType,
      hash: crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32),
    };
  }
}
