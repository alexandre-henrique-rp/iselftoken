import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { isIP } from 'node:net';

export type ClientIpClass =
  | 'PUBLIC'
  | 'LOOPBACK'
  | 'PRIVATE'
  | 'RESERVED'
  | 'INVALID'
  | 'MISSING';

export interface TrustedClientContext {
  ip: string | null;
  ipClass: ClientIpClass;
  environment: string;
  proxyChainTrusted: boolean;
}

function normalizeIp(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const candidate = value.trim().replace(/^\[|\]$/g, '');
  if (!candidate) return null;
  const mapped = candidate.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  return mapped ? mapped[1] : candidate;
}

function ipv4Parts(ip: string): number[] | null {
  const parts = ip.split('.').map(Number);
  return parts.length === 4 &&
    parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
    ? parts
    : null;
}

function ipv6ToBigInt(ip: string): bigint | null {
  const value = ip.toLowerCase().split('%')[0];
  if (value.includes('.')) return null;
  const sections = value.split('::');
  if (sections.length > 2) return null;
  const left = sections[0] ? sections[0].split(':').filter(Boolean) : [];
  const right = sections[1] ? sections[1].split(':').filter(Boolean) : [];
  if (
    left.length + right.length > 8 ||
    [...left, ...right].some((part) => !/^[0-9a-f]{1,4}$/.test(part))
  )
    return null;
  const groups =
    sections.length === 2
      ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right]
      : left;
  if (groups.length !== 8) return null;
  return groups.reduce(
    (result, group) => (result << 16n) | BigInt(`0x${group}`),
    0n,
  );
}

function inIpv6Range(ip: string, prefix: bigint, bits: number): boolean {
  const value = ipv6ToBigInt(ip);
  if (value === null) return false;
  const shift = 128n - BigInt(bits);
  return value >> shift === prefix >> shift;
}

export function classifyClientIp(ip: string | null): ClientIpClass {
  if (!ip) return 'MISSING';
  const version = isIP(ip);
  if (!version) return 'INVALID';

  if (version === 4) {
    const parts = ipv4Parts(ip);
    if (!parts) return 'INVALID';
    const [a, b] = parts;
    if (a === 127) return 'LOOPBACK';
    if (
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    )
      return 'PRIVATE';
    if (a === 100 && b >= 64 && b <= 127) return 'PRIVATE';
    if (a === 169 && b === 254) return 'PRIVATE';
    if (
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 203 && b === 0)
    )
      return 'RESERVED';
    if (
      (a === 192 && b === 0 && parts[2] === 2) ||
      (a === 198 && b === 51 && parts[2] === 100) ||
      (a === 203 && b === 0 && parts[2] === 113)
    )
      return 'RESERVED';
    if (a === 0 || a >= 224) return 'RESERVED';
    return 'PUBLIC';
  }

  if (ip === '::1') return 'LOOPBACK';
  if (ip === '::') return 'RESERVED';
  if (inIpv6Range(ip, 0xfc000000000000000000000000000000n, 7)) return 'PRIVATE';
  if (inIpv6Range(ip, 0xfe800000000000000000000000000000n, 10))
    return 'PRIVATE';
  if (inIpv6Range(ip, 0x20010db8000000000000000000000000n, 32))
    return 'RESERVED';
  if (inIpv6Range(ip, 0x20010000000000000000000000000000n, 32)) return 'PUBLIC';
  return 'PUBLIC';
}

@Injectable()
export class TrustedClientContextResolver {
  resolve(req?: Request): TrustedClientContext {
    const request = req as
      | (Request & { socket?: { remoteAddress?: string } })
      | undefined;
    const rawIp = request?.ip || request?.socket?.remoteAddress || null;
    const ip = normalizeIp(rawIp);
    return {
      ip,
      ipClass: classifyClientIp(ip),
      environment: process.env.NODE_ENV || 'development',
      // Express has already applied its trust-proxy policy before exposing req.ip.
      // We never inspect or trust raw forwarding headers here.
      proxyChainTrusted: Boolean(request?.ip),
    };
  }
}
