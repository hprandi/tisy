# PDR-0002: Mercado Pago as Payment Provider

## Status

Accepted (2026-08-13)

## Context

ADR-0001/D5 already established that native Pix support alongside credit card is essential given the Brazilian market, and named three candidate providers — Pagar.me, Mercado Pago, and Asaas — without deciding between them, explicitly leaving the choice open.

Project constraints that apply here: solo developer operating as an individual (no registered company/CNPJ), 5-10 hours per week available, and a strong preference for minimizing integration risk and learning surface (ADR-0001). A real practical risk existed going in: some payment providers historically favor or require a registered business account even for sandbox/test access, which could have blocked this step entirely regardless of technical merit.

## Decision

Adopt **Mercado Pago** as the payment provider, using their hosted checkout (Preferences API / Checkout Pro) rather than integrating the Payments API directly.

Deciding factors, confirmed through direct testing, not just documentation:

- **Individual (CPF) developer accounts work** — test/sandbox credentials were obtained and used successfully without a CNPJ, removing the main risk that could have blocked the whole integration.
- **Official, actively maintained Node.js/TypeScript SDK** (`mercadopago` on npm, maintained by Mercado Pago itself) — reduces integration code and risk for a solo developer on a tight time budget.
- **Hosted checkout covers both Pix and card with no custom UI work** — card payments via a direct API integration would require card tokenization, 3D Secure/anti-fraud handling, and installment UI on our side; the hosted checkout page handles all of this, in line with ADR-0001's principle of minimizing simultaneous learning axes.
- **Largest market presence and brand recognition in Brazil** (MercadoLibre group) — relevant for buyer trust during the real test event, beyond the technical criteria.
- Verified end-to-end with real sandbox credentials: order creation → checkout session → approved test payment, confirming the integration actually works before committing further.

## Alternatives Considered and Rejected

**Pagar.me** — has an official Node.js SDK and mature documentation (backed by Stone), but no clear confirmation of frictionless individual/CPF sandbox access was found, and its product is more oriented toward marketplace/split-payment use cases the project doesn't need yet.

**Asaas** — well-documented sandbox specifically for Pix and webhook testing, and commonly used by freelancers/individual accounts in the Brazilian market. Rejected for now because no official Node.js SDK was found — integration would mean calling the REST API directly, adding more integration effort and risk than an actively maintained SDK for a solo developer.

**Direct Payments API integration (building our own checkout UI)** — rejected in favor of hosted checkout. Pix alone would have been manageable directly, but supporting card this way adds significant scope (tokenization, anti-fraud, installments) that hosted checkout eliminates entirely.

## Consequences

Positive: integration was unblocked and verified working end-to-end with real sandbox credentials, not just planned on paper; the official SDK kept integration code small; hosted checkout means zero custom UI or PCI-scope work for either payment method.

Negative/trade-offs: the buyer is redirected off our own domain during checkout (hosted page), a less "native" experience — an acceptable cost for MVP scope. A rigorous cost/fee comparison across the three providers was not performed at this stage; worth revisiting before the real paid event if transaction fees become material. The integration is coupled to Mercado Pago's specific webhook/preference model for now, though the `PaymentProvider` interface already built (port/adapter pattern) contains the blast radius if this needs to change later.
