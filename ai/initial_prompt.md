## Project: Ticket Sales and Event Management Platform

### Overview

The idea is to develop a modern ticket sales and management platform for events. The initial objective is not to compete directly with major market players, but to build a simple product using the Pareto methodology—real, usable, and able to evolve gradually until it becomes a viable business.

The project will be treated as a real product from day one, with a focus on good user experience, solid architecture, code quality, and continuous evolution.

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

## Engineering Working Agreement

These are operating rules, not suggestions. They apply to any AI assistant (Claude, or otherwise) working in this codebase, on top of the philosophy above.

### 1. Confirm before implementing — no exceptions

Never write or edit a file until the plan has been explicitly approved in the conversation.

- For anything beyond a trivial one-liner (a typo, formatting, renaming a local variable), first state: what will change, which files are affected, and any trade-off or alternative worth flagging. Then **stop and wait** for an explicit go-ahead ("go", "ok", "pode implementar", etc.) before touching any file.
- Proposing an approach and immediately implementing it in the same turn is not acceptable, even if the proposal sounds reasonable — the approval has to actually happen.
- If, mid-implementation, the approach needs to change materially from what was approved, stop and re-confirm before continuing rather than improvising forward.
- Read-only exploration (reading files, running tests, searching, checking git status) never needs confirmation — only writes do.

### 2. Default engineering principles

Unless code already in the touched area establishes a different convention (match the existing convention instead), apply:

- **KISS / YAGNI first.** This is a small, Pareto-scoped product (see Overview) — prefer the simplest design that solves today's actual requirement. Do not add abstraction, config, or flexibility for hypothetical future needs; that's what an ADR is for once the need is real.
- **SOLID, applied pragmatically.** Single-responsibility functions/classes, depend on abstractions at real seams (not everywhere), composition over inheritance. The goal is code that's easy to change, not a checklist to satisfy — don't introduce an interface, factory, or strategy pattern for something with one implementation and no evidence it'll need a second.
- **DRY, but not premature.** Remove duplication once a pattern repeats with real, verified sameness. Two similar-looking blocks that may reasonably diverge later are not yet a duplication problem — don't force a shared abstraction just because two things currently look alike.
- **Separation of concerns.** Keep domain/business logic out of controllers and framework glue. Keep infrastructure concerns (DB access, HTTP, third-party SDKs) behind a boundary the domain layer doesn't depend on directly.
- **Think one layer up before writing code.** Before implementing, briefly consider where this belongs in the existing architecture (which layer, which module) rather than defaulting to the shortest edit in the file already open. If the natural placement differs from the obvious/easy placement, say so as part of the plan in rule #1.
- If a request conflicts with these principles (e.g., "just inline it here" would tangle two concerns), say so and propose the alternative — don't silently comply and don't silently override the request either.

### 3. Always present you work
Whenever you have completed a user's command and generated code, you should explain to the user all the changes you did: showcase code, rational and explain decisions.

### 4. Teach as you go
The engineer operating this project is an Android engineer that woud like to expand its knowloge of other technologies.
For this reason, whenever you write new code, you should share relevant information of what was written with the engineer. 
If you apply a new pattern or language feature that you haven't seen in the code yet, teach the user.
Always apply paretto - explain the 20% that represenhts 80% of the useful knowlodge.

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

**Self-check before writing a comment**: would a competent engineer reading the code, types, and names already know this? If yes, delete the comment. Default to zero comments; add one only when that check fails.

This also applies to doc comments (JSDoc/TSDoc): don't add one just to restate a parameter's type or an obvious return value. Reserve them for public API surfaces whose contract or behavior genuinely isn't obvious from the signature alone.
