# Prompt Spriter Master Plan

**Status:** Active - Phase 4 revision batches underway; v2 production style promoted
**Plan version:** 0.4
**Date:** 2026-07-31
**Repository:** `tilok1234/prompt_spriter`

## 1. Product definition

Prompt Spriter is a local-first Windows application that combines:

- an animated sprite-sheet viewer;
- an Intake queue for new AI-created candidates;
- a Revise queue for reviewed candidates with actionable notes;
- a manually approved sprite Library;
- a recoverable Archive reachable only from Revise;
- an extensible category-contract system;
- versioned visual style profiles;
- a durable record of sources, exports, prompts, validation, batches, and
  revisions.

The program is not the sprite creator. The user asks an Antigravity agent to
create or revise a sprite from a chat started in this repository. The agent uses
Aseprite through the user's existing shared Aseprite Pro MCP setup. Prompt
Spriter receives, validates, displays, organizes, and preserves the resulting
artifacts.

The product should make the normal workflow obvious without turning it into a
large approval bureaucracy.

## 2. Core daily workflow

### 2.1 Creation

1. The user starts Antigravity from the repository.
2. The user asks for a sprite, for example:
   `Create a 32x32 enemy mob lion.`
3. For a queued request, the agent atomically claims the lowest Ready
   Promptinator entry; otherwise it uses the named user request. The agent then
   reads the applicable repository instructions, category contract, and style
   profile.
4. The agent creates the sprite in Aseprite, exports it, runs the documented
   technical checks, and writes a completion marker last.
5. The agent invokes Prompt Spriter's trusted ingestion command, which
   registers the completed candidate in Intake without granting the agent any
   user review decision. If the job carries an active Promptinator claim, that
   same handoff completes and links the queue entry.

The user does not need to review the candidate immediately. Intake is allowed to
accumulate across a session or several sessions.

### 2.2 Candidate lanes and Library membership

The three primary user-facing areas are:

- **Intake:** completed candidates waiting for the user's decision;
- **Revise:** reviewed candidates carrying notes for future agent work;
- **Library:** manually approved revisions.

Archive is secondary storage rather than a primary work area.

Intake, Revise, and Archive describe the current candidate's work lane. Library
membership records an approved revision. These are deliberately separate. An
asset may remain safely represented in the Library by revision `r003` while a
new working candidate `r004` is in Revise or Intake.

### 2.3 Allowed transitions

```text
Antigravity completion -> Intake
Intake -> Approve -> Library
Intake -> Send to Revise -> Revise
Revise -> Agent produces a new revision -> Intake
Revise -> Archive
Archive -> Restore -> Revise
Library revision -> Create separate working candidate -> Revise
```

Rules:

- There is no direct `Intake -> Archive` action.
- There is no direct `Library -> Archive` action.
- Archive is available only for an item currently in Revise.
- Restoring an archived item returns it to Revise with its notes and history.
- The agent cannot approve, archive, or change the user's review state.
- A new revision of a Library asset does not replace or modify the approved
  revision. The approved revision stays safe until the user approves a
  replacement.
- Approving a candidate updates the exact approved revision and clears that
  candidate from the active Intake/Revise lane.
- Archiving a working candidate does not remove an older approved revision from
  the Library.

### 2.4 Validation is not approval

The agent and automated tools may report:

- validation passed;
- validation passed with warnings;
- validation failed;
- validation could not be completed.

They may not report a sprite as visually approved. Approval is a manual action
performed by the user in Prompt Spriter against one exact revision.

A technically invalid candidate may still appear in Intake with a clear warning
so it can be inspected or repaired.

## 3. Revision and batch workflow

### 3.1 Revisions

Every material AI change creates a new immutable revision under the same asset
identity:

```text
enemy-lion-001
  r001 - original candidate
  r002 - larger mane
  r003 - stronger attack motion
```

Prompt Spriter displays the latest revision by default while retaining
side-by-side comparison with earlier revisions.

Approval selects one exact revision. Earlier candidates are retained unless the
user deliberately deletes them through a future maintenance feature.

