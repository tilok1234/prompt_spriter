# Prompt Spriter

Prompt Spriter is a local-first sprite production viewer and library for
AI-assisted Aseprite workflows. Its contract-first browser viewer loads
immutable local-library revisions and gives the user direct control over
Intake, Revise, Archive, and approved Library state. A deterministic fixture
remains available when no production library exists.

The intended daily loop is deliberately simple:

1. The user asks an Antigravity agent to create a named sprite or simply create
   the next sprite in the Promptinator queue.
2. The agent follows the repository's category and style documentation, uses the
   existing shared Aseprite Pro MCP setup, validates its output, and submits the
   completed candidate to Intake.
3. The user reviews candidates in Prompt Spriter.
4. The user either approves a candidate into the Library or sends it to Revise
   with notes for a later agent batch.
5. For an approved sprite, **Start revision** opens a separate Revise candidate
   with notes while the approved revision remains protected in the Library.
6. A completed revision job is ingested as the next immutable revision and
   returns to Intake for another manual decision.
7. Several Revise candidates can be selected into a durable revision batch.
   Prompt Spriter generates a copy-ready Antigravity brief without moving or
   resolving any selected item.

For queued creation work, Antigravity atomically claims the next Ready prompt
through the repository command. The claim remains resumable in **In progress**
and becomes **Completed** only after the exact candidate is registered in
Intake. No clipboard step or embedded AI integration is required.

`assembler-inspired-v2@0.1.0` is the production default for new creation work
and still-Ready Promptinator entries. Legacy v1 remains selectable before
dispatch, and every copied, claimed, completed, or ingested revision keeps its
original exact style provenance.

Review actions update only the application-owned `review.json` record. They
never rewrite an ingested source, sheet, thumbnail, or revision manifest.

The authoritative plan is [docs/MASTER_PLAN.md](docs/MASTER_PLAN.md). Current
implementation state is recorded in [docs/STATUS.md](docs/STATUS.md).

Operational documentation:

- [Workflow](docs/WORKFLOW.md)
- [First Antigravity sprite run](docs/ANTIGRAVITY_WORKFLOW.md)
- [Sprite authoring quality gate](docs/SPRITE_AUTHORING_CHECKLIST.md)
- [Prompt calibration](docs/PROMPT_CALIBRATION.md)
- [Promptinator](docs/PROMPTINATOR.md)
- [Protected boundaries](docs/BOUNDARIES.md)
- [Development](docs/DEVELOPMENT.md)
- [Current handoff](HANDOFF.md)

## Development check

```powershell
npm.cmd install
npm.cmd run check
npm.cmd run dev
```

## Protected boundaries

- The user alone controls visual approval.
- Automated checks are validation, not approval.
- The existing shared MCP configuration is protected and must not be changed by
  this project without explicit user approval.
- `C:\Users\headc\Documents\8-bit sprite assembler` is a read-only visual
  reference. Prompt Spriter must not modify or depend on that repository.
- Godot is not part of the Prompt Spriter application or its required workflow.
