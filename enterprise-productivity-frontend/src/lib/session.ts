/**
 * Shared session constants used by both the client auth provider and the
 * server-side proxy / server components. Keep this file free of server-only
 * or client-only imports so it can be imported from either environment.
 */

export const SESSION_COOKIE = 'ep_session';
export const TOKEN_STORAGE_KEY = 'ep_session_token';

/**
 * Extracts the `ep_session` token from the value supplied by the request
 * cookies API (`cookies().get('ep_session').value`), which is the bare cookie
 * value. A raw `Cookie` header or a `name=value` chunk is also accepted for
 * robustness, so this works whether the caller passes a decoded value or the
 * full header string.
 */
export function readTokenCookie(input: string | null | undefined): string | null {
  if (!input) return null;
  const prefix = `${SESSION_COOKIE}=`;
  let value = input.trim();

  if (value.startsWith(prefix)) {
    value = value.slice(prefix.length);
  } else {
    const named = value
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix));
    if (named) value = named.slice(prefix.length);
  }

  if (!value) return null;
  try {
    return decodeURIComponent(value) || null;
  } catch {
    return value || null;
  }
}

/** Decodes a JWT payload without verifying the signature. */
export function decodeJwtPayload(token: string): { sub?: string; username?: string } | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    );
    return JSON.parse(json) as { sub?: string; username?: string };
  } catch {
    return null;
  }
}