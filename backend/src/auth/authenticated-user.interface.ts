/**
 * Shape of `req.user`, as returned by JwtStrategy.validate().
 * Distinct from JwtPayload (the raw token contents) — this is what the
 * rest of the application actually works with after authentication.
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
}
