/**
 * Shape of the data encoded inside the JWT payload.
 * `sub` (subject) is the JWT-standard claim name for "who this token belongs to".
 */
export interface JwtPayload {
  sub: string;
  email: string;
}
