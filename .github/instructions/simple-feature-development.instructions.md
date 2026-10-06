---
name: "Simple Feature Development"
description: "Use when building or changing HomeBase features, frontend flows, backend routes, authentication, or household behavior. Prefer simple solutions and working user-facing features over speculative abstractions or over-engineering."
applyTo: ["src/**", "server/src/**"]
---
# Simple Feature Development

- Prefer the smallest complete implementation that solves the user's current problem.
- Build the actual user-facing feature before adding abstractions, configuration, or future-proofing.
- Reuse the existing React, Express, Supabase, and API patterns in the repository.
- Do not preserve obsolete prototype assumptions just to avoid touching dependent code. Remove or update them when the requested feature changes the model.
- Keep data models truthful. Do not represent a multi-member household as a fixed two-person model or duplicate one person's name into multiple fields.
- Keep database values canonical and locale-neutral; format values for users at the UI boundary.
- Before finishing, run the narrowest relevant build, syntax check, or behavior test and report the result.
- Avoid unrelated refactors, speculative features, and extra documentation unless they are needed for the requested feature.
