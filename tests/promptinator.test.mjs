import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  claimNextPromptinatorEntry,
  clearPromptinatorV2TestBatch,
  completePromptinatorClaim,
  createPromptinatorV2TestBatch,
  importPromptCatalog,
  parsePromptCatalog,
  readPromptinatorStore,
  reconcilePromptinatorWithLibrary,
  renderPromptinatorPrompt,
  setPromptinatorEntryStyle,
  transitionPromptinatorEntry,
} from "../tools/lib/promptinator.mjs";

const roots = [];
const sample = `1. Thornwood Brood

Woodland creatures: shaped by roots and thorns.

1
Name: Mossback Tuskling
Core concept: A forest boar charger.
Body and silhouette: Compact wedge-shaped body.
Signature features: Moss-covered back and wooden tusks.
Palette and materials: Bark brown and moss green.
Movement personality: Heavy, stubborn, then suddenly fast.
Attack concept: Telegraphs a straight charge.
Directional details: The right tusk is shorter.
Avoid: Domestic pig appearance.
2
Name: Brambletail Slinker
Core concept: A foxlike woodland skirmisher.
Body and silhouette: Slender body and oversized tail.
Signature features: Bramble tail and leaf-shaped ears.
Palette and materials: Rust orange and dark green.
Movement personality: Nervous and cunning.
Attack concept: Fires curved thorn shots.
Directional details: The tail curls toward its right.
Avoid: Cute pet fox.
`;

const sampleThree = `${sample}3
Name: Canopy Rammer
Core concept: A horned forest ambusher.
Body and silhouette: Low four-legged body with a wedge-shaped head.
Signature features: Forked bark horns and a fern mane.
Palette and materials: Dark bark and bright fern green.
Movement personality: Patient, then explosive.
Attack concept: Lunges forward with both horns.
Directional details: A broken left horn remains consistent.
Avoid: Upright humanoid posture.
`;

