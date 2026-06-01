/**
 * Detect the public origin (scheme + host) that the user is currently using,
 * taking proxy headers into account. Falls back to the request URL itself.
 */
import { NextRequest } from 'next/server';

export function getPublicOrigin(req: NextRequest): string {
  const headers = req.headers;

  // Try standard proxy headers first
  const forwardedHost =
    headers.get('x-forwarded-host') ||
    headers.get('x-original-host') ||
    headers.get('host');

  // Prefer x-client-proto (set by sandbox gateway) over x-forwarded-proto
  // because some proxies set the latter incorrectly.
  const forwardedProto =
    headers.get('x-client-proto') ||
    headers.get('x-forwarded-proto') ||
    headers.get('x-forwarded-protocol');

  if (forwardedHost) {
    // Sandbox URLs (e.g. *.sandbox.novita.ai, *.e2b.dev) are always served over HTTPS
    const isSandboxHost =
      /\.(sandbox\.novita\.ai|e2b\.dev|genspark\.ai)$/i.test(forwardedHost);
    // If host is a sandbox/known HTTPS host, force https regardless of header
    const proto = isSandboxHost
      ? 'https'
      : forwardedProto || 'http';
    return `${proto}://${forwardedHost}`;
  }

  // Fallback: parse request URL (works when no proxy is involved)
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export function getRedirectUri(req: NextRequest): string {
  if (process.env.THREADS_REDIRECT_URI) return process.env.THREADS_REDIRECT_URI;
  return `${getPublicOrigin(req)}/api/auth/threads/callback`;
}
