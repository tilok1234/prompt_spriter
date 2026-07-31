import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createRevisionBatch,
  readRevisionBatches,
} from "../tools/lib/revision-batches.mjs";

const temporaryRoots = [];
const repositoryRoot = resolve(import.meta.dirname, "..");
const fixtureAssetDirectory = join(
  repositoryRoot,
  "fixtures",
  "library",
  "assets",
  "fixture-ember-slime-001",
);

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path, value) => {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};
const sha256 = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

const createWorkspaceRoot = () => {
  const workspaceRoot = mkdtempSync(
    join(tmpdir(), "prompt-spriter-batches-"),
  );
  temporaryRoots.push(workspaceRoot);
  mkdirSync(join(workspaceRoot, "library", "assets"), {
    recursive: true,
  });
  return workspaceRoot;
};

const seedIntakeAsset = ({
  workspaceRoot,
  assetId,
  name,
  updatedAt,
  noteText,
  target = {},
  lane = "intake",
}) => {
  const assetDirectory = join(
    workspaceRoot,
    "library",
    "assets",
    assetId,
  );
  cpSync(fixtureAssetDirectory, assetDirectory, { recursive: true });

  const assetPath = join(assetDirectory, "asset.json");
  const asset = readJson(assetPath);
  asset.id = assetId;
  asset.name = name;
  writeJson(assetPath, asset);

  const reviewPath = join(assetDirectory, "review.json");
  const review = readJson(reviewPath);
  review.assetId = assetId;
  review.candidate = {
    revisionId: "r001",
    lane,
  };
  review.notes = [
    {
      id: `note-${assetId}`,
      text: noteText,
      createdAt: updatedAt,
      resolvedAt: null,
      target,
    },
  ];
  review.updatedAt = updatedAt;
  writeJson(reviewPath, review);

  const revisionPath = join(
    assetDirectory,
    "revisions",
    "r001",
    "revision.json",
  );
  const revision = readJson(revisionPath);
  revision.assetId = assetId;
  writeJson(revisionPath, revision);

  return {
    assetDirectory,
    reviewPath,
    sheetPath: join(
      assetDirectory,
      "revisions",
      "r001",
      "sheet.png",
    ),
    selection: {
      assetId,
      revisionId: "r001",
      expectedUpdatedAt: updatedAt,
    },
  };
};

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("revision batches", () => {
  it("snapshots exact Intake candidates with unresolved notes without changing review state", () => {
    const workspaceRoot = createWorkspaceRoot();
    const lion = seedIntakeAsset({
      workspaceRoot,
      assetId: "enemy-lion-001",
      name: "Lion",
      updatedAt: "2026-07-30T18:00:00.000Z",
      noteText: "Give the walk more body weight.",
      target: {
        animation: "walk",
        frames: [2, 4],
      },
    });
    const boar = seedIntakeAsset({
      workspaceRoot,
      assetId: "enemy-boar-001",
      name: "Boar",
      updatedAt: "2026-07-30T18:01:00.000Z",
      noteText: "Make the silhouette broader.",
    });
    const protectedHashes = {
      lionReview: sha256(lion.reviewPath),
      lionSheet: sha256(lion.sheetPath),
      boarReview: sha256(boar.reviewPath),
      boarSheet: sha256(boar.sheetPath),
    };

    const result = createRevisionBatch({
      workspaceRoot,
      batchId: "heavy-movement-pass",
      selections: [lion.selection, boar.selection],
      now: () => "2026-07-30T18:05:00.000Z",
    });

    expect(result.batch.items.map((item) => item.assetId)).toEqual([
      "enemy-boar-001",
      "enemy-lion-001",
    ]);
    expect(result.batch.items[1].notes).toEqual([
      "[animation walk; frames 2, 4] Give the walk more body weight.",
    ]);
    expect(result.brief).toContain("# Revision batch: heavy-movement-pass");
    expect(result.brief).toContain("### 1. Boar");
    expect(result.brief).toContain("### 2. Lion");
    expect(result.brief).toContain(
      "`baseRevisionId`: `r001`",
    );
    expect(result.brief).toContain(
      "Never overwrite an ingested source or edit `review.json`.",
    );
    expect(
      existsSync(
        join(
          workspaceRoot,
          "batches",
          "revision",
          "heavy-movement-pass",
          "brief.md",
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(
        join(
          workspaceRoot,
          "transactions",
          "create-revision-batch-heavy-movement-pass",
          "receipt.json",
        ),
      ),
    ).toBe(true);
    expect({
      lionReview: sha256(lion.reviewPath),
      lionSheet: sha256(lion.sheetPath),
      boarReview: sha256(boar.reviewPath),
      boarSheet: sha256(boar.sheetPath),
    }).toEqual(protectedHashes);

    const batches = readRevisionBatches({ workspaceRoot });
    expect(batches.errors).toEqual([]);
    expect(batches.entries).toHaveLength(1);
    expect(batches.entries[0].batch.id).toBe("heavy-movement-pass");
  });

  it("refuses stale, non-Intake, duplicate, and overwrite requests", () => {
    const workspaceRoot = createWorkspaceRoot();
    const intake = seedIntakeAsset({
      workspaceRoot,
      assetId: "enemy-lion-001",
      name: "Lion",
      updatedAt: "2026-07-30T18:00:00.000Z",
      noteText: "Increase the mane size.",
    });
    const denied = seedIntakeAsset({
      workspaceRoot,
      assetId: "enemy-boar-001",
      name: "Boar",
      updatedAt: "2026-07-30T18:01:00.000Z",
      noteText: "Broaden the silhouette.",
      lane: "denied",
    });

    expect(() =>
      createRevisionBatch({
        workspaceRoot,
        batchId: "stale-pass",
        selections: [
          {
            ...intake.selection,
            expectedUpdatedAt: "2026-07-30T17:00:00.000Z",
          },
        ],
      }),
    ).toThrow("Review state changed");

    expect(() =>
      createRevisionBatch({
        workspaceRoot,
        batchId: "wrong-lane-pass",
        selections: [denied.selection],
      }),
    ).toThrow("in Intake");

    expect(() =>
      createRevisionBatch({
        workspaceRoot,
        batchId: "duplicate-pass",
        selections: [intake.selection, intake.selection],
      }),
    ).toThrow("duplicate selection");

    createRevisionBatch({
      workspaceRoot,
      batchId: "protected-pass",
      selections: [intake.selection],
      now: () => "2026-07-30T18:05:00.000Z",
    });
    expect(() =>
      createRevisionBatch({
        workspaceRoot,
        batchId: "protected-pass",
        selections: [intake.selection],
      }),
    ).toThrow("will not be overwritten");
  });
});
