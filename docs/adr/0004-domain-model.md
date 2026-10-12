# Domain Model — MVP

This document consolidates the domain model defined for the MVP of the ticket platform, discussed based on decisions recorded in `docs/adr/0001-initial-architectural-decisions.md` and `docs/pdr/0001-project-operation-model.md`. Unlike an ADR/PDR, this document is living — it should be updated as the model evolves, rather than generating a new record with each minor adjustment.

## Entities

### User

Shared identity between organizers and buyers — there is no fixed role (`role`) on the account; the status of organizer is implicit by having created at least one `Event`.

| Field | Type | Required | Note |
|---|---|---|---|
| id | uuid | yes | |
| name | string | yes | |
| email | string | yes | unique; lookup key to recognize recurring buyer |
| documentType | enum (CPF, PASSPORT, OTHER) | yes | `OTHER` covers unforeseen cases (e.g., RNE of foreign resident) |
| documentNumber | string | yes | format/check-digit validation applies only when `documentType = CPF` |
| passwordHash | string | no | null until the person "claims" the account by setting a password; passwordless accounts cannot authenticate via login |
| createdAt | datetime | yes | |

### Event

| Field | Type | Required | Note |
|---|---|---|---|
| id | uuid | yes | |
| organizerId | uuid (→ User.id) | yes | |
| title | string | yes | |
| description | text | no | |
| location | string | yes | |
| startDate | datetime | yes | |
| endDate | datetime | yes | |
| status | enum (draft, published, cancelled, finished) | yes | |
| createdAt / updatedAt | datetime | yes | |

### TicketTier

Sellable unit within an event — combines what would be "category" (e.g., VIP, Floor, Half-price) and "batch" (sales window with its own price/quantity) into a single entity, by deliberate simplicity decision (see "Naming Decisions" section below).

| Field | Type | Required | Note |
|---|---|---|---|
| id | uuid | yes | |
| eventId | uuid (→ Event.id) | yes | |
| name | string | yes | e.g.: "1st batch", "VIP", "Half-price" |
| price | decimal | yes | current catalog price — may change over time |
| quantityTotal | int | yes | |
| salesStartAt / salesEndAt | datetime | yes | `salesEndAt` must not be after the event's `endDate`; `salesStartAt` must be in the present or future at creation time |
| status | enum (active, sold_out, closed) | yes | |

### Order

| Field | Type | Required | Note |
|---|---|---|---|
| id | uuid | yes | |
| eventId | uuid (→ Event.id) | yes | |
| buyerId | uuid (→ User.id) | yes | resolved via `buyerType` at checkout: `"me"` uses the identity from a valid JWT (never trusted from the request body); `"new"` looks up by email, creating a passwordless `User` if none exists |
| totalAmount | decimal | yes | |
| status | enum (pending, paid, expired, cancelled, refunded) | yes | |
| paymentProvider | string | no | filled after payment starts |
| paymentExternalId | string | no | provider id (Pagar.me/Mercado Pago/Asaas, to be decided) |
| expiresAt | datetime | yes | defines the reservation window before automatic stock release |
| createdAt / paidAt | datetime | yes / no | |

Note: buyer data (name, email, document) is **not** duplicated here — it stays only in `User`, referenced via `buyerId`. This is a deliberately different choice from the price rule (see `OrderItem.unitPrice` below): buyer identity reflects the current state of `User` (if they correct a typo in the name, old orders "inherit" the correction), while price must be frozen at the moment of purchase for financial/accounting reasons.

### OrderItem

| Field | Type | Required | Note |
|---|---|---|---|
| id | uuid | yes | |
| orderId | uuid (→ Order.id) | yes | |
| ticketTierId | uuid (→ TicketTier.id) | yes | |
| unitPrice | decimal | yes | **snapshot** of the price at the moment of purchase — does not derive from the current price of `TicketTier`, which may change later |
| quantity | int | yes | |

### Ticket

