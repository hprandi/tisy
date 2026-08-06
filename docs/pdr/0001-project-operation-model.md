# PDR-0001: Project Operation Model

## Status

Accepted (2026-07-24)

## Context

The "ingressos" project has two objectives that must be honored simultaneously in every product decision: validating a real business opportunity (ticket sales and management platform, evolving to be used in a small real event) and serving as a vehicle for professional growth for the responsible engineer, expanding their scope beyond Android toward full-stack, architecture, infrastructure, and eventually cross-platform mobile — with a focus on strengthening positioning in the international market.

The project is conducted by a single senior/staff engineer, with no collaborators, no fixed deadline for the first test event, with a commitment of approximately 5-10 hours per week. The system is treated as a real product from day one, with attention to architecture, code quality, testing, documentation of decisions, and operation close to a real environment.

## Decisions

### D1 — Work Model

Solo development, no collaborators at the moment. No fixed deadline for the first real event — priority is solid technical and product foundation rather than speed. Commitment of 5-10 hours per week, which requires disciplined scope for each phase.

### D2 — MVP Customer: Event Organizer (Organizer-First)

The initial product is a tool for the organizer to create and sell tickets, not a marketplace for event discovery for buyers. The buyer only needs a simple checkout page. This choice drastically reduces MVP scope and is the most direct way to validate with a single real event.

### D3 — Differentiation Strategy (Not the Main Focus Now)

Product differentiation (e.g., native Pix with clear fees, simple check-in, focus on community/local events niche) is a light hypothesis to be tested with the real event, not a market thesis to be deepened before building. The signal from the real event is worth more than market analysis at this stage.

### D4 — MVP Scope (Minimum End-to-End Flow)

Included in MVP: organizer creates event and ticket batches (type, price, quantity); public checkout page (Pix and card); payment confirmation via webhook and ticket issuance with QR code (by email); check-in via QR code reading (can be web page using mobile camera, no native app required); simple organizer dashboard (sales, revenue, participant list, export).

Deliberately out of MVP scope: self-service registration of multiple organizers/marketplace; discount coupons; seat map/assigned seating; refund automation; multi-event discovery; native mobile app; complex roles and permissions; multi-currency; advanced marketing/analytics tools.

### D5 — Project Phases

Phase 0 — Foundations: architecture and stack decisions (see ADRs), domain modeling, repository setup and initial CI/CD. Phase 1 — Functional MVP: complete end-to-end flow described in D4, for a single event. Phase 2 — Real test event: real MVP usage at a small event. Phase 3 — Iteration: priorities defined based on learning from the real event, not anticipated now.

### D6 — Decision Documentation

Product/project decisions are recorded as PDRs in `docs/pdr`; technical architecture decisions are recorded as ADRs in `docs/adr`. Both follow the same format (Status, Context, Decision, Consequences) and are never edited retroactively — decision changes generate a new record that references the previous one.

## Consequences

Positive: MVP scope stays small and clear enough to be executed solo at 5-10 hours per week; organizer-first focus avoids building marketplace infrastructure without proven need; phases provide checkpoints without imposing artificial deadlines; decision history (ADR + PDR) documents both technical and product maturity, serving the professional growth goal.

Negative/trade-offs: with no fixed deadline, there is a risk of the project extending indefinitely in Phase 0/1 — it is worth revisiting this PDR if that happens; organizer-first scope defers validation of the buyer/marketplace side, which will only come if the business evolves beyond the initial test event.
