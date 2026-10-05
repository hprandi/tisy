describe('Auth (integration)', () => {
  // Given nobody is registered with an email
  // When they register, request their profile with the returned token and log in with the same credentials
  // Then registration returns 201 with an access token, the profile shows their data
  //   without the password hash, and the login returns 200 with a working token
  it.todo(
    'happy path: a person registers, checks their profile and logs in again',
  );

  // Given an email already registered with a password
  // When someone registers with that email again
  // Then the response is 409 and the original account and password are unchanged
  it.todo('registering an email that already has a password is rejected');

  // Given a guest buyer who placed an order (their account has no password)
  // When they register with the same email
  // Then it is the same account (same user id, no duplicate), the password is set
  //   and their existing orders belong to the logged user
  // Note: today the name and document sent at registration are ignored and the
  //   account keeps the data from checkout (related to the document-mismatch backlog item)
  it.todo(
    'a guest buyer claims their account by registering with the same email',
  );

  // Table: wrong password | unknown email | email of a guest account without password
  // Given a registered account and a guest account
  // When someone logs in with each of those
  // Then every case gets 401 with the same message, so no account is revealed
  it.todo(
    'invalid credentials are rejected without revealing which accounts exist',
  );

  // Table: no token | malformed token | token signed with another secret
  // When each is used on GET /auth/me
  // Then every request gets 401
  it.todo('requests without a valid token are rejected');

  // Table: invalid email | password shorter than 8 characters | missing document
  // When the person registers
  // Then each request gets 400 and no account is created
  it.todo('invalid registration data is rejected');
});
