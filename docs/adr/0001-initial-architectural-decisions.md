# ADR-0001: Initial Architectural Decisions

## Status

Accepted (2026-07-24)

## Context

The "ingressos" project is a ticket sales and event management platform with two simultaneous objectives: validating a real business opportunity (evolving toward a small test event) and serving as a vehicle for professional growth for a senior/staff engineer with 16 years of Android experience but limited recent contact with back-end/web front-end and virtually no cloud/DevOps experience.

Constraints relevant to the decisions below: solo development, no fixed deadline for the first real event, commitment of 5-10 hours per week. At this pace, each new technology learned simultaneously carries a high cost — the prioritized decision criterion was to minimize the number of new learning axes opened simultaneously, directing the learning budget toward the current major gap (cloud/DevOps), without compromising architectural quality.

## Decisions

### D1 — Application Stack: End-to-End TypeScript (Next.js + Node.js)

Maintain the TypeScript stack for front-end (React/Next.js) and back-end (Node.js), rather than introducing a second language (e.g., Go) on the back-end now. A single language ecosystem reduces context-switching costs while three new areas are already being learned simultaneously (real back-end, modern web front-end, cloud/infra). Full-stack TypeScript is also one of the most in-demand skills in the international market.

Go remains a candidate for a dedicated learning project in a later phase (e.g., rewriting an isolated service, like a notification worker, after product and infrastructure are stable).

### D2 — Database: PostgreSQL

Tickets are inventory with concurrency (avoiding overselling requires transactions/locks) — a classic relational use case. PostgreSQL was chosen over NoSQL alternatives, which would add complexity without benefit for this domain, and is a highly valued skill in the market.

### D3 — Architecture: Modular Monolith with Decoupled Domain

The application will be a modular monolith (modules organized by domain within a single deployable), not microservices. Domain layer decoupled from framework/infrastructure (simplified hexagonal/ports & adapters style). This demonstrates architectural maturity without the operational cost of microservices, which would be over-engineering for a solo developer at 5-10 hours per week. Division into separate services remains open for a later phase, only if real necessity arises.

### D4 — Infrastructure and Initial Deployment: Simple and Managed

Initial infrastructure sequence: containerization with Docker, simple CI/CD (GitHub Actions), deployment on a managed platform (Railway, Render, or Fly.io — to be chosen), basic observability (error tracking like Sentry, structured logging, uptime monitoring). Kubernetes, Terraform, and a major cloud provider (e.g., AWS) are intentionally outside the initial scope — they will be introduced as a deliberate learning arc in a later phase, when the product is already running, to avoid consuming time budget without generating product progress.

### D5 — Payments: Native Pix Support from the Start

Given the Brazilian market, Pix is considered essential alongside credit card. Providers like Pagar.me, Mercado Pago, or Asaas are candidates (to be decided), rather than a provider without good local Pix coverage. This choice shapes architectural decisions related to payment confirmation webhooks and idempotency.

### D6 — Mobile: Deferred, No Stack Lock-in

Native mobile applications are outside MVP scope. When the time comes, React Native and Kotlin Multiplatform (KMP) are both candidates — KMP directly leverages existing Kotlin/Android experience. This decision will be revisited in a future ADR, not locked in now.

## Alternatives Considered and Deferred for Now

Go on the back-end (deferred to a dedicated learning project in a later phase, see D1). Microservices from the start (rejected due to unnecessary operational complexity at this stage, see D3). Complete cloud infrastructure (Kubernetes/Terraform/AWS) from day 1 (deferred to a later phase, see D4).

## Consequences

Positive: more manageable learning curve for a solo dev at 5-10 hours per week; simpler codebase to maintain and evolve; learning time focused on the current major gap (cloud/DevOps); stack and database with high relevance for the international market.

Negative/trade-offs: deferring Go and more robust cloud infrastructure means that specific learning will only come in later phases; modular monolith will require discipline to avoid accumulating undue coupling between modules, since there is no physical service boundary enforcing separation.