const workspace = () => {
  const root = mkdtempSync(join(tmpdir(), "promptinator-"));
  roots.push(root);
  return root;
};

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("Promptinator", () => {
  it("parses structured entries and renders self-contained prompts", () => {
    const parsed = parsePromptCatalog({ text: sample, sourceName: "one.txt" });
    expect(parsed.entries).toHaveLength(2);
    expect(parsed.entries[0].id).toBe("prompt-0001-mossback-tuskling");
    expect(parsed.entries[0].promptText).toContain(
      "Left and right refer to the creature's own anatomical sides",
    );
    expect(parsed.entries[0].promptText).toContain(
      "Required style profile: assembler-inspired-v2@0.1.0",
    );
    expect(parsed.entries[0].promptText).toContain(
      "Use a recognition budget of exactly one dominant silhouette anchor plus one secondary identifying feature",
    );
    expect(parsed.entries[0].promptText).toContain(
      "Keep a humanoid's key weapon or tool visibly separated from the torso in front and back views",
    );
  });

  it("refuses incomplete input without writing a store", () => {
    const root = workspace();
    expect(() =>
      importPromptCatalog({
        workspaceRoot: root,
        text: sample.replace("Avoid: Cute pet fox.", ""),
        sourceName: "broken.txt",
        expectedUpdatedAt: "1970-01-01T00:00:00.000Z",
      }),
    ).toThrow('missing field "Avoid"');
    expect(readPromptinatorStore({ workspaceRoot: root }).entries).toEqual([]);
  });

  it("imports idempotently and rejects collisions", () => {
    const root = workspace();
    const first = importPromptCatalog({
      workspaceRoot: root,
      text: sample,
      sourceName: "one.txt",
      expectedUpdatedAt: "1970-01-01T00:00:00.000Z",
      now: () => "2026-07-31T08:00:00.000Z",
    });
    expect(first.importedCount).toBe(2);
    expect(first.store.schemaVersion).toBe("1.7.0");
    expect(first.store.entries[0].style.id).toBe("assembler-inspired-v2");
    expect(first.store.entries[0].formulaVersion).toBe("structured-v2");
    const duplicate = importPromptCatalog({
      workspaceRoot: root,
      text: sample,
      sourceName: "copy.txt",
      expectedUpdatedAt: first.store.updatedAt,
    });
    expect(duplicate.alreadyImported).toBe(true);
    expect(() =>
      importPromptCatalog({
        workspaceRoot: root,
        text: sample.replace("Mossback Tuskling", "Different Name"),
        sourceName: "conflict.txt",
        expectedUpdatedAt: first.store.updatedAt,
      }),
    ).toThrow("conflicts with an existing entry");
  });

  it("copies and requeues without deleting history", () => {
    const root = workspace();
    const imported = importPromptCatalog({
      workspaceRoot: root,
      text: sample,
      sourceName: "one.txt",
      expectedUpdatedAt: "1970-01-01T00:00:00.000Z",
      now: () => "2026-07-31T08:00:00.000Z",
    });
    const copied = transitionPromptinatorEntry({
      workspaceRoot: root,
      entryId: imported.store.entries[0].id,
      action: "mark-copied",
      expectedUpdatedAt: imported.store.updatedAt,
      now: () => "2026-07-31T08:01:00.000Z",
    });
    expect(copied.entries[0].state).toBe("copied");
    const requeued = transitionPromptinatorEntry({
      workspaceRoot: root,
      entryId: copied.entries[0].id,
      action: "requeue",
      expectedUpdatedAt: copied.updatedAt,
      now: () => "2026-07-31T08:02:00.000Z",
    });
    expect(requeued.entries[0].state).toBe("ready");
    expect(requeued.entries[0].history.map((event) => event.action)).toEqual([
      "imported",
      "copied",
      "requeued",
    ]);
  });

  it("refuses stale transitions", () => {
    const root = workspace();
    const imported = importPromptCatalog({
      workspaceRoot: root,
      text: sample,
      sourceName: "one.txt",
      expectedUpdatedAt: "1970-01-01T00:00:00.000Z",
      now: () => "2026-07-31T08:00:00.000Z",
    });
    expect(() =>
      transitionPromptinatorEntry({
        workspaceRoot: root,
        entryId: imported.store.entries[0].id,
        action: "mark-copied",
        expectedUpdatedAt: "2026-07-31T07:59:00.000Z",
      }),
    ).toThrow("changed since this view loaded");
  });

  it("allows a Ready entry to opt into legacy v1 and locks style at claim", () => {
    const root = workspace();
    const imported = importPromptCatalog({
      workspaceRoot: root,
      text: sample,
      sourceName: "one.txt",
      expectedUpdatedAt: "1970-01-01T00:00:00.000Z",
      now: () => "2026-07-31T08:00:00.000Z",
    });
    const selected = setPromptinatorEntryStyle({
      workspaceRoot: root,
      entryId: imported.store.entries[0].id,
      style: { id: "assembler-inspired-v1", version: "0.1.0" },
      expectedUpdatedAt: imported.store.updatedAt,
      now: () => "2026-07-31T08:01:00.000Z",
    });
    const entry = selected.entries[0];
    expect(entry.style).toEqual({
      id: "assembler-inspired-v1",
      version: "0.1.0",
    });
    expect(entry.formulaVersion).toBe("structured-v1");
    expect(entry.promptText).not.toContain("Required style profile:");
    expect(entry.history.at(-1)).toEqual({
      action: "style-selected",
      at: "2026-07-31T08:01:00.000Z",
      style: { id: "assembler-inspired-v1", version: "0.1.0" },
    });

    const claimed = claimNextPromptinatorEntry({
      workspaceRoot: root,
      now: () => "2026-07-31T08:02:00.000Z",
      claimIdFactory: () =>
        "claim-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    expect(() =>
      setPromptinatorEntryStyle({
        workspaceRoot: root,
        entryId: entry.id,
        style: { id: "assembler-inspired-v2", version: "0.1.0" },
        expectedUpdatedAt: claimed.store.updatedAt,
      }),
    ).toThrow("only while it is Ready");
  });

  it("migrates only still-Ready v1 entries to the v2 production default", () => {
    const root = workspace();
    const imported = importPromptCatalog({
      workspaceRoot: root,
      text: sample,
      sourceName: "legacy.txt",
      expectedUpdatedAt: "1970-01-01T00:00:00.000Z",
      now: () => "2026-07-31T08:00:00.000Z",
    });
    const legacyStyle = { id: "assembler-inspired-v1", version: "0.1.0" };
    const legacyEntry = (entry) => ({
      ...entry,
      style: legacyStyle,
      formulaVersion: "structured-v1",
      promptText: renderPromptinatorPrompt({
        id: entry.id,
        name: entry.name,
        family: entry.family,
        brief: entry.brief,
        style: legacyStyle,
        formulaVersion: "structured-v1",
      }),
    });
    const oldStore = {
      ...imported.store,
      schemaVersion: "1.2.0",
      updatedAt: "2026-07-31T08:01:00.000Z",
      entries: [
        legacyEntry(imported.store.entries[0]),
        {
          ...legacyEntry(imported.store.entries[1]),
          state: "copied",
          copiedAt: "2026-07-31T08:01:00.000Z",
          history: [
            ...imported.store.entries[1].history,
            { action: "copied", at: "2026-07-31T08:01:00.000Z" },
          ],
        },
      ],
    };
    mkdirSync(join(root, "promptinator"), { recursive: true });
    writeFileSync(
      join(root, "promptinator", "store.json"),
      `${JSON.stringify(oldStore, null, 2)}\n`,
      "utf8",
    );

    const migrated = readPromptinatorStore({ workspaceRoot: root });
    expect(migrated.schemaVersion).toBe("1.7.0");
    expect(migrated.activeTestBatch).toBeNull();
    expect(migrated.entries[0].style.id).toBe("assembler-inspired-v2");
    expect(migrated.entries[0].formulaVersion).toBe("structured-v2");
    expect(migrated.entries[0].history.at(-1)).toEqual({
      action: "default-style-migrated",
      at: "2026-07-31T08:01:00.000Z",
      style: { id: "assembler-inspired-v2", version: "0.1.0" },
    });
    expect(migrated.entries[1].state).toBe("copied");
    expect(migrated.entries[1].style.id).toBe("assembler-inspired-v1");
    expect(migrated.entries[1].history.at(-1).action).toBe("copied");
  });

  it("adds recognition safeguards only when historical v2 work is safely Ready", () => {
    const root = workspace();
    const imported = importPromptCatalog({
      workspaceRoot: root,
      text: sample,
      sourceName: "recognition-migration.txt",
      expectedUpdatedAt: "1970-01-01T00:00:00.000Z",
      now: () => "2026-08-01T08:00:00.000Z",
    });
    const recognitionFragments = [
      "Use a recognition budget",
      "Thin, spectral, floating, or winged subjects",
      "Keep a humanoid's key weapon or tool",
      "Do not let a tiny face, eye, or detail",
      "Derive prop visibility per row",
      "State each row's on-screen attack direction",
      "open and study every promoted example sheet",
    ];
    const legacyPrompt = (promptText) =>
      promptText
        .split("\n")
        .filter(
          (line) =>
            !recognitionFragments.some((fragment) => line.includes(fragment)),
        )
        .join("\n");
    const oldStore = {
      ...imported.store,
      schemaVersion: "1.4.0",
      updatedAt: "2026-08-01T08:01:00.000Z",
      entries: [
        {
          ...imported.store.entries[0],
          promptText: legacyPrompt(imported.store.entries[0].promptText),
        },
        {
          ...imported.store.entries[1],
          promptText: legacyPrompt(imported.store.entries[1].promptText),
          state: "copied",
          copiedAt: "2026-08-01T08:01:00.000Z",
          history: [
            ...imported.store.entries[1].history,
            { action: "copied", at: "2026-08-01T08:01:00.000Z" },
          ],
        },
      ],
    };
    mkdirSync(join(root, "promptinator"), { recursive: true });
    writeFileSync(
      join(root, "promptinator", "store.json"),
      `${JSON.stringify(oldStore, null, 2)}\n`,
      "utf8",
    );

    const migrated = readPromptinatorStore({ workspaceRoot: root });
    expect(migrated.schemaVersion).toBe("1.7.0");
    expect(migrated.entries[0].promptText).toContain(
      "Use a recognition budget",
    );
    expect(migrated.entries[0].history.at(-1)).toEqual({
      action: "recognition-safeguards-migrated",
      at: "2026-08-01T08:01:00.000Z",
    });
    expect(migrated.entries[1].state).toBe("copied");
    expect(migrated.entries[1].promptText).not.toContain(
      "Use a recognition budget",
    );
    expect(migrated.entries[1].history.at(-1).action).toBe("copied");

    const requeued = transitionPromptinatorEntry({
      workspaceRoot: root,
      entryId: migrated.entries[1].id,
      action: "requeue",
      expectedUpdatedAt: migrated.updatedAt,
      now: () => "2026-08-01T08:02:00.000Z",
    });
    expect(requeued.entries[1].state).toBe("ready");
    expect(requeued.entries[1].promptText).toContain(
      "Use a recognition budget",
    );
  });

  it("adds directional safeguards only when historical v2 work is safely Ready", () => {
    const root = workspace();
    const imported = importPromptCatalog({
      workspaceRoot: root,
      text: sample,
      sourceName: "directional-migration.txt",
      expectedUpdatedAt: "1970-01-01T00:00:00.000Z",
      now: () => "2026-08-01T09:00:00.000Z",
    });
    const directionalFragments = [
      "Derive prop visibility per row",
      "State each row's on-screen attack direction",
      "open and study every promoted example sheet",
    ];
    const recognitionEraPrompt = (promptText) =>
      promptText
        .split("\n")
        .filter(
          (line) =>
            !directionalFragments.some((fragment) => line.includes(fragment)),
        )
        .join("\n");
    const oldStore = {
      ...imported.store,
      schemaVersion: "1.5.0",
      updatedAt: "2026-08-01T09:01:00.000Z",
      entries: [
        {
          ...imported.store.entries[0],
          promptText: recognitionEraPrompt(
            imported.store.entries[0].promptText,
          ),
        },
        {
          ...imported.store.entries[1],
          promptText: recognitionEraPrompt(
            imported.store.entries[1].promptText,
          ),
          state: "copied",
          copiedAt: "2026-08-01T09:01:00.000Z",
          history: [
            ...imported.store.entries[1].history,
            { action: "copied", at: "2026-08-01T09:01:00.000Z" },
          ],
        },
      ],
    };
    mkdirSync(join(root, "promptinator"), { recursive: true });
    writeFileSync(
      join(root, "promptinator", "store.json"),
      `${JSON.stringify(oldStore, null, 2)}\n`,
      "utf8",
    );

    const migrated = readPromptinatorStore({ workspaceRoot: root });
    expect(migrated.schemaVersion).toBe("1.7.0");
    expect(migrated.entries[0].promptText).toContain(
      "Derive prop visibility per row",
    );
    expect(migrated.entries[0].history.at(-1)).toEqual({
      action: "directional-safeguards-migrated",
      at: "2026-08-01T09:01:00.000Z",
    });
    expect(migrated.entries[1].state).toBe("copied");
    expect(migrated.entries[1].promptText).not.toContain(
      "Derive prop visibility per row",
    );
    expect(migrated.entries[1].history.at(-1).action).toBe("copied");
  });

  it("adds example guidance only when historical v2 work is safely Ready", () => {
    const root = workspace();
    const imported = importPromptCatalog({
      workspaceRoot: root,
      text: sample,
      sourceName: "example-migration.txt",
      expectedUpdatedAt: "1970-01-01T00:00:00.000Z",
      now: () => "2026-08-01T10:00:00.000Z",
    });
    const exampleFragments = ["open and study every promoted example sheet"];
    const directionalEraPrompt = (promptText) =>
      promptText
        .split("\n")
        .filter(
          (line) =>
            !exampleFragments.some((fragment) => line.includes(fragment)),
        )
        .join("\n");
    const oldStore = {
      ...imported.store,
      schemaVersion: "1.6.0",
      updatedAt: "2026-08-01T10:01:00.000Z",
      entries: [
        {
          ...imported.store.entries[0],
          promptText: directionalEraPrompt(
            imported.store.entries[0].promptText,
          ),
        },
        {
          ...imported.store.entries[1],
          promptText: directionalEraPrompt(
            imported.store.entries[1].promptText,
          ),
          state: "copied",
          copiedAt: "2026-08-01T10:01:00.000Z",
          history: [
            ...imported.store.entries[1].history,
            { action: "copied", at: "2026-08-01T10:01:00.000Z" },
          ],
        },
      ],
    };
    mkdirSync(join(root, "promptinator"), { recursive: true });
    writeFileSync(
      join(root, "promptinator", "store.json"),
      `${JSON.stringify(oldStore, null, 2)}\n`,
      "utf8",
    );

    const migrated = readPromptinatorStore({ workspaceRoot: root });
    expect(migrated.schemaVersion).toBe("1.7.0");
    expect(migrated.entries[0].promptText).toContain(
      "open and study every promoted example sheet",
    );
    expect(migrated.entries[0].history.at(-1)).toEqual({
      action: "example-guidance-migrated",
      at: "2026-08-01T10:01:00.000Z",
    });
    expect(migrated.entries[1].state).toBe("copied");
    expect(migrated.entries[1].promptText).not.toContain(
      "open and study every promoted example sheet",
    );
    expect(migrated.entries[1].history.at(-1).action).toBe("copied");
  });

  it("atomically claims the lowest Ready entry and keeps it resumable", () => {
    const root = workspace();
    importPromptCatalog({
      workspaceRoot: root,
      text: sample,
      sourceName: "one.txt",
      expectedUpdatedAt: "1970-01-01T00:00:00.000Z",
      now: () => "2026-07-31T08:00:00.000Z",
    });
    const claimed = claimNextPromptinatorEntry({
      workspaceRoot: root,
      claimant: "Antigravity test",
      now: () => "2026-07-31T08:01:00.000Z",
      claimIdFactory: () =>
        "claim-11111111-1111-4111-8111-111111111111",
    });
    expect(claimed.entry.id).toBe("prompt-0001-mossback-tuskling");
    expect(claimed.entry.state).toBe("claimed");
    expect(claimed.claim.expectedAssetId).toBe(
      "enemy-mob-32-mossback-tuskling",
    );

    const requeued = transitionPromptinatorEntry({
      workspaceRoot: root,
      entryId: claimed.entry.id,
      action: "requeue",
      expectedUpdatedAt: claimed.store.updatedAt,
      now: () => "2026-07-31T08:02:00.000Z",
    });
    expect(requeued.entries[0].state).toBe("ready");
    expect(requeued.entries[0].claim).toBeNull();
  });

  it("pins a selected Ready group as an atomic v2 test batch", () => {
    const root = workspace();
    const imported = importPromptCatalog({
      workspaceRoot: root,
      text: sampleThree,
      sourceName: "three.txt",
      expectedUpdatedAt: "1970-01-01T00:00:00.000Z",
      now: () => "2026-07-31T08:00:00.000Z",
    });
    const legacy = setPromptinatorEntryStyle({
      workspaceRoot: root,
      entryId: imported.store.entries[1].id,
      style: { id: "assembler-inspired-v1", version: "0.1.0" },
      expectedUpdatedAt: imported.store.updatedAt,
      now: () => "2026-07-31T08:01:00.000Z",
    });
    const batched = createPromptinatorV2TestBatch({
      workspaceRoot: root,
      entryIds: [legacy.entries[2].id, legacy.entries[1].id],
      expectedUpdatedAt: legacy.updatedAt,
      now: () => "2026-07-31T08:02:00.000Z",
      batchIdFactory: () =>
        "v2-test-33333333-3333-4333-8333-333333333333",
    });
    expect(batched.activeTestBatch).toEqual({
      id: "v2-test-33333333-3333-4333-8333-333333333333",
      style: { id: "assembler-inspired-v2", version: "0.1.0" },
      createdAt: "2026-07-31T08:02:00.000Z",
      entryIds: [legacy.entries[1].id, legacy.entries[2].id],
    });
    expect(batched.entries[1].style.id).toBe("assembler-inspired-v2");
    expect(batched.entries[1].formulaVersion).toBe("structured-v2");
    expect(batched.entries[1].history.at(-1)).toEqual({
      action: "v2-test-batch-selected",
      at: "2026-07-31T08:02:00.000Z",
      style: { id: "assembler-inspired-v2", version: "0.1.0" },
      batchId: "v2-test-33333333-3333-4333-8333-333333333333",
    });
    expect(() =>
      transitionPromptinatorEntry({
        workspaceRoot: root,
        entryId: batched.entries[0].id,
        action: "mark-copied",
        expectedUpdatedAt: batched.updatedAt,
      }),
    ).toThrow("permits manual copy only for its next Ready entry");

    const claimed = claimNextPromptinatorEntry({
      workspaceRoot: root,
      now: () => "2026-07-31T08:03:00.000Z",
      claimIdFactory: () =>
        "claim-44444444-4444-4444-8444-444444444444",
    });
    expect(claimed.entry.id).toBe(legacy.entries[1].id);
    expect(claimed.entry.style.id).toBe("assembler-inspired-v2");
    expect(claimed.testBatch.id).toBe(batched.activeTestBatch.id);
    expect(claimed.store.entries[0].state).toBe("ready");

    const secondClaim = claimNextPromptinatorEntry({
      workspaceRoot: root,
      now: () => "2026-07-31T08:03:30.000Z",
      claimIdFactory: () =>
        "claim-55555555-5555-4555-8555-555555555555",
    });
    expect(secondClaim.entry.id).toBe(legacy.entries[2].id);
    expect(() =>
      claimNextPromptinatorEntry({
        workspaceRoot: root,
        now: () => "2026-07-31T08:03:45.000Z",
      }),
    ).toThrow("has no Ready entries");
    expect(readPromptinatorStore({ workspaceRoot: root }).entries[0].state).toBe(
      "ready",
    );

    const cleared = clearPromptinatorV2TestBatch({
      workspaceRoot: root,
      batchId: batched.activeTestBatch.id,
      expectedUpdatedAt: secondClaim.store.updatedAt,
      now: () => "2026-07-31T08:04:00.000Z",
    });
    expect(cleared.activeTestBatch).toBeNull();
  });

  it("completes an active claim with exact Intake provenance", () => {
    const root = workspace();
    importPromptCatalog({
      workspaceRoot: root,
      text: sample,
      sourceName: "one.txt",
      expectedUpdatedAt: "1970-01-01T00:00:00.000Z",
      now: () => "2026-07-31T08:00:00.000Z",
    });
    const claimId = "claim-22222222-2222-4222-8222-222222222222";
    const claimed = claimNextPromptinatorEntry({
      workspaceRoot: root,
      now: () => "2026-07-31T08:01:00.000Z",
      claimIdFactory: () => claimId,
    });
    const completed = completePromptinatorClaim({
      workspaceRoot: root,
      entryId: claimed.entry.id,
      claimId,
      assetId: "enemy-mob-32-mossback-tuskling",
      revisionId: "r001",
      completedAt: "2026-07-31T08:02:00.000Z",
      now: () => "2026-07-31T08:02:01.000Z",
    });
    expect(completed.entries[0].state).toBe("completed");
    expect(completed.entries[0].completion).toEqual({
      assetId: "enemy-mob-32-mossback-tuskling",
      revisionId: "r001",
      completedAt: "2026-07-31T08:02:00.000Z",
    });
    expect(() =>
      transitionPromptinatorEntry({
        workspaceRoot: root,
        entryId: claimed.entry.id,
        action: "requeue",
        expectedUpdatedAt: completed.updatedAt,
      }),
    ).toThrow("cannot be requeued");
  });

  it("reconciles a previously copied prompt from immutable Library provenance", () => {
    const root = workspace();
    const imported = importPromptCatalog({
      workspaceRoot: root,
      text: sample,
      sourceName: "one.txt",
      expectedUpdatedAt: "1970-01-01T00:00:00.000Z",
      now: () => "2026-07-31T08:00:00.000Z",
    });
    const copied = transitionPromptinatorEntry({
      workspaceRoot: root,
      entryId: imported.store.entries[0].id,
      action: "mark-copied",
      expectedUpdatedAt: imported.store.updatedAt,
      now: () => "2026-07-31T08:01:00.000Z",
    });
    const entry = copied.entries[0];
    const reconciled = reconcilePromptinatorWithLibrary({
      workspaceRoot: root,
      libraryEntries: [
        {
          asset: {
            id: "enemy-mob-32-mossback-tuskling",
            name: entry.name,
          },
          revision: {
            id: "r001",
            parentRevisionId: null,
            createdAt: "2026-07-31T08:02:00.000Z",
            request: entry.promptText,
            category: entry.category,
            style: entry.style,
          },
        },
      ],
      now: () => "2026-07-31T08:03:00.000Z",
    });
    expect(reconciled.reconciledCount).toBe(1);
    expect(reconciled.store.entries[0].state).toBe("completed");
    expect(reconciled.store.entries[1].state).toBe("ready");
  });
});
