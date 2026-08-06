# Modelo de domínio — MVP

Este documento consolida o modelo de domínio definido para o MVP da plataforma de ingressos, discutido a partir das decisões registradas em `docs/adr/0001-decisoes-arquiteturais-iniciais.md` e `docs/pdr/0001-modelo-de-funcionamento-do-projeto.md`. Diferente de um ADR/PDR, este documento é vivo — deve ser atualizado conforme o modelo evolui, em vez de gerar um novo registro a cada ajuste pontual.

## Entidades

### User

Identidade compartilhada entre organizadores e compradores — não existe um papel fixo (`role`) na conta; a condição de organizador é implícita por ter criado ao menos um `Event`.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| name | string | sim | |
| email | string | sim | único; chave de correspondência para reconhecer comprador recorrente |
| documentType | enum (CPF, PASSPORT, OTHER) | sim | `OTHER` cobre casos não previstos (ex: RNE de estrangeiro residente) |
| documentNumber | string | sim | validação de formato/dígito verificador aplica-se apenas quando `documentType = CPF` |
| passwordHash | string | não | nulo até a pessoa "reivindicar" a conta definindo uma senha; contas sem senha não podem autenticar via login |
| createdAt | datetime | sim | |

### Event

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| organizerId | uuid (→ User.id) | sim | |
| title | string | sim | |
| description | text | não | |
| location | string | sim | |
| startDate | datetime | sim | |
| endDate | datetime | sim | |
| status | enum (draft, published, cancelled, finished) | sim | |
| createdAt / updatedAt | datetime | sim | |

### TicketTier

Unidade vendável dentro de um evento — combina o que seria "categoria" (ex: VIP, Pista, Meia-entrada) e "lote" (janela de vendas com preço/quantidade próprios) numa única entidade, por decisão deliberada de simplicidade (ver seção "Decisões de nomenclatura" abaixo).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| eventId | uuid (→ Event.id) | sim | |
| name | string | sim | ex: "1º lote", "VIP", "Meia-entrada" |
| price | decimal | sim | preço de catálogo atual — pode mudar ao longo do tempo |
| quantityTotal | int | sim | |
| salesStartAt / salesEndAt | datetime | não | |
| status | enum (active, sold_out, closed) | sim | |

### Order

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| eventId | uuid (→ Event.id) | sim | |
| buyerId | uuid (→ User.id) | sim | resolvido por email no checkout — cria `User` novo (sem senha) se não existir |
| totalAmount | decimal | sim | |
| status | enum (pending, paid, expired, cancelled, refunded) | sim | |
| paymentProvider | string | não | preenchido após início do pagamento |
| paymentExternalId | string | não | id do provedor (Pagar.me/Mercado Pago/Asaas, a definir) |
| expiresAt | datetime | sim | define a janela de reserva antes da liberação automática do estoque |
| createdAt / paidAt | datetime | sim / não | |

Nota: dados do comprador (nome, email, documento) **não** são duplicados aqui — ficam apenas em `User`, referenciados via `buyerId`. Isso é uma escolha deliberadamente diferente da regra de preço (ver `OrderItem.unitPrice` abaixo): identidade do comprador reflete o estado atual do `User` (se ele corrigir um typo no nome, pedidos antigos "herdam" a correção), enquanto preço precisa ficar congelado no momento da compra por motivos financeiros/contábeis.

### OrderItem

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| orderId | uuid (→ Order.id) | sim | |
| ticketTierId | uuid (→ TicketTier.id) | sim | |
| unitPrice | decimal | sim | **snapshot** do preço no momento da compra — não deriva do preço atual do `TicketTier`, que pode mudar depois |
| quantity | int | sim | |

### Ticket

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| orderItemId | uuid (→ OrderItem.id) | sim | um `Ticket` por unidade comprada |
| code | string | sim | token único e não-adivinhável (UUID ou assinado) — usado no QR code |
| status | enum (issued, checked_in, cancelled) | sim | |
| checkedInAt | datetime | não | |

## Relacionamentos

```
User 1──N Event (organizerId)
Event 1──N TicketTier
Event 1──N Order
User 1──N Order (buyerId)
Order 1──N OrderItem
TicketTier 1──N OrderItem
OrderItem 1──N Ticket
```

## Invariantes e regras de negócio

**Reserva sem overselling** — ao criar um `Order`, a verificação e o decremento de quantidade disponível no `TicketTier` acontecem dentro de uma transação com `SELECT ... FOR UPDATE`, evitando corrida entre compradores simultâneos.

**Expiração de reserva** — todo `Order` pendente tem `expiresAt`; a liberação do estoque reservado é verificada de forma preguiçosa (ao consultar disponibilidade, ignora pedidos pendentes já expirados), sem exigir job agendado no MVP.

**Check-in atômico** — a leitura do QR code atualiza o `Ticket` com `UPDATE ... WHERE status = 'issued'`, evitando que duas leituras simultâneas validem o mesmo ingresso duas vezes.

**Preço congelado por pedido** — `OrderItem.unitPrice` é sempre uma cópia do preço no momento da compra, nunca uma referência ao preço atual do `TicketTier`.

**Documento flexível** — `documentType`/`documentNumber` aceitam CPF, passaporte ou outro; validação de formato só se aplica a CPF.

**Contas sem senha não autenticam** — `User.passwordHash` nulo bloqueia login; a pessoa precisa passar por um fluxo de "reivindicar conta" (a definir) antes de conseguir logar.

## Decisões de nomenclatura

`TicketTier` foi escolhido para a entidade de unidade vendável, em vez de `TicketType` (impreciso — sugeria "tipo" quando o conceito é mais amplo). Alternativas consideradas: `TicketBatch` (foco em lote/inventário), `TicketClass` (termo usado pela API do Eventbrite), `TicketVariant` (vocabulário de e-commerce/catálogo), `PriceTier` (foco só em precificação), `AdmissionType` (foco no que a pessoa ganha ao comprar). Pode ser revisitado sem custo alto, já que é só nome de classe/tabela.

`User` foi escolhido no lugar de `Organizer` separado — motivo: a mesma pessoa pode organizar e comprar ao mesmo tempo, então um papel fixo (`role`) seria uma modelagem incorreta.

## Notas de implementação (não bloqueiam o modelo, mas vale lembrar depois)

- Unicidade de `documentNumber` entre `User`s diferentes não está sendo garantida por enquanto (poderia permitir o mesmo documento cadastrado sob emails diferentes) — avaliar se vale a pena adicionar validação/alerta no futuro.
- Um campo `eventId` denormalizado direto em `Ticket` pode valer a pena por performance de consulta no check-in (evita join até `Order`/`Event` a cada leitura de QR) — decidir na implementação, não é uma mudança estrutural do modelo.
