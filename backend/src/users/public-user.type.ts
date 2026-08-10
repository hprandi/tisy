import type { User } from '@prisma/client';

/**
 * The subset of User fields that are safe to return outside UsersService.
 * Always excludes passwordHash — see the private raw fetchers in users.service.ts.
 */
export type PublicUser = Omit<User, 'passwordHash'>;
