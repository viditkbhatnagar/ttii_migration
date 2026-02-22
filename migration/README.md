# TTII JS Migration Workspace

This directory is the single source of truth for the full PHP to JavaScript migration of TTII.

## Purpose
- Preserve context across separate Codex chats.
- Track phase progress, decisions, risks, and handoffs.
- Enforce strict phase-by-phase execution without scope bleed.

## Required Read Order For Every Phase Chat
1. `MASTER_CONTEXT.md`
2. `PHASE_STATUS.yaml`
3. `PARITY_MATRIX.csv`
4. `DECISIONS.md`
5. `RISKS.md`
6. `OPEN_ISSUES.md`
7. Previous phase handoff (`HANDOFFS/phase-XX.md`)
8. Current phase prompt (`PROMPTS/phase-XX.md`)

## Required Outputs From Every Phase Chat
- Update `PHASE_STATUS.yaml`
- Add `HANDOFFS/phase-XX.md`
- Add `TEST_REPORTS/phase-XX.md`
- Update `DECISIONS.md` and `RISKS.md` if changed
- Update `OPEN_ISSUES.md` with unresolved blockers

## Rules
- Execute only the target phase.
- Do not start next phase.
- No schema redesign until parity is complete.
- Security fixes before migration acceleration.

## Phase Index
- Phase 00: Security stabilization and migration controls
- Phase 01: Legacy inventory and parity contract
- Phase 02: Monorepo/platform foundation
- Phase 03: Data layer parity
- Phase 04: Auth and RBAC
- Phase 05: Integrations layer
- Phase 06: Domain API A (catalog/content)
- Phase 07: Domain API B (assessments)
- Phase 08: Domain API C (commerce/enrollment)
- Phase 09: Domain API D (engagement)
- Phase 10: Domain API E (admin/centre ops)
- Phase 11: React frontend foundation
- Phase 12: React student portal
- Phase 13: React centre portal
- Phase 14: React admin portal
- Phase 15: Hardening, cutover, decommission
