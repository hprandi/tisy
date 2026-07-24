# ADR-0001: Decisões arquiteturais iniciais

## Status

Aceita (2026-07-24)

## Contexto

O projeto "ingressos" é uma plataforma de venda e gestão de ingressos para eventos, com dois objetivos simultâneos: validar uma oportunidade de negócio real (evoluindo até um evento de teste pequeno) e servir como veículo de crescimento profissional para um engenheiro sênior/staff com 16 anos de experiência em Android, mas pouco contato recente com back-end/front-end web e experiência praticamente nula em cloud/DevOps.

Restrições relevantes para as decisões abaixo: desenvolvimento solo, sem prazo fixo para o primeiro evento real, dedicação de 5-10h/semana. Nesse ritmo, cada tecnologia nova aprendida simultaneamente tem custo alto — o critério de decisão priorizado foi minimizar o número de eixos de aprendizado novos abertos ao mesmo tempo, direcionando o orçamento de aprendizado para a maior lacuna atual (cloud/DevOps), sem abrir mão de qualidade arquitetural.

## Decisões

### D1 — Stack de aplicação: TypeScript ponta a ponta (Next.js + Node.js)

Mantém-se a stack em TypeScript para front-end (React/Next.js) e back-end (Node.js), em vez de introduzir uma segunda linguagem (ex: Go) no back-end agora. Um único ecossistema de linguagem reduz o custo de contexto enquanto três áreas novas já estão sendo aprendidas ao mesmo tempo (back-end real, front-end web moderno, cloud/infra). TypeScript full-stack também é uma das competências mais demandadas no mercado internacional.

Go fica como candidato a um projeto de aprendizado dedicado numa fase posterior (ex: reescrever um serviço isolado, como um worker de notificação, depois que produto e infraestrutura estiverem estáveis).

### D2 — Banco de dados: PostgreSQL

Ingressos são inventário com concorrência (evitar overselling exige transações/locks) — caso de uso relacional clássico. PostgreSQL foi escolhido em vez de alternativas NoSQL, que adicionariam complexidade sem benefício para este domínio, e é uma competência amplamente valorizada no mercado.

### D3 — Arquitetura: monólito modular com domínio desacoplado

A aplicação será um monólito modular (módulos organizados por domínio dentro de um único deployable), não microsserviços. Camada de domínio desacoplada de framework/infraestrutura (estilo hexagonal/ports & adapters simplificado). Isso demonstra maturidade arquitetural sem o custo operacional de microsserviços, que seria over-engineering para um desenvolvedor solo em 5-10h/semana. Divisão em serviços separados fica em aberto para uma fase futura, apenas se houver necessidade real.

### D4 — Infraestrutura e deploy inicial: simples e gerenciado

Sequência inicial de infraestrutura: containerização com Docker, CI/CD simples (GitHub Actions), deploy em plataforma gerenciada (Railway, Render ou Fly.io — a escolher), observabilidade básica (rastreamento de erros tipo Sentry, logs estruturados, monitoramento de uptime). Kubernetes, Terraform e um provedor cloud maior (ex: AWS) ficam propositalmente fora do escopo inicial — serão introduzidos como um arco de aprendizado deliberado em uma fase posterior, quando o produto já estiver rodando, para não consumir o orçamento de tempo sem gerar progresso de produto.

### D5 — Pagamentos: suporte nativo a Pix desde o início

Dado o mercado brasileiro, Pix é considerado essencial ao lado de cartão de crédito. Provedores como Pagar.me, Mercado Pago ou Asaas são candidatos (a decidir), em vez de um provedor sem boa cobertura local de Pix. Essa escolha molda decisões de arquitetura relacionadas a webhooks de confirmação e idempotência de pagamento.

### D6 — Mobile: adiado, sem stack travada

Aplicativo mobile nativo fica fora do escopo do MVP. Quando chegar a hora, React Native e Kotlin Multiplatform (KMP) são ambos candidatos — KMP aproveita diretamente a experiência existente em Kotlin/Android. Essa decisão será revisitada em ADR futuro, não travada agora.

## Alternativas consideradas e descartadas por enquanto

Go no back-end (adiado para projeto de aprendizado isolado em fase futura, ver D1). Microsserviços desde o início (rejeitado por complexidade operacional desnecessária no estágio atual, ver D3). Infraestrutura cloud completa (Kubernetes/Terraform/AWS) desde o dia 1 (adiado para fase posterior, ver D4).

## Consequências

Positivas: curva de aprendizado mais gerenciável para um dev solo em 5-10h/semana; base de código mais simples de manter e evoluir; foco do tempo de aprendizado na maior lacuna atual (cloud/DevOps); stack e banco de dados com alta relevância para o mercado internacional.

Negativas/trade-offs: adiar Go e infraestrutura cloud mais robusta significa que esse aprendizado específico só virá em fases futuras; monólito modular exigirá disciplina para não acumular acoplamento indevido entre módulos, já que não há fronteira física de serviço forçando a separação.
