# Ingressos Project — Initial Prompt

Good evening Claude. I would like to start a conversation and evaluation about a new project.

## Project: Ticket Sales and Event Management Platform

### Overview

The idea is to develop a modern ticket sales and management platform for events. The initial objective is not to compete directly with major market players, but to build a simple product using the Pareto methodology—real, usable, and able to evolve gradually until it becomes a viable business.

The project will be treated as a real product from day one, with a focus on good user experience, solid architecture, code quality, and continuous evolution.

### Objectives

The project has two main objectives:

1. **Validate a business opportunity** by creating a platform that can be used in a real event (albeit small and for testing) and that can gradually evolve to serve larger events.

2. **Serve as a professional development vehicle**, allowing the responsible engineer to expand their scope beyond Android development. The goal is to gain practical experience in full-stack development, systems architecture, infrastructure, back-end, web front-end, and eventually cross-platform mobile applications.

This second motivation is important. The project should prioritize technologies and architectural decisions that generate relevant learning and strengthen the engineer's positioning in the international market.

### Project Philosophy

The system should be developed as if it were a commercial product from day one. This means paying attention to aspects such as:

- Clean and easy-to-evolve architecture
- Well-modeled domain
- Readable and high-quality code
- Automated tests where they make sense
- Documentation of major architectural decisions
- Observability and ease of maintenance
- Deployment and operation close to a real environment

The goal is not merely to make the system work, but to build a technical foundation that demonstrates engineering maturity.

### Technologies Considered

The idea discussed so far is to use a stack based on TypeScript, offering good synergy between front-end and back-end. The initial proposal would be something like:

- **Front-end Web**: React (possibly Next.js)
- **Back-end**: Node.js + TypeScript
- **Database**: PostgreSQL
- **Mobile App (in a later stage)**: React Native or Kotlin Multiplatform (KMP)

This choice was motivated both by technical potential and by value for the engineer's professional evolution. However, this decision is not yet final. Other alternatives were also considered, such as:

- Flutter for mobile applications
- Go for the back-end
- Other combinations that make sense

We would like this conversation to critically reevaluate this stack decision, considering factors such as:

- Quality of development experience
- Productivity
- Ease of maintenance
- Architectural quality
- Learning potential
- Relevance for the job market in coming years
- Suitability for this product type

If there are more interesting alternatives, we would like them presented along with their respective trade-offs.

### What We Expect from This Conversation

We would like you to act in different roles throughout the project.

**Role 1 — Project Coach/Manager**: Evaluate the idea, discuss strategy, and define initial steps.

**Role 2 — Product Manager**: Briefly discuss product applicability in the market. We don't need to expand much on this point given that the project also aims at the user's professional evolution. But we also don't want to start without validating the product.

**Role 3 — Experienced Software Architect and Technical Partner**: Support throughout the entire project.

We expect to receive suggestions about:

- System architecture
- Domain modeling
- MVP definition
- Feature prioritization
- Code organization
- Engineering best practices
- Technologies
- Infrastructure
- Security
- Scalability
- Product evolution strategy

More than answering punctual questions, we seek support in making good technical and product decisions throughout development.

---

## Documentation of Decisions

This project uses a formal decision-recording system to document architectural and product choices:

### ADR (Architecture Decision Records) — `docs/adr/`

**Purpose**: Record all significant technical and architectural decisions that shape how the system is built. Each ADR captures the context (the problem or constraint), the decision made, and its consequences (positive and negative trade-offs).

**Key principles for writing ADRs**:
- **Concise**: Only include information essential to understanding the decision and its rationale. Avoid lengthy explanations or tangential details.
- **Decision-focused**: Each ADR should address one significant architectural choice (choice of framework, database, deployment model, etc.).
- **Live alternatives section**: The "Alternatives Considered" section documents paths not taken and why, providing context for future readers and architects.

### PDR (Product Decision Records) — `docs/pdr/`

**Purpose**: Record product and project-level decisions that are not purely technical (go-to-market approach, MVP scope, customer prioritization, project phases, etc.).

**Key principles for writing PDRs**:
- **Concise**: Focus on what was decided and why. Avoid marketing language or product vision that belongs in a separate product strategy document.
- **Business context**: Each PDR explains the constraint or opportunity that drove the decision.
- **Consequences matter**: Document trade-offs so future teams understand what was chosen and what was deliberately deferred.

### When to Write ADR vs. PDR vs. Code Comments

- **ADR**: Decisions that affect system architecture, technology choices, or major design patterns. If you're wondering "should we use tool X or Y?" or "how should we structure this layer?", that's an ADR.
- **PDR**: Decisions about product scope, customer focus, roadmap phases, or project constraints. If you're wondering "who is our first customer?" or "what is included in MVP?", that's a PDR.
- **Code comments**: Implementation details, non-obvious logic, workarounds. **Not** decisions about why the system is built this way — those belong in ADRs/PDRs.

### What NOT to Document

To keep the system lightweight and focused:
- **Routine implementation choices** (e.g., "we use `async/await` instead of promises") — these are assumed unless they represent a significant departure from the ecosystem default.
- **Library selection within a solved problem** (e.g., "we use class-validator for DTOs") — document only if there was meaningful consideration of alternatives.
- **Configuration details** — unless the choice involved trade-offs (e.g., "we chose Docker over X").
- **Rationale for minor code refactors** — reserve ADRs for decisions that will impact the codebase for months or years.

The discipline is: **Is this decision something future engineers need to understand to make good choices about the system?** If yes, document it. If it's an implementation detail or obvious choice, skip it.

## Code Comments

Code should be self-documenting: the "what" lives in clear method and variable names, not in comments. A comment is only added when it captures a "why" the code itself can't express — a deliberate trade-off, a non-obvious business rule, a workaround for a library quirk. Comments should never restate what the method already says.
