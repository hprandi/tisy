# ADR-0005: Minimal Authentication for MVP

## Status

Accepted (2026-08-06)

## Context

The domain model (`docs/adr/0004-domain-model.md`) defines `Event.organizerId` as a reference to `User.id`, but leaves open how a `User` is created and authenticated — the document itself marks the "claim account" flow as *to be defined*. Without this decision, no domain endpoint (e.g., create event) can be implemented properly, since all depend on identifying the authenticated organizer.

The domain model also establishes a relevant particularity: a `User` can exist **without a password** (`passwordHash` null), created implicitly as a buyer during a future checkout. This means that "registering" an account is not necessarily "creating a `User` from scratch" — it can be "adding a password to an already-existing `User`".

Project constraints that apply here (ADR-0001): solo development, 5-10 hours per week, minimize simultaneous learning axes, and deliberately simple initial infrastructure (no third-party managed auth services or additional stores like Redis).

## Decision

Adopt **stateless JWT** as the authentication mechanism, via `@nestjs/jwt` + `@nestjs/passport` (`passport-jwt`), with password hashed by `bcrypt`.

Module structure, following the domain-based organization already established in ADR-0002:

- `UsersModule` — owns the `User` entity (creation, email lookup, "claim account" rule).
- `AuthModule` — orchestrates authentication; depends on `UsersModule`, not the other way around.

`AuthService` exposes two internal methods with single responsibility:

- `login(email, password)` — validates credentials and issues the JWT.
- `register(data)` — creates or claims the `User` and, at the end, calls `login` internally — that is, the registration endpoint does **auto-login**, returning the token already in the response from `POST /auth/register`, rather than requiring a separate call to `/auth/login`. Rationale: it is the expected pattern in signups today, and the implementation cost is low, since token issuance is not duplicated.

Account creation/claim rule (`register`), resolving the gap in the domain-model:

- email does not exist → creates new `User` with `passwordHash`.
- email exists and `passwordHash` is null → claims the existing account, sets the password on it (same `User`, no duplicate record).
- email exists and `passwordHash` already filled → `409 Conflict`.

JWT payload: `{ sub: userId, email, iat, exp }`. Fixed expiration of **7 days**. No refresh token at this phase — when it expires, the person logs in again.

Protected by mandatory HTTPS in the infrastructure (already covered by ADR-0001/D4, managed platforms offer TLS by default); token must never be logged.

Outside the scope of this decision, deliberately deferred: refresh token / rotation, token revocation before expiration (would require blocklist or stateful session), email verification, "forgot password", login rate limiting, and where the front-end stores the token (`localStorage` vs `httpOnly` cookie) — the latter is reserved for the front-end ADR, when the attack surface (XSS/CSRF) can be evaluated together with the chosen stack.

## Alternatives Considered and Rejected

**Session with cookie + server-side store (e.g., Redis)** — rejected for adding a new infrastructure piece (session store) contrary to ADR-0001/D4, which keeps initial infrastructure deliberately simple. Stateless JWT requires no additional session storage.

**Managed auth provider (Auth0, Clerk, Supabase Auth, etc.)** — rejected for now: it would reduce hands-on auth learning (part of the project's career goal), introduces external dependency and cost too early, and is disproportionate to the scope of a solo MVP. Can be revisited if the project grows and authentication ceases to be a relevant learning differentiator.

**Refresh token from the start** — deferred. For the expected MVP usage (single organizer, small test event), re-authenticating every 7 days is an acceptable UX cost against the added complexity of implementing secure refresh token rotation.

## Consequences

Positive: unblocks the implementation of domain endpoints that depend on an identified organizer; stateless model requires no additional infrastructure, aligned with ADR-0001/D4; the "claim account" rule concretely resolves the gap left open in the domain-model; separation of `login`/`register` internals in `AuthService` maintains single responsibility even with auto-login in registration response.

Negative/trade-offs: a leaked token remains valid until expiration — there is no revocation mechanism at this phase; 7-day expiration is a middle ground chosen by the absence of refresh token, and should be revisited if the project begins handling more sensitive data/values before the real test event; the decision of where the front-end stores the token is pending for when the front-end stack is implemented.
