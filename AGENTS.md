# AGENTS.md — Project Constitution & Operational Guidelines

## 1. Core Operating Principles (Anti-Bloat & Pragmatism)

- **Zero Logic Redundancy (Ponytail Philosophy):** Never add boilerplate logic, unrequested abstractions, premature optimization, or speculative features. Write clean, direct code for business logic while strictly honoring UI/UX richness defined in design skill files (`tasteskill`).
- **Refactor over Expansion:** Prefer simplifying existing code instead of adding new wrapper functions or layers.
- **Fail Fast & Explicitly:** Do not swallow errors with empty `catch` blocks (especially in Tauri `invoke` calls). Log issues with actionable context.
- **Type Safety First:** Strictly typed codebase. Never use `any` unless strictly justified. Ensure all Tauri backend payloads and InnerTube API responses have strict TypeScript interfaces.

## 2. Architecture & Directory Conventions (Tauri Specific)

- **Backend Isolation (`src-tauri/`):** The Rust core is stable. Do not modify Rust files or rename Tauri commands unless explicitly instructed.
- **Feature-Driven Structure:** Organize frontend code by domain/feature (e.g., `features/player/`, `features/search/`, `features/library/`, `features/queue/`).
- **Single Source of Truth:** Centralize shared interfaces (especially Track, Album, Queue types) and Tauri IPC wrappers; never duplicate definitions across files.
- **State Management:** Keep UI-specific state (modals, dropdowns, input fields) local. Keep **Audio/Playback, Queue, and Now Playing state strictly global** so the bottom player bar and views stay seamlessly synchronized across navigation.

## 3. Workflow & Modification Protocol

Before modifying or creating any code, follow these steps:

1. **Understand First:** Read and trace the relevant existing files (especially existing Tauri `invoke` and `listen` calls) before writing code. Do not make assumptions about backend payload structures.
2. **Scoped Changes:** Touch only the files relevant to the current refactoring phase. Do not break working IPC bridges while restructuring UI components.
3. **Verification Step:** Run build and linter checks (`npm run lint && npm run type-check` or `tsc --noEmit`) after modifications to ensure zero regression.

## 4. Code Standards & Prohibitions

- **Dependencies:** Never install new external npm packages (like icon libraries or UI kits) without explicit permission. Check `package.json` first to use what is already installed.
- **Comments:** Do not write obvious comments (e.g., `// renders the play button`). Comment only non-trivial business logic, InnerTube stream edge cases, and complex state syncs.
- **Dead Code:** Clean up unused imports, old UI remnants, commented-out code, and obsolete functions immediately after refactoring a component.

## 5. Session State & Project Memory

- Check `docs/active_tasks.md` at the beginning of each session to know what is in flight.
- Update `docs/active_tasks.md` with:
  - Completed items
  - Known issues / Blockers
  - Next logical steps
