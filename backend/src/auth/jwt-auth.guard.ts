import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Protects a route with the "jwt" strategy registered in JwtStrategy.
 * Usage: @UseGuards(JwtAuthGuard) on a controller or route handler.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
