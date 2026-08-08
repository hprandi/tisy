import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from './authenticated-user.interface';
import { JwtPayload } from './jwt-payload.interface';

/**
 * Registers the "jwt" Passport strategy: extracts the bearer token from the
 * `Authorization` header, verifies its signature/expiration against JWT_SECRET,
 * and — if valid — calls `validate()` with the decoded payload.
 * Whatever `validate()` returns becomes `req.user` in the route handler.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    // No database lookup here on purpose: the token signature already proves
    // authenticity, so we trust the payload as-is for now. If we later need
    // to check live account state (e.g. banned/deleted users), this is where
    // a UsersService lookup would go.
    return { userId: payload.sub, email: payload.email };
  }
}