### 3.2 Revise notes

The Revise area supports notes at these levels:

- general asset note;
- direction;
- animation;
- optional frame number or range;
- details that must be preserved;
- optional local visual reference;
- priority.

Notes are not a chat system. Their purpose is to let the user review several
sprites, record actionable feedback, and later hand a clear revision batch to
an agent.

### 3.3 Batches

Batches remain useful as metadata and filters, not as the primary storage
hierarchy.

Prompt Spriter records:

- creation batch or Antigravity session;
- revision batch;
- creation date;
- included asset IDs;
- current outcome counts.

The user can select Revise items and generate a concise revision-batch brief.
The user then asks Antigravity to process that named batch. When the agent
finishes an item, the new candidate revision returns to Intake.

The first version does not automatically launch or message Antigravity. A
user-started Antigravity agent may atomically claim the next Promptinator entry
through a repository command, which is dispatch coordination rather than
automatic agent launching.

## 4. Category contracts

### 4.1 Extensible category packages

Categories are data-driven packages discovered by the application rather than
hard-coded UI branches. Examples include:

- Enemy Mob 24x24;
- Enemy Mob 32x32;
- Enemy Mob 48x48;
- Enemy Boss 48x48;
- Enemy Boss 64x64;
- Player Character 24x24;
- Player Character 32x32;
- Player Character 48x48;
- later mounts, NPCs, icons, weapons, effects, and other categories.

Each category package defines:

- stable category ID and display name;
- logical frame width and height;
- directions and their canonical order;
- required and optional animations;
- exact frame counts or permitted ranges;
- timing defaults and permitted timing ranges;
- source-canvas and export-sheet rules;
- ground point, pivot, and optional attachment-point rules;
- transparency and alpha rules;
- palette or color-count constraints where applicable;
- naming and folder conventions;
- Aseprite layer and tag expectations;
- optional Aseprite template and curated reference set;
- technical validators;
- viewer defaults;
- category-specific AI guidance;
- contract version and migration policy.

A category package must pass schema and semantic validation before an agent or
the viewer can use it.

### 4.2 Initial category

The first production category is `enemy-mob-32`.

Target direction contract:

1. down;
2. left;
3. right;
4. up.

Target animation set:

- idle;
- walk;
- run;
- attack;
- hurt;
- cast;
- death.

Exact final frame counts will be frozen in the category contract before the
first full-category acceptance test. The initial pipeline test may use only
idle, walk, and attack so structural problems are found before producing the
full animation set.

Side directions may be mirrored only when allowed by the category and asset
symmetry rules. Asymmetric equipment, markings, injuries, or attachments
require an explicit direction policy.

### 4.3 Category expansion

The first release may add categories by creating a validated package manually.
A visual category-creation wizard is a later convenience, not an MVP
requirement.

## 5. Style profiles and iterative improvement

### 5.1 Style is separate from category

A category specifies what must be produced. A style profile specifies how it
should look and move.

This separation allows an `enemy-mob-32` lion to use the production-default
`assembler-inspired-v2` style without inheriting the reference assembler's
24x24 layout. Legacy v1 revisions keep their exact original provenance.

### 5.2 Initial reference

`C:\Users\headc\Documents\8-bit sprite assembler` is a read-only visual
reference. Initial observations to formalize in the first style profile include:

- compact readable silhouettes;
- small controlled palettes;
- crisp hard-edged pixels;
- simplified anatomy with strong identifying features;
- clear direction-aware poses;
- restrained internal detail;
- consistent grounding and spacing;
- transparent backgrounds without baked shadows;
- nearest-neighbor presentation.

Prompt Spriter must not:

- modify that repository;
- copy its application architecture into this project;
- depend on its code or runtime;
- import its MCP configuration;
- silently treat every reference asset as an approved target.

Any later examination of the repository remains read-only and question-driven.

### 5.3 Versioned style evolution

Style profiles are immutable once used by an asset revision. Improvements create
new versions, for example:

- `assembler-inspired-v1.0`;
- `assembler-inspired-v1.1`;
- `assembler-inspired-v2.0`.

