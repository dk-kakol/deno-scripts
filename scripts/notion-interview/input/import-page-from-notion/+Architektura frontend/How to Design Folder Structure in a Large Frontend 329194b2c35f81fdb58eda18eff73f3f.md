# How to Design Folder Structure in a Large Frontend App

## Core Answer (3–6 bullets MAX)

- Prefer **feature-based (domain-driven) structure** over purely technical grouping.
- Keep **shared logic isolated** (`shared/`, `components/`, `lib/`, `composables/`).
- Separate **UI (presentation) from business logic** (stores, services, hooks).
- Co-locate related files (component + styles + tests).
- Structure should reflect **how the team thinks about the product**, not the framework.

Mental model: Organize by *what the app does*, not by *file type*.

---

## Recommended High-Level Pattern (Feature-Based)

```
src/
  app/                # app bootstrap, router, providers
  shared/             # reusable UI, utils, composables
  features/
    auth/
      components/
      pages/
      store.ts
      api.ts
      types.ts
    dashboard/
      components/
      widgets/
      api.ts
  entities/           # domain models (User, Order, etc.)
  processes/          # cross-feature workflows
```

---

## Why Feature-Based > Type-Based?

### ❌ Type-based (hard to scale)

```
components/
views/
store/
api/
utils/
```

Problems:

- Business logic scattered.
- Hard to refactor a single feature.
- Ownership unclear.

### ✅ Feature-based (scales better)

- Everything related to `auth` lives in one place.
- Easier onboarding.
- Easier deletion/refactor of entire feature.

---

## Key Design Principles

### 1. Separate Shared vs Feature Code

- `shared/` → truly reusable across domains.
- `features/` → business-specific modules.

### 2. Co-location

Keep:

```
UserCard.vue
UserCard.spec.ts
UserCard.module.css
```

Together → better maintainability.

### 3. Layering (Optional for Large Systems)

```
features/
  orders/
    ui/
    model/
    api/
```

UI → Model (state) → API

Clear dependency direction prevents spaghetti.

---

## Vue / Nuxt Specific Notes

- Use:
    - `composables/` for reusable reactive logic.
    - `stores/` (Pinia) inside feature if feature-scoped.
- In Nuxt:
    - `server/api/` for backend routes.
    - Keep domain separation even inside auto-import folders.

---

## Scaling Strategy

Small app → simple feature folders

Medium app → add `shared/` and clear boundaries

Large app → introduce layers (entities / features / processes)

---

## Anti-Patterns

- Dumping everything into `components/`
- Global `utils/` becoming a garbage folder
- Mixing domain and UI logic
- Deep nested folders without clear boundaries

---

## Rule of Thumb

If deleting a feature requires touching many unrelated folders → your structure is wrong.

---