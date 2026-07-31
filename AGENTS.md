# Prompt Spriter agent instructions

These instructions apply to the entire repository.

## Read first

Before changing anything, read:

1. `README.md`
2. `HANDOFF.md`
3. `docs/STATUS.md`
4. `docs/WORKFLOW.md`
5. `docs/BOUNDARIES.md`
6. the relevant section of `docs/MASTER_PLAN.md`

Follow the live status and current task. Do not begin a later phase merely
because it appears in the master plan.

For a live Antigravity sprite job, also follow
`docs/ANTIGRAVITY_WORKFLOW.md` and its ordered reading list.

## Core workflow rules

- New completed sprite candidates enter Intake.
- When the user asks for the next Promptinator sprite, run the documented
  trusted claim command exactly once and use its complete prompt and expected
  asset ID. Use the exact category and style printed by that claim. v2 is the
  production default; a deliberate legacy-v1 claim must remain v1, and neither
  style may silently fall back to the other. Do not ask the user to copy the
  prompt manually.
- A Promptinator claim is dispatch metadata, not review state. It remains In
  progress through failures and becomes Completed only after trusted ingestion
  registers the exact candidate in Intake.
- After completion-required validation passes, a sprite creation or revision
  job invokes the documented trusted ingestion command and verifies that the
  exact candidate entered Intake.
- Before writing `completion.json`, a sprite job follows
  `docs/SPRITE_AUTHORING_CHECKLIST.md` and repairs visual-gate failures inside
  its current assigned staging job. Creator self-review is not user approval.
- Only the user can approve an exact revision into the Library.
- Automated checks are validation, never visual approval.
- Revision notes belong in Revise, not Intake.
- Archive is available only from Revise.
- Restoring an archived candidate returns it to Revise.
- An approved Library revision remains unchanged while a newer candidate is
  created or revised.

## Protected boundaries

- Do not create or change `.mcp.json` or any shared/global MCP configuration.
- Do not install, update, replace, rename, or reconfigure MCP servers.
- Reuse the user's existing Aseprite Pro MCP setup as-is when a live sprite task
  is authorized.
- Treat `C:\Users\headc\Documents\8-bit sprite assembler` as read-only visual
  reference material.
- Do not add Godot, `project.godot`, or Godot MCP integration.
- Do not approve, archive, add or resolve user notes, or edit application-owned
  review state directly from a sprite creation or revision job.
- The only permitted review-state effect from a sprite job is invoking the
  repository's documented ingestion command after completed staging. That
  command deterministically registers the new candidate in Intake.

If a task appears to require crossing one of these boundaries, stop and explain
the exact proposed change instead of making it.

## Write scope

- Application-development tasks may change only the files needed by the
  requested milestone.
- Sprite jobs author files only in their assigned
  `workspace/staging/<job-id>/` directory. After completion they may invoke the
  documented ingestion command; they must never write Library or review files
  directly.
- Any job-specific Lua, JavaScript, preview, or generator helper is also a
  sprite-job artifact and must remain inside that assigned staging directory.
  A sprite job must not add `tools/create-*`, `tools/build-*`,
  `tools/finish-*`, or other per-sprite generators to the repository root.
- A revision job may read a selected prior revision but must save a new source
  in staging; it must never overwrite an ingested `.aseprite` revision.
- Production library data belongs under the ignored `workspace/` data root, not
  in Git.
- Do not edit unrelated dirty or untracked files.

## Completion

Run:

```powershell
npm.cmd run check
```

Then inspect the exact Git status and diff. Report technical validation and
human visual approval as separate facts.
