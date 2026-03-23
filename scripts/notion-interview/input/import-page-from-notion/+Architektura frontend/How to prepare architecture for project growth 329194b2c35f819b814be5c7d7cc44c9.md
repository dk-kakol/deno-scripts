# How to prepare architecture for project growth?

## Core Answer (3–6 bullets MAX)

- Optimize for **changeability, not prediction** — design for safe evolution, not hypothetical scale.
- Structure by **business domains (features)** to localize future changes.
- Enforce **clear boundaries and dependency direction** — shared → features, never the opposite.
- Keep **domain logic framework-agnostic** so UI and tooling can evolve independently.
- Invest early in **tooling and standards** (linting, testing, CI) — scaling teams amplifies inconsistency.

Mental model: Growth breaks unclear boundaries first, not performance.

## More details

- Growth usually means:
    - More features
    - More developers
    - More cross-cutting requirements (permissions, analytics, i18n)
- Architectural preparation:
    - Vertical slice structure (`/features/*`)
    - Explicit shared layer (`/shared/ui`, `/shared/utils`, `/shared/http`)
    - No feature-to-feature direct imports
- Dependency rule:
    - App → Features → Shared
    - Domain logic has zero Vue imports
- State management:
    - Multiple small Pinia stores per feature
    - Avoid global mega-store
- Testing strategy:
    - Domain logic: pure unit tests
    - Feature logic: integration tests
    - Critical flows: E2E
- Refactoring strategy:
    - Prefer incremental refactors over rewrites
    - Keep modules small enough to be replaceable
- Common scaling failures:
    - Early over-abstraction (generic engines no one understands)
    - Massive shared utilities folder
    - Tight coupling between UI and API response shapes
- Performance note:
    - Premature micro-optimizations rarely matter early
    - Architectural rigidity hurts more than minor runtime inefficiencies

## Minimal Example (VERY SMALL)

Dependency direction:

```
/app
/features/cart
/features/auth
/shared/ui
/shared/http
```

Allowed:

```
cart → shared
auth → shared
```

Not allowed:

```
cart → auth
```