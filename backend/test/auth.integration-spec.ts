import {
  aGuestBuyer,
  aPerson,
  type Credentials,
  type Person,
} from './helpers/builders';
import {
  countAccounts,
  createGuestAccount,
  seedEventOnSale,
} from './helpers/fixtures';
import { tokenSignedWithAnotherSecret } from './helpers/tokens';
import { useTestApp } from './helpers/test-app';

describe('Auth (integration)', () => {
  const ctx = useTestApp();

  it('happy path: register, check /auth/me and log in', async () => {
    // Given nobody is registered with an email
    const person = aPerson();

    // When they register, call GET /auth/me with the token and log in
    const registration = await ctx.auth.register(person);
    const afterRegistration = await ctx.auth.me(registration.body.accessToken);
    const login = await ctx.auth.login(person);
    const afterLogin = await ctx.auth.me(login.body.accessToken);

    // Then both give a working token and /auth/me shows their data without the password
    expect(registration.status).toBe(201);
    expect(login.status).toBe(200);
    expect(afterRegistration.body).toMatchObject({
      email: person.email,
      name: person.name,
    });
    expect(afterRegistration.body).not.toHaveProperty('passwordHash');
    expect(afterLogin.status).toBe(200);
  });

  it('registering a taken email is rejected', async () => {
    // Given an email registered with a password
    const member = aPerson();
    await ctx.auth.register(member);

    // When someone registers with that email again
    const again = await ctx.auth.register({
      ...member,
      password: 'another-password',
    });

    // Then 409, and the original password still works
    expect(again.status).toBe(409);
    expect((await ctx.auth.login(member)).status).toBe(200);
  });

  // Note: name and document sent at registration are ignored (backlog: document mismatch)
  it('a guest buyer claims their account by registering', async () => {
    // Given a guest buyer who placed an order (account without password)
    const { eventId, tierId } = await seedEventOnSale(ctx.prisma);
    const buyer = aGuestBuyer();
    const order = await ctx.orders.createAsGuest({
      eventId,
      buyer,
      items: [{ ticketTierId: tierId, quantity: 1 }],
    });

    // When they register with the same email
    const person = aPerson({ email: buyer.email });
    const registration = await ctx.auth.register(person);
    const me = await ctx.auth.me(registration.body.accessToken);
    const login = await ctx.auth.login(person);

    // Then 201, the token is the order's buyer and the new password logs in
    expect(registration.status).toBe(201);
    expect(me.body.id).toBe(order.body.buyerId);
    expect(login.status).toBe(200);
  });

  // Table: wrong password | unknown email | guest account email
  describe('invalid credentials', () => {
    type Accounts = { member: Person; guest: { email: string } };

    it.each<[string, (accounts: Accounts) => Credentials]>([
      [
        'a wrong password',
        ({ member }) => ({ email: member.email, password: 'wrong-password' }),
      ],
      [
        'an unknown email',
        () => ({ email: 'nobody@test.com', password: 'Password123!' }),
      ],
      [
        'a guest account email',
        ({ guest }) => ({ email: guest.email, password: 'Password123!' }),
      ],
    ])('%s gets the same 401', async (_case, credentialsFor) => {
      // Given a registered member and a guest account
      const member = aPerson();
      expect((await ctx.auth.register(member)).status).toBe(201);
      const guest = await createGuestAccount(ctx.prisma);

      // When someone logs in with each of those credentials
      const result = await ctx.auth.login(credentialsFor({ member, guest }));

      // Then 401 with the same message in every case
      expect(result.status).toBe(401);
      expect(result.body).toMatchObject({
        message: 'Invalid email or password.',
      });
    });
  });

  // Table: no token | malformed token | token signed with another secret
  describe('GET /auth/me', () => {
    it.each<[string, () => string | undefined]>([
      ['no token', () => undefined],
      ['a malformed token', () => 'not-a-jwt'],
      ['a token signed with another secret', tokenSignedWithAnotherSecret],
    ])('rejects %s', async (_case, token) => {
      // When it is sent to GET /auth/me
      const result = await ctx.auth.me(token());

      // Then 401
      expect(result.status).toBe(401);
    });
  });

  // Table: invalid email | password under 8 characters | missing document number
  describe('invalid registration data', () => {
    it.each<[string, Partial<Person>]>([
      ['an invalid email', { email: 'not-an-email' }],
      ['a password under 8 characters', { password: 'short' }],
      ['a missing document number', { documentNumber: '' }],
    ])('%s is rejected', async (_case, invalid) => {
      // When someone registers with it
      const result = await ctx.auth.register(aPerson(invalid));

      // Then 400 and no account is created
      expect(result.status).toBe(400);
      expect(await countAccounts(ctx.prisma)).toBe(0);
    });
  });
});
