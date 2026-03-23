# Feature-based vs layer-based architecture — when to choose which?

## Core Answer (3–6 bullets MAX)

- **Layer-based (horizontal slices)** organizes by technical concern (components, services, stores) — good for small teams and simple domains because structure is predictable and easy to onboard.
- **Feature-based (vertical slices)** organizes by business capability (auth, cart, dashboard) — better for medium/large apps because it reduces cross-module coupling.
- Choose **feature-based** when teams scale, domain complexity grows, or independent feature ownership matters.
- Choose **layer-based** when the app is small, domain logic is thin, and architectural overhead must stay minimal.
- Feature-based improves cohesion; layer-based often leads to cross-layer changes for a single feature.

Mental model: Layer-based optimizes for technology clarity; feature-based optimizes for domain ownership.

## More details

- Layer-based structure:
    - `/components`, `/views`, `/stores`, `/api`
    - A single feature touches many folders → high temporal coupling
    - Refactoring one feature requires navigating the whole tree
    - Tends to create shared global state too early
- Feature-based structure:
    - `/features/auth`, `/features/cart`
    - Each feature contains UI, composables, store, API
    - Changes are localized → better modularity and testability
    - Enables team parallelization and clearer boundaries
- In Vue specifically:
    - Feature-based works well with Pinia modular stores
    - Encourages feature-scoped composables instead of global utilities
- Trade-off:
    - Feature-based can introduce duplication if shared abstractions are not carefully extracted
    - Layer-based can become a “God utils/services” architecture
- Heuristic:
    - If you see frequent PRs touching 6+ folders for one feature → move toward feature-based
    - If the app has <5 major features and low churn → layer-based is fine

## Minimal Example (VERY SMALL)

Layer-based:

```
/components/UserCard.vue
/stores/user.ts
/api/user.ts
```

Feature-based:

```
/features/user/UserCard.vue
/features/user/user.store.ts
/features/user/user.api.ts
```