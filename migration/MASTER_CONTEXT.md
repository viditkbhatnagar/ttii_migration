# MASTER_CONTEXT

## Project
- Name: TTII App
- Root: `/Users/viditkbhatnagar/codes/ttii_app`
- Legacy backend: PHP (CodeIgniter 4)
- Legacy public root: `/Users/viditkbhatnagar/codes/ttii_app/public_html`
- Legacy app code: `/Users/viditkbhatnagar/codes/ttii_app/app/app`

## Migration Goal
Rebuild the full application in JavaScript/TypeScript with:
- Frontend: React
- Backend: Node.js
- Requirement: functional parity with current behavior before modernization

## Current Legacy Size Snapshot
- Controllers: ~155 files
- Models: ~101 files
- Views: ~651 files
- App code files in `app/app`: ~1071 files

## Architecture Domains In Legacy
- Admin domain controllers
- Centre domain controllers
- Student App domain controllers
- API domain controllers
- Shared standalone controllers

## High Risk Findings From Initial Audit (to resolve early)
1. Committed secrets and keys in repository.
2. Password reset flow lacks signed expiring token semantics.
3. Payment completion trust boundary is weak for course/order linkage.
4. Zoom secret exposed in browser-side signature generation.
5. File serving endpoint vulnerable to path abuse.
6. Sensitive credential/token data logged in plaintext.
7. OTP flow contains bypass behavior and hardcoded provider credentials.

## Migration Non-Goals (Until Parity Complete)
- No DB redesign.
- No large UX redesign.
- No aggressive refactors not required for parity.
- No feature expansion beyond compatibility needs.

## Target Technical Direction
- Monorepo: API + multiple web apps + shared packages.
- API: Node.js + TypeScript.
- Web: React + TypeScript.
- Data: existing MySQL schema initially.
- Tests: contract + integration + E2E.

## How Context Is Passed Between Separate Chats
Each new phase chat must read files in `/migration` and write a handoff.
No chat memory dependency is allowed.

## Branching and Delivery Strategy
- Small, phase-scoped PRs.
- Keep legacy app running during migration.
- Strangler rollout by route/module.

## Required Definition of Done Per Phase
- Scope completed for target phase.
- Test report created.
- Status and handoff updated.
- Risks/decisions updated if applicable.
