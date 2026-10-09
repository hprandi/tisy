import { JwtService } from '@nestjs/jwt';

export function tokenSignedWithAnotherSecret(): string {
  return new JwtService({ secret: 'another-secret' }).sign({
    sub: 'some-user-id',
    email: 'someone@test.com',
  });
}
