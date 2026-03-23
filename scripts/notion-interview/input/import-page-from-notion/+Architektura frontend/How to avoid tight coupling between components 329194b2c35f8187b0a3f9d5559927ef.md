# How to avoid tight coupling between components?

## Core Answer (3–6 bullets MAX)

- Communicate via **props, events, and slots**, not direct imports of sibling logic or stores.
- Use **feature-scoped composables** instead of exposing global state unnecessarily.
- Prefer **interface contracts over implementation details** — consume behavior, not internal state.
- Isolate **side effects** from UI — make components mostly declarative and stateless.
- Apply **separation of concerns**: UI handles rendering, domain logic lives outside.

Mental model: Components should be “black boxes” that only expose what others need to know.

## More details

- Common tight coupling patterns:
    - Siblings directly importing each other’s methods or refs
    - Shared mutable state in a global store for local behavior
    - Components aware of parent/internal DOM structure
- Mitigation strategies:
    - Event-driven communication (`emit`) or composable hooks
    - Dependency injection via props or provide/inject
    - Feature modules encapsulate private logic
- Vue-specific:
    - Avoid `$parent` or `$root` access for coordination
    - Use `v-model` or controlled props for two-way binding
    - Use scoped slots for flexible layout without internal coupling
- Trade-offs:
    - Slightly more boilerplate (props/events) but long-term maintainability
    - Over-abstraction can hide obvious connections; balance is key
- Heuristic:
    - If changing one component requires touching 2+ others → too tight

## Minimal Example (VERY SMALL)

```
<!-- Parent.vue -->
<Child :value="count" @update="count = $event" />

<!-- Child.vue -->
<template><button @click="$emit('update', value + 1)">+</button></template>
<script setup>
defineProps(['value'])
</script>
```