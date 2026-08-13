# ADR-0006: API Resource Nesting Convention

## Status

Accepted (2026-08-13)

## Context

As the API grew past `Event` into `TicketTier` and `Order` (and soon `Payment`/`Ticket`), we needed a consistent rule for when a resource's routes should be nested under a parent resource's URL (e.g. `/events/:eventId/ticket-tiers`) versus exposed as its own top-level resource (e.g. `/orders/:id`).

Generic REST guidance was considered first — Stripe's "max two levels of nesting" rule, Google AIP-124's "one canonical parent per resource", and Microsoft/Moesif's "single-item operations are best done via a flat path" — but applied inconsistently to our two concrete cases (`TicketTier` and `Order`), sometimes suggesting one path be nested for creation/listing but flat for updates, which read as arbitrary when the two operations sit right next to each other in the same resource.

## Decision

Adopt a concrete, project-specific test instead of a generic depth limit:

> **Does the child resource's relevance outlive the end of its parent's active lifecycle?**

- **No** (the child's meaning is entirely bound to the parent being active) → nest **all** operations (create, list, get, update) under the parent's URL.
- **Yes** (the child stays independently relevant — queried by a different actor, across multiple parent instances, or after the parent's lifecycle ends) → give the child its own top-level resource; only creation stays nested if it genuinely needs the parent's context to exist.

Applied to our current resources:

- **`TicketTier`** — fully nested under `Event` for every operation (`/events/:eventId/ticket-tiers`, `/events/:eventId/ticket-tiers/:id`). Price, sales window, and status only make sense while the event is active; nobody manages a tier after the event has ended.
- **`Order`** — its own top-level resource (`/orders`, `/orders/:id/payment`); `eventId` moves to the request body instead of the URL for creation. A buyer's order stays relevant after the event ends (receipts, refunds, "my orders" history across multiple events).

## Alternatives Considered and Rejected

**Stripe's "max two levels of nesting" rule** — directionally useful, but doesn't explain *why* a given resource should or shouldn't nest, only *how deep*. The lifecycle-coupling test is more directly predictive for deciding our own resources.

**Google AIP-124's "one canonical parent" rule** — resolves the technical question of which parent to nest under (`Order` has two plausible parents, `Event` and the buyer `User`) but doesn't by itself say whether nesting is appropriate at all.

**Nesting `Order` fully under `Event`, no exceptions** — rejected: an order's relevance clearly outlives the event, and forcing every future order-related operation (payment, refund, buyer order history) under `/events/:eventId/orders/...` would drag along an `eventId` those operations don't need.

## Consequences

Positive: gives a concrete, reusable test for future resources instead of re-litigating URL shape from scratch each time (already flagged as relevant for `Ticket`, coming in a later step — likely behaves like `Order`, not `TicketTier`); keeps `TicketTier`'s routes uniform (no split between nested list/create and flat update); gives `Order` room to grow its own operations (payment now, likely cancel/refund/buyer-history later) without carrying an `eventId` it doesn't always need.

Negative/trade-offs: the test is a judgment call about a resource's future relevance, not a purely mechanical rule — occasionally worth revisiting if a resource's actual usage diverges from what was predicted here.
