# ADR-0002: Back-end Framework — NestJS

## Status

Accepted (2026-07-24)

## Context

ADR-0001 defined end-to-end TypeScript (Next.js + Node.js) as the application stack, but did not specify which framework to use on top of raw Node to structure the back-end (routing, middleware, code organization). This decision must reinforce the architecture already defined in ADR-0001/D3 (modular monolith with domain decoupled from framework/infrastructure), while staying aligned with the criterion of minimizing simultaneous learning axes, leveraging the engineer's prior experience with dependency injection and opinionated frameworks (Spring Boot, Angular-like patterns).

## Decision

Adopt **NestJS** as the back-end framework, using Express as the default HTTP adapter (replaceable with Fastify in the future, if performance becomes relevant).

Main reasons: NestJS's module organization (`@Module`) maps directly to the modular monolith defined in ADR-0001, with each domain (Event, Order, Payment, CheckIn) becoming a Nest module that encapsulates its own controllers/providers; NestJS's native dependency injection is conceptually equivalent to what the engineer already masters in Spring Boot, reducing the architectural learning curve; the framework is opinionated enough to impose good structure from the start, mitigating the risk of undue coupling between modules noted as a trade-off in ADR-0001; and it has native support for validation (DTOs + class-validator), testing (`@nestjs/testing`), and scaffolding CLI, covering several project needs without additional libraries.

## Alternatives Considered and Rejected

**Express** — rejected as the primary choice for being non-opinionated: it would require manually building all the module organization and dependency injection that Nest already offers out of the box, consuming time from a solo project with a 5-10 hour per week budget. It remains available as the HTTP adapter underneath Nest.

**Fastify** — rejected for now for being also non-opinionated regarding module structure, even though it is more performant than Express. It can be adopted later as a Nest HTTP adapter (low-cost swap) if performance becomes a real requirement.

**Hono** — rejected due to smaller ecosystem maturity and failure to offer the modular structure/DI necessary for the project's architectural goals.

**AdonisJS** — rejected for having smaller community and market relevance than NestJS, reducing the learning value for career development goals.

## Consequences

Positive: module structure aligned with already-decided architecture, without extra construction effort; reduced architectural learning curve by reusing prior DI knowledge; validation, testing, and scaffolding come ready from the framework.

Negative/trade-offs: NestJS introduces more framework concepts from the start (decorators, modules, providers, pipes, guards) compared to raw Express; it is more opinionated, which reduces flexibility if the project needs a structure very different from the Nest standard in the future.
