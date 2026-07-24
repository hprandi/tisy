# PDR-0001: Modelo de funcionamento do projeto

## Status

Aceita (2026-07-24)

## Contexto

O projeto "ingressos" tem dois objetivos que precisam ser honrados simultaneamente em toda decisão de produto: validar uma oportunidade real de negócio (plataforma de venda e gestão de ingressos, evoluindo até ser usada em um evento pequeno e real) e servir como veículo de crescimento profissional para o engenheiro responsável, ampliando seu escopo além de Android rumo a full-stack, arquitetura, infraestrutura e, futuramente, mobile multiplataforma — com foco em fortalecer o posicionamento no mercado internacional.

O projeto é conduzido por um único engenheiro sênior/staff, sem colaboradores, sem prazo fixo definido para o primeiro evento de teste, com dedicação de aproximadamente 5-10 horas por semana. O sistema é tratado como um produto real desde o primeiro dia, com atenção a arquitetura, qualidade de código, testes, documentação de decisões e operação próxima de um ambiente real.

## Decisões

### D1 — Modelo de trabalho

Desenvolvimento solo, sem colaboradores no momento. Sem prazo fixo para o primeiro evento real — prioridade é uma base técnica e de produto sólida em vez de velocidade. Dedicação de 5-10h/semana, o que exige escopo disciplinado a cada fase.

### D2 — Cliente do MVP: organizador do evento (organizador-first)

O produto inicial é uma ferramenta para o organizador criar e vender ingressos, não um marketplace de descoberta de eventos para compradores. O comprador só precisa de uma página de checkout simples. Essa escolha reduz drasticamente o escopo do MVP e é a mais direta de validar com um evento real único.

### D3 — Estratégia de diferenciação (não é o foco principal agora)

Diferenciação do produto (ex: Pix nativo com taxas claras, check-in simples, foco em nicho de eventos comunitários/locais) é uma hipótese leve a ser testada com o evento real, não uma tese de mercado a ser aprofundada antes de construir. O sinal do evento real vale mais do que análise de mercado neste estágio.

### D4 — Escopo do MVP (fluxo ponta a ponta mínimo)

Incluído no MVP: organizador cria evento e lotes de ingresso (tipo, preço, quantidade); página pública de checkout (Pix e cartão); confirmação de pagamento via webhook e emissão do ingresso com QR code (por e-mail); check-in via leitura de QR code (pode ser página web usando câmera do celular, sem necessidade de app nativo); painel simples do organizador (vendas, receita, lista de participantes, exportação).

Fora do escopo do MVP, deliberadamente: cadastro self-service de múltiplos organizadores/marketplace; cupons de desconto; mapa de assentos/lugares marcados; automação de reembolso; descoberta multi-evento; aplicativo mobile nativo; papéis e permissões complexas; multi-moeda; ferramentas de marketing/analytics avançadas.

### D5 — Fases do projeto

Fase 0 — Fundações: decisões de arquitetura e stack (ver ADRs), modelagem de domínio, setup de repositório e CI/CD inicial. Fase 1 — MVP funcional: fluxo completo ponta a ponta descrito em D4, para um evento único. Fase 2 — Evento real de teste: uso real do MVP em um evento pequeno. Fase 3 — Iteração: prioridades definidas a partir do aprendizado do evento real, não antecipadas agora.

### D6 — Documentação de decisões

Decisões de produto/projeto são registradas como PDRs em `docs/pdr`; decisões de arquitetura técnica são registradas como ADRs em `docs/adr`. Ambas seguem o mesmo formato (Status, Contexto, Decisão, Consequências) e nunca são editadas retroativamente — mudanças de decisão geram um novo registro que referencia o anterior.

## Consequências

Positivas: escopo do MVP fica pequeno e claro o suficiente para ser executado solo em 5-10h/semana; foco em organizador-first evita construir infraestrutura de marketplace sem necessidade comprovada; fases dão pontos de checagem sem impor prazos artificiais; histórico de decisões (ADR + PDR) documenta tanto maturidade técnica quanto de produto, servindo o objetivo de crescimento profissional.

Negativas/trade-offs: sem prazo fixo há risco de o projeto se estender indefinidamente na Fase 0/1 — vale revisitar este PDR se isso acontecer; escopo organizador-first adia validação do lado comprador/marketplace, que só virá se o negócio evoluir além do evento de teste inicial.
