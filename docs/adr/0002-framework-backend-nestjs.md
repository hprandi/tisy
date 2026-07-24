# ADR-0002: Framework de back-end — NestJS

## Status

Aceita (2026-07-24)

## Contexto

O ADR-0001 definiu TypeScript ponta a ponta (Next.js + Node.js) como stack de aplicação, mas não definiu qual framework usar sobre o Node puro para estruturar o back-end (roteamento, middleware, organização de código). Essa decisão precisa reforçar a arquitetura já definida em ADR-0001/D3 (monólito modular, com domínio desacoplado de framework/infraestrutura), além de se manter alinhada ao critério de minimizar eixos de aprendizado simultâneos, aproveitando experiência prévia do engenheiro com injeção de dependência e frameworks opinativos (Spring Boot, Angular-like patterns).

## Decisão

Adotar **NestJS** como framework de back-end, usando Express como adapter HTTP padrão (trocável por Fastify no futuro, se performance se tornar relevante).

Motivos principais: a organização por módulos do NestJS (`@Module`) mapeia diretamente para o monólito modular definido em ADR-0001, cada domínio (Event, Order, Payment, CheckIn) podendo virar um módulo Nest que encapsula seus próprios controllers/providers; a injeção de dependência nativa do Nest é conceitualmente igual ao que o engenheiro já domina em Spring Boot, reduzindo a curva de aprendizado de arquitetura; o framework é opinativo o suficiente para impor boa estrutura desde o início, mitigando o risco de acoplamento indevido entre módulos apontado como trade-off no ADR-0001; e possui suporte nativo a validação (DTOs + class-validator), testes (`@nestjs/testing`) e CLI de scaffolding, cobrindo várias necessidades do projeto sem bibliotecas adicionais.

## Alternativas consideradas e descartadas

**Express** — descartado como escolha principal por ser não-opinativo: exigiria construir manualmente toda a organização por módulos e injeção de dependência que o Nest já oferece pronta, consumindo tempo de um projeto solo com orçamento de 5-10h/semana. Continua disponível como adapter HTTP por baixo do Nest.

**Fastify** — descartado por ora por ser também não-opinativo quanto à estrutura de módulos, mesmo sendo mais performático que Express. Pode ser adotado depois como adapter HTTP do Nest (troca de baixo custo) caso performance se torne um requisito real.

**Hono** — descartado por maturidade de ecossistema ainda menor e por não oferecer a estrutura modular/DI necessária para o objetivo arquitetural do projeto.

**AdonisJS** — descartado por ter comunidade e relevância de mercado menores que NestJS, reduzindo o valor do aprendizado para o objetivo de carreira.

## Consequências

Positivas: estrutura por módulos alinhada à arquitetura já decidida, sem esforço extra de construção; curva de aprendizado de arquitetura reduzida por reaproveitar conhecimento prévio de DI; validação, testes e scaffolding vêm prontos do framework.

Negativas/trade-offs: NestJS introduz mais conceitos de framework logo de início (decorators, módulos, providers, pipes, guards) comparado a Express puro; é mais opinativo, o que reduz flexibilidade caso o projeto precise de uma estrutura muito diferente do padrão Nest no futuro.
