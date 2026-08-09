import { cookies } from 'next/headers';
import { readTokenCookie, decodeJwtPayload } from './session';

/**
 * Server-side auth helper mirroring the shape of the Clerk `auth()` helper:
 *
 *   const { userId } = await auth();
 *
 * The session is the same JWT that the client stores in the `ep_session`
 * cookie. Requests themselves are authorized by the backend API, so here we
 * only read the cookie value (and, defensively, attempt to decode the payload)
 * to drive redirects and server-side rendering decisions.
 */
export async function auth(): Promise<{ userId: string | null }> {
  const store = await cookies();
  const raw = store.get('ep_session')?.value ?? null;
  const token = readTokenCookie(raw);

  if (!token) return { userId: null };

  const payload = decodeJwtPayload(token);
  const userId = payload?.sub ?? null;

  return { userId };
}

export { SESSION_COOKIE } from './session';