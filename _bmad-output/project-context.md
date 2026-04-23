---
project_name: 'curso-bmad'
user_name: 'Wesley Silva'
date: '2026-04-22'
sections_completed: ['discovery', 'technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'code_quality_rules', 'workflow_rules', 'critical_rules']
existing_patterns_found: 12
status: 'complete'
rule_count: 67
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- Workspace with two decoupled applications: `church-erp-api` and `church-erp-web`.
- Backend application: Laravel `^12.0` on PHP `^8.3`.
- Backend dev/test tooling: PHPUnit `^12.5.12`, Laravel Pint `^1.27`, Mockery `^1.6`, Faker `^1.23`.
- Frontend application: Next.js `16.2.3` App Router, React `19.2.4`, React DOM `19.2.4`, TypeScript `^5`.
- Frontend styling/UI: Tailwind CSS `^4`, `@tailwindcss/postcss` `^4`, `@radix-ui/react-slot` `^1.2.4`, `class-variance-authority` `^0.7.1`, `clsx` `^2.1.1`, `tailwind-merge` `^3.5.0`.
- Frontend linting/test tooling: ESLint `^9` with `eslint-config-next` `16.2.3`; current web tests use Node's built-in `node:test`.
- Database target from architecture: MySQL 8.4 LTS.
- Run backend commands from `church-erp-api`; run frontend commands from `church-erp-web`.
- Architecture rule: Laravel is the API/domain backend; Next.js App Router is the BFF and UI layer.
- Do not replace the chosen dual-starter architecture with Blade, Livewire, Inertia, or a single full-stack starter.
- Do not introduce a different test framework unless a story explicitly calls for that change.

## Critical Implementation Rules

### Language-Specific Rules

- TypeScript is strict (`strict: true`) and uses the `@/*` alias for imports from `church-erp-web/src`.
- Keep official HTTP contracts in `snake_case`; do not convert API payload fields to `camelCase` at the boundary.
- Frontend TypeScript types for API payloads should mirror Laravel response/request contracts, including `snake_case` field names.
- Use named exports for shared frontend helpers/components unless an existing Next.js convention requires default export, such as route pages.
- PHP classes use `PascalCase`; PHP methods and variables use `camelCase`; database fields and API payload keys use `snake_case`.
- Backend classes must follow SOLID: small cohesive classes, one clear responsibility, dependencies injected when useful, and no domain orchestration inside controllers.
- Do not hash, validate, authorize, or scope tenant-sensitive domain behavior in React; those rules belong in Laravel.
- Laravel service methods that orchestrate writes should use explicit transactions when creating or updating multiple related records.

### Framework-Specific Rules

- Laravel API routes must be versioned under `/api/v1` for product endpoints.
- Laravel controllers in `app/Http/Controllers/Api/V1` should stay thin: receive a FormRequest, call a domain service, and return a Resource/JSON response.
- Backend domain structure is mandatory and rigid when a domain artifact is needed: `app/Domain/{DomainName}/Models`, `Services`, `Resources`, and `Repositories`.
- Put Eloquent models close to the domain in `app/Domain/{DomainName}/Models` when they represent business entities; keep Laravel's default `App\Models\User` only when already established or explicitly required.
- Use Laravel `FormRequest` classes for request validation and user-facing validation messages.
- Use `JsonResource` / `ResourceCollection` for successful Laravel API responses; do not invent global response wrappers.
- Use Laravel policies/middleware/services for authorization and tenant scoping; never rely on frontend checks for access control.
- Every relevant backend query, model relationship, policy, and service must preserve tenant isolation through `church_id`.
- Next.js App Router pages live under `src/app`; BFF route handlers live under `src/app/api`.
- Browser code should call the Next.js BFF. Authenticated or tenant-sensitive browser flows must not call Laravel directly.
- BFF-to-Laravel calls should go through `src/lib/api/client.ts`, which sets internal audience/issuer headers and uses `cache: "no-store"`.
- Keep frontend state local/by feature unless a story proves shared state is necessary.
- `src/components/ui` contains primitive, domain-agnostic components; `src/components/design-system` applies product tokens/variants; `src/components/operational` composes real operational blocks.
- `shadcn/ui` is a technical primitive foundation, not the final product language. Product UI must use the approved tokens, themes, density, and "Teal Operacional" direction.

### Testing Rules

- Backend tests live under `church-erp-api/tests`; use Laravel/PHPUnit conventions already present in the project.
- Use Feature tests for API behavior, persistence, validation, authorization, tenancy, and multi-record workflows.
- Use `RefreshDatabase` for Laravel tests that touch persistence.
- Test successful writes by asserting both HTTP response shape and database state.
- Test validation failures with user-facing messages when a story requires simple operational language.
- Do not mark backend story tasks complete until relevant `php artisan test` coverage passes.
- Frontend tests currently use Node's built-in `node:test` through `npm test`; do not introduce Jest, Vitest, or Playwright unless a story explicitly requires it.
- Web smoke tests may assert file existence, BFF boundaries, environment variables, and route-handler/client conventions.
- For BFF route handlers, test that browser-facing routes call Laravel through `src/lib/api/client.ts` patterns rather than exposing Laravel directly.
- Keep tests focused on the story's risk: tenant isolation, validation, authorization, transactionality, and BFF boundaries deserve more coverage than static shell UI.

### Code Quality & Style Rules

- Follow SOLID in backend classes: one responsibility per class, cohesive methods, explicit dependencies, and no god services/controllers.
- Controllers should not contain business orchestration, persistence choreography, hashing decisions, or tenant rules; delegate to domain services and policies.
- Prefer Laravel conventions before custom abstractions. Add repositories only when query complexity or reuse justifies them.
- Keep domain services named by use case, e.g. `CreateInitialChurchSetupService`, `CreateFinancialEntryService`.
- Use migrations and database constraints to protect invariants that must hold beyond application code.
- Keep API error messages user-facing when they return to the BFF; avoid leaking technical exception text.
- Use semantic design tokens and shared components before adding page-specific styling.
- Avoid generic frontend names like `DashboardCard`, `InfoWidget`, or `GenericPanel`; name components by real operational purpose.
- Keep frontend primitives domain-agnostic. Do not put finance, people, church, auth, or tenant rules into `src/components/ui`.
- Do not add comments for obvious code. Add short comments only where a business rule, tenancy constraint, or transaction boundary is easy to miss.
- Preserve existing ASCII style unless editing a file that already intentionally uses accents or non-ASCII content.

### Development Workflow Rules

- Treat `_bmad-output/planning-artifacts` and `_bmad-output/implementation-artifacts` as the source of approved product, architecture, sprint, and story context.
- Before implementing a story, read the story file, architecture, relevant PRD/UX sections, sprint status, and this `project-context.md`.
- Keep BMAD story status/checklists aligned with the actual code state; do not mark tasks complete before implementation and tests are done.
- Each story should update its Dev Agent Record with commands/tests run and relevant implementation notes.
- Use a fresh context window for BMAD workflows such as story creation, dev story, QA, and code review.
- Run backend validation from `church-erp-api` and frontend validation from `church-erp-web`.
- Respect unrelated dirty worktree changes. Do not revert user or agent changes outside the current task.
- Prefer focused changes that match the current story. Do not perform broad refactors unless the story explicitly requires them.
- Code review should be done from a clean context and should prioritize bugs, regressions, tenancy leaks, missing tests, and architecture violations.

### Critical Don't-Miss Rules

- Never bypass tenant isolation. Any domain data tied to a church must be created, queried, authorized, and audited with `church_id` in mind.
- Never let frontend checks be the only authorization or validation layer for sensitive actions.
- Never let the browser call authenticated Laravel endpoints directly; route browser traffic through the Next.js BFF.
- Never return passwords, secrets, internal JWTs, stack traces, or raw exception details in API/BFF responses.
- Never log passwords or request payloads containing secrets.
- Do not create financial mutation flows without explicit auditability and a persisted reason when the story requires reversibility/audit.
- Do not mix UI primitives, design-system wrappers, and operational/domain components into one layer.
- Do not build generic SaaS dashboard UI when the UX calls for operational homes by role, clear next actions, and pastoral/non-corporate language.
- Do not create a separate roles/permissions subsystem unless the current story requires it; early bootstrap may use simple `church_user.role` where approved.
- Do not add speculative fields, tables, integrations, queues, caches, or global state unless tied to a story acceptance criterion or architecture decision.
- Do not change the dual-app architecture to simplify a single flow.
- Do not mark a BMAD story as `done` unless implementation, tests, story checklist, and Dev Agent Record are all aligned.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code.
- Follow all rules exactly as documented.
- When in doubt, prefer the more restrictive option.
- Update this file if new durable project patterns emerge.

**For Humans:**

- Keep this file lean and focused on agent needs.
- Update it when the technology stack, architecture, or implementation patterns change.
- Review periodically for outdated rules.
- Remove rules that become obvious or redundant over time.

Last Updated: 2026-04-22