A Style Lab workflow may:

1. analyze current approved, revised, and archived visual evidence;
2. propose specific changes to written rules and references;
3. generate a small canary set across different subject types and poses;
4. show old/new comparisons;
5. wait for the user's decision;
6. promote an explicitly selected style version.

Promoting a style version does not redraw or relabel existing Library assets.
Remastering is an explicit per-asset or selected-batch action.

`assembler-inspired-v2@0.1.0` was promoted to the production creation default
on 2026-07-31. This was a user decision about the style contract and dispatch
default, not visual approval of an individual candidate or a golden example.

Style Lab is planned after the core Intake/Revise/Library loop is reliable.

## 6. Agent workflow and protected boundaries

### 6.1 Normal Antigravity operation

Antigravity is initially an external, user-started worker:

1. the user starts a chat from the repository;
2. the agent reads the root instructions;
3. the user provides a creation request, asks for the next Promptinator entry,
   or provides a revision-batch name;
4. the agent uses Aseprite Pro MCP;
5. the agent renders and inspects the exact output artifact in Aseprite;
6. the agent writes only the assigned asset/job outputs;
7. the agent validates and completes the job;
8. Prompt Spriter ingests the candidate.

There is no Antigravity API, embedded chat, automatic dispatch, or model-specific
application integration in the MVP.

### 6.2 Lightweight paved road

The project should make the correct operation easy without creating many formal
workspace types.

For a creation job, the agent should be able to resolve:

- the selected category contract;
- the selected style profile;
- the assigned asset ID and output location;
- an Aseprite template where appropriate;
- a manifest stub;
- one documented validation command;
- the completion-marker rule.

The agent should not improvise paths, IDs, layout, required animations, or the
meaning of approval.

### 6.3 Shared MCP protection

The user's existing shared MCP setup is protected infrastructure.

Prompt Spriter and its agents must not, without explicit user approval:

- edit global or shared MCP configuration;
- install, uninstall, update, or replace an MCP server;
- rename a server;
- change server commands, ports, permissions, or environment settings;
- introduce a repository-local MCP configuration that shadows the shared setup;
- persist experimental MCP changes.

Before the first live sprite job, an agent may perform a read-only capability
inventory and document the MCP tool names it can currently see. The repository
instructions should refer to capabilities rather than assume a hard-coded
installation path.

### 6.4 Asset write boundary

A sprite-creation or revision task may modify only:

- its assigned staging/job directory;
- its own validation and completion evidence.

It may not modify application code, category contracts, style profiles,
repository instructions, review states, or unrelated assets unless the user
explicitly requests a development or design change.

For a revision job, the agent may read the selected base revision but must save
the changed `.aseprite` source as a new staging output. It must never save over
an ingested revision in place.

Only one active job may revise a particular asset at a time.

## 7. Asset and library model

### 7.1 Canonical records

The canonical library consists of ordinary asset folders and versioned
manifests. A database is a rebuildable index, not the only copy of important
metadata.

Write ownership is separated:

- the agent writes a staging submission and its validation evidence;
- ingestion creates the immutable revision record;
- Prompt Spriter owns asset identity and human review records;
- only viewer actions may change the approved revision, candidate lane, Archive
  state, or user notes.

An agent submission cannot set or suggest an approval state.

Each asset has:

- permanent asset ID;
- human-readable name;
- category ID and contract version;
- style-profile ID and version;
- creation and revision history;
- optional current candidate revision and its `intake`, `revise`, or `archive`
  lane;
- optional approved revision;
- creation and revision batch IDs;
- prompt/provenance information;
- validation summaries;
- review notes;
- references to source, export, preview, and evidence files.

Each revision records:

- revision ID and parent;
- creation time;
- agent/model label as reported by the job;
- original request or revision brief;
- `.aseprite` source;
- exported PNG sheet or sheets;
- thumbnails and animated/static review material;
- animation/direction metadata and timing;
- hashes for important artifacts;
- validation results;
- category and style versions used.

### 7.2 Stable physical paths, logical views

