# Protected boundaries

Prompt Spriter is designed around a small number of strong boundaries.

## Shared MCP setup

The user's existing shared MCP setup is external, working infrastructure.

Without explicit user approval, this repository and its agents must not:

- create a repository-local `.mcp.json`;
- edit shared or global MCP configuration;
- install, uninstall, update, replace, or rename an MCP server;
- change MCP commands, ports, permissions, or environment settings;
- persist an experimental configuration.

A read-only capability inventory is allowed before the first live sprite job.
Repository instructions should refer to the discovered Aseprite capabilities
without rewriting the setup.

## Read-only style reference

`C:\Users\headc\Documents\8-bit sprite assembler` is a read-only visual
reference.

Allowed:

- inspect documentation;
- inspect exported sheets and previews;
- describe reusable visual principles inside Prompt Spriter;
- cite exact reference files in internal planning.

Not allowed:

- edit, clean, reset, commit, or reconfigure the repository;
- copy its application architecture wholesale;
- make Prompt Spriter depend on its runtime or internal modules;
- import its MCP configuration;
- claim its complete style has been formally captured without a dedicated
  review.

## No Godot dependency

Prompt Spriter is a browser-first TypeScript application with later optional
Tauri packaging. Godot and Godot MCP are not part of the application, preview
workflow, validation requirements, or build.

## Agent submission versus user review

Agents own staging submissions and technical evidence. After completion, an
agent may invoke Prompt Spriter's documented trusted ingestion command. Prompt
Spriter—not the agent—then owns the resulting writes to:

- stable asset identity;
- immutable ingested revisions;
- candidate lane;
- user notes;
- Archive history;
- the selected approved revision.

An agent submission cannot set approval, Archive state, user notes, or a user
decision. Agents must not author or patch `review.json` directly. Trusted
ingestion may only create or replace the current candidate as an unapproved
Intake revision.

Promptinator claim and completion records are creation-dispatch provenance,
not human review state. The trusted queue command may reserve one Ready entry,
and trusted ingestion may complete that exact claim after Intake registration.
Neither action may approve, revise, archive, restore, or add user notes.

## File safety

- Agents author new work under an assigned staging directory, then may invoke
  trusted ingestion after completion-required validation passes.
- Agents never write directly into `workspace/library/` or transaction folders.
- Ingested revisions are immutable.
- Durable runtime state under `workspace/` (`library/`, `promptinator/`,
  `batches/`) is tracked in git so the asset library is backed up with the
  repository; transient areas (`staging/`, `qa/`, `transactions/`) stay
  untracked.
- No automatic deletion or destructive cleanup is allowed.
- If a path or asset identity is ambiguous, stop before writing.
