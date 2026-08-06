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
| salesStartAt / salesEndAt | datetime | no | |
| status | enum (active, sold_out, closed) | yes | |

### Order

| Field | Type | Required | Note |
|---|---|---|---|
| id | uuid | yes | |
| eventId | uuid (→ Event.id) | yes | |
| buyerId | uuid (→ User.id) | yes | resolved by email at checkout — creates new `User` (passwordless) if it doesn't exist |
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
| orderItemId | uuid (→ OrderItem.id) | yes | one `Ticket` per unit purchased |
| code | string | yes | unique and non-guessable token (UUID or signed) — used in QR code |
| status | enum (issued, checked_in, cancelled) | yes | |
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

**Reservation without overselling** — when creating an `Order`, checking and decrementing available quantity in `TicketTier` happens within a transaction with `SELECT ... FOR UPDATE`, avoiding a race between simultaneous buyers.

**Reservation expiration** — every pending `Order` has `expiresAt`; release of reserved stock is checked lazily (when querying availability, ignores already-expired pending orders), without requiring a scheduled job in the MVP.

**Atomic check-in** — reading the QR code updates the `Ticket` with `UPDATE ... WHERE status = 'issued'`, preventing two simultaneous reads from validating the same ticket twice.

**Frozen price per order** — `OrderItem.unitPrice` is always a copy of the price at the moment of purchase, never a reference to the current price of `TicketTier`.

**Flexible document** — `documentType`/`documentNumber` accept CPF, passport, or other; format validation applies only to CPF.

**Passwordless accounts do not authenticate** — null `User.passwordHash` blocks login; the person must go through a "claim account" flow (to be defined) before being able to log in.

## Naming Decisions

`TicketTier` was chosen for the sellable unit entity, rather than `TicketType` (imprecise — suggested "type" when the concept is broader). Alternatives considered: `TicketBatch` (focus on batch/inventory), `TicketClass` (term used by Eventbrite API), `TicketVariant` (e-commerce/catalog vocabulary), `PriceTier` (pricing focus only), `AdmissionType` (focus on what the person gains by buying). Can be revisited without high cost, since it's just a class/table name.

`User` was chosen instead of separate `Organizer` — reason: the same person can organize and buy at the same time, so a fixed role (`role`) would be incorrect modeling.

## Implementation Notes (Do Not Block the Model, But Worth Remembering Later)

- Uniqueness of `documentNumber` across different `User`s is not currently guaranteed (could allow the same document registered under different emails) — evaluate if it's worth adding validation/alert in the future.
- A denormalized `eventId` field directly on `Ticket` might be worthwhile for check-in query performance (avoids join to `Order`/`Event` with each QR read) — decide at implementation time, not a structural change to the model.
