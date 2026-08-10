# Action Plan — Path to MVP

Roadmap only — no design decisions locked in here. Each step gets discussed in detail when we pick it up. See `docs/pdr/0001-project-operation-model.md` (D4) for MVP scope and `docs/adr/0004-domain-model.md` for the domain.

## Next

1. **Manage event** — `GET /events`, `GET /events/:id`, `PATCH /events/:id`. Introduces resource-ownership authorization (organizer-only).
2. **Ticket tiers** — `POST/GET/PATCH /events/:id/ticket-tiers`.
3. **Publish event** — `POST /events/:id/publish`, `DRAFT → PUBLISHED`.
4. **Public read access** — unauthenticated visibility for published events/tiers.
5. **Create order (reservation)** — `POST /events/:id/orders`, buyer identified by email, no login. First unauthenticated write endpoint.
6. **Payment (Pix/card)** — pick a provider (open since ADR-0001/D5), start a charge.
7. **Payment webhook + ticket issuance** — confirm payment, generate `Ticket` + QR code, email delivery.
8. **Check-in** — validate and consume a ticket by QR code.