| Field | Type | Required | Note |
|---|---|---|---|
| id | uuid | yes | |
| orderItemId | uuid (→ OrderItem.id) | yes | one `Ticket` per unit purchased, created when the order is paid; the tier comes from the item |
| code | string | yes | unique and non-guessable token (128 random bits, base64url, 22 characters) — what the QR code carries; separate from `id` so it can be replaced without changing the ticket |
| holderName | string | no | the person who will enter; null until the ticket is named |
| holderEmail | string | no | where to send the ticket to that person; optional even when named |
| status | enum (issued, ready, checked_in, cancelled) | yes | `issued` = created on payment, no holder yet; `ready` = has a holder (`holderName` is set), valid for entry; `checked_in` = already used; `cancelled` |
| checkedInAt | datetime | no | |

## Relationships

```
User 1──N Event (organizerId)
Event 1──N TicketTier
Event 1──N Order
User 1──N Order (buyerId)
Order 1──N OrderItem
TicketTier 1──N OrderItem
OrderItem 1──N Ticket
```

## Invariants and Business Rules

**Reservation without overselling** — when creating an `Order`, checking and decrementing available quantity in `TicketTier` happens via a single conditional `UPDATE` (`WHERE quantityAvailable >= qty`), relying on PostgreSQL's native row-level write atomicity — not `SELECT ... FOR UPDATE`, which Prisma's API doesn't support (see ADR-0003).

**Buyer identity is never taken from the request body** — `buyerType: "me"` resolves the buyer from the authenticated request's JWT; a raw user ID supplied by the client is never trusted (would allow impersonating another account). `buyerType: "new"` requires full buyer info (`name`, `email`, `documentType`, `documentNumber`) to create or reuse a passwordless account.

**Reservation expiration** — every pending `Order` has `expiresAt`, but automatic release of stock held by expired pending orders is not yet implemented (see backlog in `ai/action_plan.md`) — until then, abandoned checkouts permanently reduce `quantityAvailable`.

**Tickets are issued on payment and named afterwards** — when an `Order` goes `PENDING → PAID`, one `Ticket` per unit purchased is created in the same transaction, and only if that update affected a row, so a repeated payment notification creates nothing. The buyer then names each ticket with a conditional `UPDATE` (`WHERE id = ? AND orderId = ? AND status = 'issued'`), so a ticket is named once. Only `ready` tickets are valid for entry, and a `ready` ticket always has a `holderName`; renaming or reassigning a named ticket is a later evolution.

**Atomic check-in** — reading the QR code updates the `Ticket` with `UPDATE ... WHERE status = 'ready'`, preventing two simultaneous reads from validating the same ticket twice and rejecting tickets that have no holder yet.

**Frozen price per order** — `OrderItem.unitPrice` is always a copy of the price at the moment of purchase, never a reference to the current price of `TicketTier`.

**Flexible document** — `documentType`/`documentNumber` accept CPF, passport, or other; format validation applies only to CPF.

**Passwordless accounts do not authenticate** — null `User.passwordHash` blocks login; the person must go through a "claim account" flow (to be defined) before being able to log in.

## Naming Decisions

`TicketTier` was chosen for the sellable unit entity, rather than `TicketType` (imprecise — suggested "type" when the concept is broader). Alternatives considered: `TicketBatch` (focus on batch/inventory), `TicketClass` (term used by Eventbrite API), `TicketVariant` (e-commerce/catalog vocabulary), `PriceTier` (pricing focus only), `AdmissionType` (focus on what the person gains by buying). Can be revisited without high cost, since it's just a class/table name.

`User` was chosen instead of separate `Organizer` — reason: the same person can organize and buy at the same time, so a fixed role (`role`) would be incorrect modeling.

## Implementation Notes (Do Not Block the Model, But Worth Remembering Later)

- Uniqueness of `documentNumber` across different `User`s is not currently guaranteed (could allow the same document registered under different emails) — evaluate if it's worth adding validation/alert in the future.
- A denormalized `eventId` field directly on `Ticket` might be worthwhile for check-in query performance (avoids join to `Order`/`Event` with each QR read) — decide at implementation time, not a structural change to the model.
