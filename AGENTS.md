# Prompt Spriter agent instructions

These instructions apply to the entire repository.

## Read first

Before changing anything, read:

1. `README.md`
2. `docs/STATUS.md`
3. `docs/WORKFLOW.md`
4. `docs/BOUNDARIES.md`
5. the relevant section of `docs/MASTER_PLAN.md`

Follow the live status and current task. Do not begin a later phase merely
because it appears in the master plan.

For a live Antigravity sprite job, also follow
`docs/ANTIGRAVITY_WORKFLOW.md` and its ordered reading list.

## Core workflow rules

- New completed sprite candidates enter Intake.
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
- Do not approve, archive, or edit application-owned review state from a sprite
  creation or revision job.

If a task appears to require crossing one of these boundaries, stop and explain
the exact proposed change instead of making it.

## Write scope

- Application-development tasks may change only the files needed by the
  requested milestone.
- Sprite jobs write into their assigned `workspace/staging/<job-id>/` directory.
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