Intake, Revise, Library, and Archive are logical views over stable asset IDs.
Changing a candidate lane or approved revision should not repeatedly move or
rename large asset folders.

An illustrative data layout is:

```text
workspace/
  staging/
    <job-id>/
  assets/
    <asset-id>/
      asset.json
      review.json
      revisions/
        r001/
          revision.json
        r002/
          revision.json
  batches/
    creation/
    revision/
  index/
```

`asset.json` stores application-owned identity and contract references.
`review.json` stores application-owned candidate-lane, approved-revision, notes,
and Archive history. Each immutable revision directory contains its own
`revision.json` plus source and generated artifacts. The precise schema is
defined in Phase 1.

The `workspace/` data directory is local application data and is ignored by Git.
Keeping it under the repository during the first vertical slice makes it easy
for an agent started from the repository to access. The storage layer must later
support a user-selected library root without changing asset contracts.

The Git repository contains code, documentation, schemas, tests, and small
fixtures—not the user's growing production library.

### 7.3 Ingestion and partial-write safety

Agents write into `workspace/staging/<job-id>`. They create the completion marker
last. The viewer or ingestion command ignores incomplete staging directories.

On completion:

1. parse the job and manifest;
2. validate paths and IDs;
3. verify required files exist;
4. run structural validation;
5. calculate important hashes;
6. register a new immutable revision;
7. set the new candidate lane to Intake in the application-owned review record;
8. retain validation warnings for display.

Duplicate IDs, unexpected absolute paths, traversal outside the library root,
and attempts to overwrite an existing revision must fail safely.

### 7.4 Index and backups

The first vertical slice should scan manifests directly. SQLite indexing is
introduced only when real library size or query performance justifies it.

The application must eventually support:

- rebuild index from manifests;
- integrity scan;
- portable library export;
- restore from a portable export;
- user-directed snapshots/backups;
- missing-file reporting;
- storage usage reporting.

No automatic deletion or destructive cleanup is allowed.

## 8. Viewer experience

### 8.1 Primary navigation

- Intake;
- Revise;
- Library;
- Categories;
- Styles;
- Batches;
- Promptinator creation-request queue;
- Archive through a secondary filter or menu;
- Settings.

### 8.2 Asset browser

The browser should support:

- category, size, state, validation, style, tag, date, and batch filters;
- search by name, ID, prompt text, and notes;
- thumbnail and compact-list modes;
- clear counters for Intake and Revise;
- sorting by newest, oldest, category, and priority.

### 8.3 Sprite review

The review view should provide:

- animation selection;
- direction selection;
- configured FPS/timing playback;
- pause and frame stepping;
- crisp nearest-neighbor zoom;
- 1x/native-scale view;
- transparent checkerboard and selectable solid backgrounds;
- frame bounds, pivot, ground point, and optional attachment overlays;
- all-directions and all-animations overview;
- side-by-side revision comparison;
- manifest, contract, style, prompt, batch, and validation information;
- open exact source or review artifact in Aseprite;
- Approve and Send to Revise actions when viewing Intake;
- notes and revision-batch controls when viewing Revise;
- Archive action only when viewing Revise.

### 8.4 AI Review Mode

The web application should expose a deterministic, read-only review route for an
asset revision. It should render the same slicing, timing, pivots, and metadata
that the user-facing viewer uses.

The route or a companion command can create a review screenshot/contact sheet
for agent inspection. This verifies application interpretation after Aseprite
creation without requiring the agent to control the whole desktop UI.

AI Review Mode does not grant approval or mutation controls.

### 8.5 Library retrieval and export

The Library must make approved work easy to use again. It should support:

- open the exact approved source in Aseprite;
- reveal the stable asset folder;
- export or copy the approved PNG sheet and manifest;
- export a self-contained asset package;
- duplicate an approved asset as a new Intake candidate while retaining
  provenance;
- later add engine-specific export profiles without changing the canonical
  source.

Intake and Revise may export review material, but game-ready export actions
should default to the exact approved Library revision.

## 9. Technical architecture

### 9.1 Chosen direction

