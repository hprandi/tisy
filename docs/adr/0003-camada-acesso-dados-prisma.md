# ADR-0003: Camada de acesso a dados — Prisma

## Status

Aceita (2026-07-26)

## Contexto

Com o back-end em NestJS (ADR-0002) e o modelo de domínio definido (`docs/domain-model.md`), era preciso escolher a camada de acesso ao PostgreSQL (ADR-0001/D2). Critérios usados na decisão: minimizar decisões de setup, dado o ritmo solo de 5-10h/semana; tipagem forte o suficiente para pegar erro sem um time revisando código; fluxo de migração suave, já que o modelo de domínio mudou várias vezes durante o próprio desenho (renomeação de entidade, ajuste de relacionamento); integração bem documentada com NestJS; e relevância de mercado atual para o objetivo de carreira.

## Decisão

Adotar **Prisma** como ORM/camada de acesso a dados.

## Alternativas consideradas e descartadas

**TypeORM** — descartado. Além de ter tipagem de query mais fraca e migração automática historicamente menos confiável, está explicitamente em declínio para projetos novos em 2026 (bagagem de decorators/reflect-metadata mais antiga, desenvolvimento mais lento que as alternativas). A familiaridade que seu padrão de anotações traria (equivalente a Room/JPA) foi avaliada e considerada não relevante o suficiente para superar essas desvantagens.

**Drizzle** — descartado por ora. É a alternativa mais "moderna" em crescimento, mais próxima do SQL puro, com tipagem forte via inferência. Seu diferencial mais citado — suporte nativo a runtimes de edge (Cloudflare Workers, etc.) — não se aplica aqui, já que o ADR-0001/D4 já descartou infraestrutura de edge/serverless em favor de uma plataforma gerenciada convencional (Railway/Render/Fly.io). Além disso, Drizzle exige mais decisões de configuração antes de começar (driver de conexão, organização de schema/migração), o que conflita com o critério de andar rápido com poucas decisões.

## Consequências

Positivas: setup rápido com convenções fortes (um schema, `prisma migrate dev`, client TypeScript gerado, Prisma Studio para inspecionar dados sem ferramenta externa); integração documentada oficialmente pelo NestJS (padrão `PrismaModule`/`PrismaService`); fluxo de migração automática reduz atrito de continuar iterando o modelo de domínio.

Negativas/trade-offs: a API fluente do Prisma não suporta lock explícito de linha (`SELECT ... FOR UPDATE`) — exigiria SQL bruto via `$queryRaw`/`$executeRaw` para esse padrão específico. Para a invariante de reserva sem overselling, isso foi contornado sem SQL bruto: `TicketTier` passa a manter um contador `quantityAvailable` que decrementa atomicamente via um único `updateMany` condicional (`WHERE quantityAvailable >= qty`), aproveitando a atomicidade nativa do Postgres em um `UPDATE` de linha única — ver `docs/domain-model.md`. Consultas mais avançadas/complexas no futuro ainda podem eventualmente exigir a saída de escape para SQL bruto.
