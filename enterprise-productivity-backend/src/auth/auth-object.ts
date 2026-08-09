/**
 * Shape of the auth object attached to a request after `JwtAuthGuard` has
 * verified a signed-in session token. `userId` is the account's username,
 * which is the same value the rest of the application uses to reference users.
 */
export interface AuthObject {
  userId: string;
  sessionId?: string;
  orgId?: string;
}