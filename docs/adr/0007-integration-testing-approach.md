# ADR-0007: Integration Testing Approach

## Status

Accepted (2026-10-09)

## Context

- The code still changes a lot, so tests must survive refactors.
- We want the most confidence per test run, not per test.
- The Mercado Pago sandbox is unreliable, so tests cannot depend on it.

## Decision

**Level and scope**
- Integration tests only, for now (no unit tests): `test/*.integration-spec.ts`, run with `npm run test:integration`.
- Real Nest app called over HTTP (supertest, in-process) and real Postgres (`ingressos_test`). Only external boundaries are faked: the payment provider, through our own `PaymentProvider` port (`FakePaymentProvider`).
- Files run serially (`maxWorkers: 1`), the database is truncated before every test, and migrations run in `pretest:integration`.

**What to test**
- One spec per flow. Each has one `happy path` journey plus tests of a single behavior each; `it.each` tables when only the input varies.
- Pick cases by risk: failures that are silent and costly (stock, idempotency, authorization) over trivial validation.
- The plan lives as `it.todo` with Given/When/Then and is replaced by real tests.

**How to write them**
- Given/When/Then comments sit inside the test body, above the lines they describe.
- Specs never import supertest, hold URLs or cast bodies: API clients (`AuthApi`, `EventsApi`, ...) return a typed `{ status, body }`.
- `useTestApp()` boots the app and resets the database; its context exposes the clients, prisma and the fake provider.
- Input data comes from builders (`aPerson`, `anEvent`, ...) with overrides; database preconditions from fixtures (`seedEventOnSale`, ...).

**Setup rules**
- What the test verifies goes through the endpoint. Any other Given uses the cheapest means (database seed), unless seeding would duplicate business logic (password hashing, stock reservation): then use the endpoint.
- The happy path uses real endpoints end to end, with one documented shortcut (opening the sales window).
- Assert a status in `expect` only when it is part of the behavior; guard a precondition only when its failure could make the test pass by mistake.
- State with no endpoint (order status, stock) is read from the database through named helpers.

**Trust the tests**
- Break the guarded production code on purpose and confirm a test fails. 