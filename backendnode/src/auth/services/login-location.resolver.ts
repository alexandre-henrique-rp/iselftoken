import { Injectable } from '@nestjs/common';

export type LoginLocationSource = 'UNAVAILABLE';

export interface ResolvedLoginLocation {
  source: LoginLocationSource;
  precision: 'UNAVAILABLE';
  country: string | null;
  city: string | null;
  region: string | null;
  latitudeRounded: number | null;
  longitudeRounded: number | null;
  timezone: string | null;
  org: string | null;
  hostname: string | null;
  accuracyBucketMeters: null;
}

@Injectable()
export class LoginLocationResolver {
  async resolve(): Promise<{ location: ResolvedLoginLocation; geo: null }> {
    return {
      geo: null,
      location: {
        source: 'UNAVAILABLE',
        precision: 'UNAVAILABLE',
        country: null,
        city: null,
        region: null,
        latitudeRounded: null,
        longitudeRounded: null,
        timezone: null,
        org: null,
        hostname: null,
        accuracyBucketMeters: null,
      },
    };
  }
}