- **Frontend:** React with TypeScript;
- **Development/build:** Vite;
- **Rendering:** browser image/canvas primitives with nearest-neighbor rules;
- **Validation/contracts:** shared TypeScript modules and JSON Schema where
  appropriate;
- **Desktop packaging:** Tauri after the browser workflow is stable;
- **UI testing:** Playwright for deterministic application behavior and review
  screenshots;
- **Persistence:** file manifests first, optional rebuildable SQLite index later.

Tauri is frontend-agnostic and officially recommends Vite for SPA frontends.
Vite supports a React TypeScript template. The plan therefore keeps the early
viewer easy to run in a normal browser while preserving a path to a Windows
desktop package:

- [Tauri frontend configuration](https://v2.tauri.app/start/frontend/)
- [Vite getting started](https://vite.dev/guide/)
- [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots)

Vite transpilation is not a type-checking gate, so the project must run an
explicit TypeScript check in validation.

### 9.2 Deliberate exclusions

The core application will not use:

- Godot;
- Godot MCP;
- Electron;
- an embedded AI chat;
- automatic Antigravity dispatch;
- cloud accounts or cloud storage;
- multi-user permissions;
- a custom Prompt Spriter MCP in the MVP;
- a mandatory database before the manifest model is proven.

An optional engine preview, custom read-only MCP, or additional export adapter
may be considered later as a separate feature. None is a prerequisite for the
core workflow.

The Promptinator `claim-next` command is not automatic dispatch: it neither
launches nor messages Antigravity. It only lets an already user-started agent
reserve one queue entry without a clipboard round trip.

## 10. Validation and quality strategy

### 10.1 Structural validation

Validators should cover:

- PNG format and dimensions;
- expected grid and frame counts;
- required directions and animations;
- Aseprite tags/layers where inspectable;
- alpha/transparency policy;
- empty or duplicate frames;
- clipping and boundary contact;
- pivot and ground-point validity;
- path and filename safety;
- manifest/schema correctness;
- file existence and hashes;
- revision immutability;
- category/style compatibility.

Boundary contact may be advisory unless it clips, bleeds, breaks motion, or
violates an explicit category rule.

### 10.2 Application tests

Tests should cover:

- legal and illegal review-state transitions;
- Archive visibility only in Revise;
- restored Archive items returning to Revise;
- approved revision immutability;
- approved Library membership remaining intact while a newer candidate is in
  Intake, Revise, or Archive;
- rejection of agent submissions that attempt to set review or approval fields;
- creation and revision ingestion;
- interrupted/partial job handling;
- duplicate ID and path traversal rejection;
- manifest re-indexing;
- batch brief generation;
- animation slicing, direction order, and timing;
- nearest-neighbor rendering;
- filters and search;
- backup/restore round trips when implemented.

Automated screenshot comparisons prove UI/rendering consistency. They do not
constitute visual approval of sprite art.

### 10.3 Human visual review

The user is responsible for:

- deciding whether the sprite matches the intended subject and style;
- judging animation quality and readability;
- writing revision notes;
- approving the exact selected revision;
- promoting a proposed style profile.

The system should minimize other manual work.

## 11. Delivery phases

### Phase 0 - Plan and repository foundation

Deliver:

- approved master plan;
- concise root operating instructions;
- protected-boundary documentation;
- initial folder structure;
- contribution and validation commands;
- no MCP configuration changes.

Exit condition: the repository clearly states what agents may and may not do.

### Phase 1 - Contracts and minimal intake viewer

Deliver:

- asset, revision, batch, category, style, validation, and completion schemas;
- `enemy-mob-32` category draft;
- `assembler-inspired-v1` style-profile draft;
- small deterministic fixture asset;
- browser viewer shell;
- Intake list and asset review route;
- manifest scan and validation CLI.

Exit condition: a fixture can be ingested and displayed correctly without a
database or desktop package.

### Phase 2 - First Antigravity/Aseprite vertical slice

Deliver:

- read-only MCP capability inventory;
- documented creation-job template;
- staging and completion-marker workflow;
- first real `enemy-mob-32` lion candidate;
- initial idle, walk, and attack directions;
- validation report and review material;
- ingestion into Intake.

Exit condition: the user can review the first real AI-created candidate in the
viewer. Completion does not imply visual approval.

### Phase 3 - Review workflow

Deliver:

- manual Approve action;
- Send to Revise with notes;
- immutable revisions;
- side-by-side comparison;
- Revise queue;
- Archive available only from Revise;
- restore Archive to Revise;
- Library view;
- protected approved revision when starting new work.

Exit condition: the complete `Intake -> Revise -> Intake -> Library` loop works,
including Archive restrictions.

### Phase 4 - Revision batches

Deliver:

- creation-session/batch metadata;
- multi-select in Revise;
- generated revision-batch brief;
- documented Antigravity revision workflow;
- new agent revision returning to Intake;
- batch filters and outcome counts.

Exit condition: the user can review several sprites, write notes, generate one
batch, and have an agent return new revisions without losing history.

### Phase 5 - Full first category and style baseline

Deliver:

- frozen `enemy-mob-32` animation/frame contract;
- full idle, walk, run, attack, hurt, cast, and death support;
- category-specific structural checks;
- curated style examples and counterexamples;
- production-default style-profile version (v2 is promoted; curated golden
  evidence remains pending);
- more than one subject proving the category is not lion-specific.

Exit condition: the user approves the category/style baseline for expansion.

### Phase 6 - Library durability and search

Deliver:

- complete filtering and search;
- approved asset retrieval and self-contained export;
- duplication into a new Intake candidate with provenance;
- integrity scan;
- portable backup/export and restore;
- missing-file reporting;
- storage reporting;
- optional SQLite index only if justified by measured library behavior.

Exit condition: the library can be reconstructed from manifests and safely
backed up.

### Phase 7 - Windows desktop package

Deliver:

- Tauri wrapper;
- user-selected library root;
- Windows installer or portable package decision;
- file-open integration for Aseprite;
- packaged smoke tests;
- migration from the repo-local development workspace.

Exit condition: the user can operate Prompt Spriter as a normal Windows
application without losing the browser-testable core.

### Phase 8 - Style Lab and category expansion

Deliver:

- style proposal/canary/comparison workflow;
- explicit style-version promotion;
- remaster batches;
- additional categories;
- optional category authoring UI after manual packages are proven.

Exit condition: style and category evolution work without rewriting existing
asset history.

## 12. MVP acceptance criteria

The first meaningful MVP is complete when:

1. Antigravity can create a documented job without modifying shared MCP config.
2. An Aseprite source and generated outputs are ingested through a completion
   marker.
3. The viewer displays the candidate in Intake using contract-defined slicing
   and timing.
4. The user can inspect directions, animations, frames, metadata, and
   validation.
5. The user can approve the exact revision into Library.
6. The user can instead send it to Revise with notes.
7. A revision batch can produce a new immutable revision that returns to Intake.
8. Archive is available only in Revise and restores only to Revise.
9. Approved revisions cannot be overwritten.
10. An approved Library revision remains available while a newer working
    candidate moves through Revise or Archive.
11. The manifest store can be re-scanned without losing review state.
12. The exact approved revision can be retrieved and exported without including
    an unapproved working candidate.

Packaging, Style Lab, a category wizard, SQLite, a custom MCP, and automatic
agent launching are not required for this MVP.

## 13. Decisions still requiring explicit freeze

The decisions needed for the first live lion job remain frozen in:

- `categories/enemy-mob-32/category.json`;
- `styles/assembler-inspired-v1/style.json`;
- `docs/ASEPRITE_CONTRACT.md`;
- `jobs/templates/enemy-mob-32-first-slice.md`.

Changing one of these contracts after the live run begins requires an explicit
version or a clearly identified correction, never a silent rewrite.

For new creation work, `styles/assembler-inspired-v2/style.json` is now the
active production default. The v1 file above remains the immutable legacy
contract for revisions that already reference it.

Before packaging:

- default production-library location;
- portable versus installed Windows distribution;
- backup destination and retention preferences;
- whether Aseprite should open through a configured path or system association.

These decisions do not block repository foundation or the first fixture-based
viewer.

## 14. Change control

The plan is contract-first but should remain lightweight.

- Changes to the daily review flow require user agreement.
- Changes to category or style contracts create explicit versions.
- Technical validation never changes human review state.
- New integrations remain optional until proven necessary.
- Shared MCP and external reference repositories remain protected.
- Completed phases must be verified from the live repository and working
  artifacts before being reported complete.

## 15. Reassessment after workflow clarification

The consolidated plan was reassessed against the user's actual daily workflow.
The following adjustments are incorporated into version 0.2:

### Kept

- direct Antigravity chat as the way sprite work is requested;
- Aseprite Pro MCP as the required creation and source-inspection tool;
- Intake as an accumulating review queue;
- Revise as the only place for actionable review notes and revision batches;
- manual approval into the Library;
- Archive as recoverable storage available only from Revise;
- versioned category contracts and style profiles;
- browser-first viewer with a later Tauri package.

### Simplified or removed

- no Denied state;
- no general-purpose WIP status in the UI;
- no message exchange with the agent through Intake;
- no large set of formal agent workspace types;
- no embedded chat or automatic Antigravity dispatch;
- no Godot or Godot MCP integration;
- no database, custom MCP, category wizard, or Style Lab in the first MVP.

### Corrected

- Library membership and candidate workflow lane are separate, allowing an
  approved revision to remain safe while a newer candidate is revised;
- agent submissions and user-owned review state are separate records;
- revision agents write a new staging source instead of overwriting an existing
  `.aseprite` revision;
- batches organize and dispatch work without becoming the physical storage
  hierarchy.

### Reassessment conclusion

No additional top-level workflow state is needed. The plan should proceed with
the smallest complete loop:

```text
Antigravity -> Intake -> Approve -> Library
                     \-> Revise -> new candidate -> Intake
                               \-> Archive
```

The next planning freeze should focus on the first category, Aseprite source
contract, and minimal fixture/viewer—not on additional workflow machinery.

## 16. Reassessment after Phase 1 implementation

Version 0.3 was reassessed against the working contracts, validator, fixture,
and browser viewer.

### Result

- The three main lanes remain sufficient: Intake, Revise, and Library.
- Archive remains a secondary recoverable view and its mutation stays exclusive
  to Revise.
- Batches remain metadata and later dispatch aids, not folders that own assets.
- Agent submission and human review records remain correctly separated.
- Category and style expansion can remain folder-based and versioned.
- A browser-first TypeScript viewer is sufficient; Godot adds no useful
  requirement.
- Direct Antigravity chat remains the simplest creation interface. Embedding a
  model or chat inside the viewer would add complexity without improving the
  daily loop.

### Scope adjustment

No new workflow state or major subsystem is added. Phase 2 should add only the
safe bridge from a completed staging folder to an immutable local revision and
the working viewer. Approval, Revise notes, and Archive mutations remain Phase
3 so the first live sprite test cannot accidentally modify human review state.

## 17. Reassessment after Promptinator and style trials

Version 0.4 was reassessed after the Promptinator queue, creator-side visual
checklist, v2 style canary, and completed entries 20-31 test batch.

### Result

- Intake, Revise, Library, and Revise-only Archive remain sufficient; no Denied
  or additional WIP lane is needed.
- Promptinator claim state is correctly separate from sprite review state.
- v2 is the production creation default, while immutable v1 provenance and
  Ready-only legacy selection remain supported.
- Style-default promotion and visual approval remain separate; no golden sprite
  is implied by the promotion.
- Structural validation needs targeted quality checks, but automatic validation
  must still never become user approval.
- Fresh-agent queue scheduling remains useful later, after the v2 style and
  validation thresholds are calibrated on a smaller exact-v2 sample.

### Scope adjustment

Phase 4 remains active. Do not add a new workflow state, embedded model, Godot
integration, or automatic scheduler to solve visual-quality failures. The next
quality slice should be small, measurable, and based on verified v2 claims.
