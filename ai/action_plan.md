# Action Plan — Path to MVP

Roadmap only — no design decisions locked in here. Each step gets discussed in detail when we pick it up. See `docs/pdr/0001-project-operation-model.md` (D4) for MVP scope and `docs/adr/0004-domain-model.md` for the domain.

## Next

1. ~~**Manage event** — `GET /events`, `GET /events/:id`, `PATCH /events/:id`. Introduces resource-ownership authorization (organizer-only).~~ Done.
2. ~~**Ticket tiers** — `POST/GET/PATCH /events/:id/ticket-tiers`.~~ Done.
3. ~~**Publish event** — `POST /events/:id/publish`, `DRAFT → PUBLISHED`.~~ Done.
4. ~~**Public read access** — unauthenticated visibility for published events/tiers.~~ Done. Same endpoint (`GET /events/:id`) for owner and public, via `OptionalJwtAuthGuard` — not a separate `/public` route (see discussion).
5. ~~**Create order (reservation)** — `POST /events/:id/orders`, buyer identified by email, no login. First unauthenticated write endpoint.~~ Done. Buyer identified via `buyerType: "me"` (JWT) or `"new"` (email lookup/create) — never a raw client-supplied user ID. Atomic conditional `UPDATE` prevents overselling.
6. **Payment (Pix/card)** — pick a provider (open since ADR-0001/D5), start a charge.
7. **Payment webhook + ticket issuance** — confirm payment, generate `Ticket` + QR code, email delivery.
8. **Check-in** — validate and consume a ticket by QR code.

## Backlog

- **Reclaim stock from expired pending orders** — when reserving tickets (step 5) fails due to insufficient `quantityAvailable`, check whether any `PENDING` orders for that tier have passed their `expiresAt` and reclaim their reserved quantity before failing for real. Deferred: without it, abandoned checkouts permanently shrink available stock (no automatic recovery) — acceptable risk for a small test event, revisit if it becomes a real problem.

- **Mismatched document on guest checkout (`buyerType: "new"`)** — `UsersService.findOrCreateBuyer()` looks up the existing `User` by email only; if found, it's reused as-is, and any `documentType`/`documentNumber` submitted in *this* purchase that differs from what's already on file is silently ignored (not validated, not updated). Undefined what should happen: reject the order, update the stored document, keep the original, or just flag for manual review. Needs a product decision before it matters (fraud/identity-mixup risk grows with real transaction volume).