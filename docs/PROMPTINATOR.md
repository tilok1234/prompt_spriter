# Promptinator

Promptinator is the creation-request queue built directly into the Prompt
Spriter viewer. It converts structured creature catalogs into durable
Antigravity work requests while leaving dimensions, animations, layers,
validation, and ingestion to the repository contracts.

## Daily workflow

1. Open **Promptinator** in the viewer sidebar.
2. Use **Bulk import** to choose one or more TXT catalogs or paste their text.
3. Validate the complete import, then add it to **Ready**.
4. Optionally select one Ready entry and choose **Use legacy v1**.
5. Start Antigravity from this repository and ask it to create the next sprite
   in the Promptinator queue.
6. Antigravity runs the trusted claim command, creates the exact request, and
   ingests the completed candidate into Intake.

The normal user request is:

> Read and follow the project documentation. Create the next sprite in the
> Promptinator queue.

The agent claims work with:

```powershell
npm.cmd run promptinator:claim-next
```

The claim operation atomically selects the lowest-ordinal Ready entry, so two
agent sessions cannot claim the same prompt. A successful trusted Intake
ingestion completes the matching claim automatically.

Promptinator has three practical views:

- **Ready:** not dispatched;
- **In progress:** an active Antigravity claim or a manually copied prompt;
- **Completed:** linked to the exact ingested asset and revision.

Claims are resumable. A failed or interrupted sprite job remains In progress
until it succeeds or the user deliberately chooses **Requeue**. Completed
entries cannot be requeued because their immutable sprite provenance already
exists. **Copy next** remains as a manual fallback; a clipboard failure leaves
the entry in Ready.

## Structured catalog fields

Each entry has a unique ordinal and these fields:

```text
Name:
Core concept:
Body and silhouette:
Signature features:
Palette and materials:
Movement personality:
Attack concept:
Directional details:
Avoid:
```

Imports are all-or-nothing. Missing fields, duplicate ordinals, duplicate
names, and collisions with an existing queue are refused before writing.

## Production style default

New imports use `assembler-inspired-v2@0.1.0` with `structured-v2`. When the
store upgrades to schema `1.3.0`, only entries that are still Ready on the old
v1 default migrate once to v2. Copied, claimed, completed, and ingested work
retains its exact original provenance.

To deliberately dispatch a legacy-v1 entry:

1. select an entry in Ready;
2. choose **Use legacy v1**;
3. confirm its Style reads `assembler-inspired-v1@0.1.0` and its Formula reads
   `structured-v1`;
4. claim it normally when its ordinal reaches the front of Ready.

The style selection is atomic, recorded in queue history, and allowed only in
Ready. Copying or claiming locks that exact style into the dispatch prompt and
later immutable revision provenance. **Use v2 default** is available only
before dispatch when a Ready entry is on legacy v1.

The user promoted v2 as the production creation default on 2026-07-31. This
does not visually approve a sprite, select a golden example, or alter an
existing revision.

## Prompt and sprite provenance

`structured-v1` adds the stable Promptinator entry ID, collection context,
creative brief, anatomical left/right convention, effects interpretation, and
hard-alpha reminder. The resulting prompt remains the exact user request in
`submission.json`; trusted ingestion stores it on the immutable sprite
revision. The viewer exposes that text as **Stored creation prompt**.

`structured-v2` keeps the same user-authored creative fields and additionally
names the exact v2 profile and guide, requires the controlled body-plan choice,
four-idle-pose checkpoint, fixed camera/ground plane, master palette, and v2
contour rule.

## Storage and boundaries

Runtime state lives in the ignored local file:

```text
workspace/promptinator/store.json
```

The store preserves source SHA-256, original ordinal, generated prompt,
Ready/In-progress/Completed state, exclusive claims, exact asset/revision
completion links, and event history. Promptinator cannot approve sprites,
change review lanes, edit category/style contracts, or change MCP
configuration.

Operator import uses the same validation path:

```powershell
npm.cmd run promptinator:import -- <catalog.txt> --source-name <label>
```

Trusted maintenance can reconcile older manually copied prompts from immutable
Library request provenance without creating claims or changing review state:

```powershell
npm.cmd run promptinator:reconcile
```
