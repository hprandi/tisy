# ADR-0003: Data Access Layer — Prisma

## Status

Accepted (2026-07-26)

## Context

With the back-end in NestJS (ADR-0002) and the domain model defined (`docs/adr/0004-domain-model.md`), it was necessary to choose the data access layer for PostgreSQL (ADR-0001/D2). Criteria used in the decision: minimize setup decisions given the solo pace of 5-10 hours per week; typing strong enough to catch errors without a team reviewing code; smooth migration flow, since the domain model changed several times during its own design (entity renaming, relationship adjustment); well-documented integration with NestJS; and current market relevance for career development goals.

## Decision

Adopt **Prisma** as the ORM/data access layer.

## Alternatives Considered and Rejected

**TypeORM** — rejected. Beyond having weaker query typing and historically less reliable automatic migration, it is explicitly in decline for new projects in 2026 (older decorators/reflect-metadata baggage, slower development than alternatives). The familiarity that its annotation pattern would bring (equivalent to Room/JPA) was evaluated and considered not relevant enough to overcome these disadvantages.

**Drizzle** — rejected for now. It is the most "modern" growing alternative, closer to raw SQL, with strong typing via inference. Its most cited differentiator — native support for edge runtimes (Cloudflare Workers, etc.) — does not apply here, since ADR-0001/D4 already rejected edge/serverless infrastructure in favor of a conventional managed platform (Railway/Render/Fly.io). Moreover, Drizzle requires more configuration decisions before starting (connection driver, schema/migration organization), which conflicts with the criterion of moving fast with few decisions.

## Consequences

Positive: quick setup with strong conventions (one schema, `prisma migrate dev`, generated TypeScript client, Prisma Studio for data inspection without external tools); officially documented integration with NestJS (standard `PrismaModule`/`PrismaService`); automatic migration flow reduces friction in continuing to iterate the domain model.

Negative/trade-offs: Prisma's fluent API does not support explicit row locking (`SELECT ... FOR UPDATE`) — it would require raw SQL via `$queryRaw`/`$executeRaw` for that specific pattern. For the overselling-free reservation invariant, this was worked around without raw SQL: `TicketTier` maintains a `quantityAvailable` counter that decrements atomically via a single conditional `updateMany` (`WHERE quantityAvailable >= qty`), leveraging Postgres's native atomicity in a single-row `UPDATE` — see `docs/adr/0004-domain-model.md`. More advanced/complex queries in the future may eventually require escaping to raw SQL.
