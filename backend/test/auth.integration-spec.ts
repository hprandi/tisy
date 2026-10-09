describe('Auth (integration)', () => {
  // Given nobody is registered with an email
  // When they register, call GET /auth/me with the token and log in
  // Then both give a working token and /auth/me shows their data without the password
  it.todo('happy path: register, check /auth/me and log in');

  // Given an email registered with a password
  // When someone registers with that email again
  // Then 409, and the original password still works
  it.todo('registering a taken email is rejected');

  // Given a guest buyer who placed an order (account without password)
  // When they register with the same email
  // Then 201, the token is the order's buyer and the new password logs in
  // Note: name and document sent at registration are ignored (backlog: document mismatch)
  it.todo('a guest buyer claims their account by registering');

  // Table: wrong password | unknown email | guest account email
  // When someone logs in with each
  // Then 401 with the same message in every case
  it.todo('invalid credentials all get the same 401');

  // Table: no token | malformed token | token signed with another secret
  // When each is sent to GET /auth/me
  // Then 401
  it.todo('GET /auth/me rejects invalid tokens');

  // Table: invalid email | password under 8 characters | missing document number
  // When someone registers with each
  // Then 400 and no account is created
  it.todo('invalid registration data is rejected');
});
