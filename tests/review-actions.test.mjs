import { createHash } from "node:crypto";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readJson } from "../tools/lib/contracts.mjs";
import {
  applyReviewAction,
  ReviewActionError,
} from "../tools/lib/review-actions.mjs";

const temporaryRoots = [];
const repositoryRoot = resolve(import.meta.dirname, "..");
const fixtureAssetDirectory = join(
  repositoryRoot,
  "fixtures",
  "library",
  "assets",
  "fixture-ember-slime-001",
);

const createLibrary = () => {
  const root = mkdtempSync(join(tmpdir(), "prompt-spriter-review-"));
  temporaryRoots.push(root);
  const libraryRoot = join(root, "library");
  const assetDirectory = join(
    libraryRoot,
    "assets",
    "fixture-ember-slime-001",
  );
  cpSync(fixtureAssetDirectory, assetDirectory, { recursive: true });
  return {
    libraryRoot,
    assetDirectory,
    reviewPath: join(assetDirectory, "review.json"),
  };
};

const sha256 = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

const immutableHashes = (assetDirectory) => {
  const revisionRoot = join(assetDirectory, "revisions", "r001");
  return {
    asset: sha256(join(assetDirectory, "asset.json")),
    revision: sha256(join(revisionRoot, "revision.json")),
    validation: sha256(join(revisionRoot, "validation.json")),
    sheet: sha256(join(revisionRoot, "sheet.png")),
    thumbnail: sha256(join(revisionRoot, "thumbnail.png")),
  };
};

const actionInput = (libraryRoot, review, overrides = {}) => ({
  libraryRoot,
  action: "approve",
  assetId: "fixture-ember-slime-001",
  revisionId: "r001",
  expectedUpdatedAt: review.updatedAt,
  now: () => "2026-07-30T18:00:00.000Z",
  noteIdFactory: () => "test-note",
  ...overrides,
});

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("persisted review actions", () => {
  it("approves only the exact Intake revision and preserves immutable files", () => {
    const { libraryRoot, assetDirectory, reviewPath } = createLibrary();
    const before = immutableHashes(assetDirectory);
    const review = readJson(reviewPath);

    applyReviewAction(actionInput(libraryRoot, review));

    const approved = readJson(reviewPath);
    expect(approved.approvedRevisionId).toBe("r001");
    expect(approved.candidate).toBeNull();
    expect(approved.updatedAt).toBe("2026-07-30T18:00:00.000Z");
    expect(immutableHashes(assetDirectory)).toEqual(before);
  });

  it("adds a normalized targeted note while the candidate stays in Intake", () => {
    const { libraryRoot, assetDirectory, reviewPath } = createLibrary();
    const before = immutableHashes(assetDirectory);
    const review = readJson(reviewPath);

    applyReviewAction(
      actionInput(libraryRoot, review, {
        action: "add-note",
        note: {
          text: "  Give the walk more weight.  ",
          target: {
            direction: "left",
            animation: "walk",
            frames: [4, 2, 2],
          },
        },
      }),
    );

    const revisionRequested = readJson(reviewPath);
    expect(revisionRequested.candidate).toEqual({
      revisionId: "r001",
      lane: "intake",
    });
    expect(revisionRequested.notes).toEqual([
      {
        id: "note-test-note",
        text: "Give the walk more weight.",
        createdAt: "2026-07-30T18:00:00.000Z",
        resolvedAt: null,
        target: {
          direction: "left",
          animation: "walk",
          frames: [2, 4],
        },
      },
    ]);
    expect(immutableHashes(assetDirectory)).toEqual(before);
  });

  it("starts revision work from an approved Library revision without replacing it", () => {
    const { libraryRoot, reviewPath } = createLibrary();
    const intake = readJson(reviewPath);
    applyReviewAction(actionInput(libraryRoot, intake));
    const approved = readJson(reviewPath);

    applyReviewAction(
      actionInput(libraryRoot, approved, {
        action: "start-revision",
        now: () => "2026-07-30T18:01:00.000Z",
        noteIdFactory: () => "library-note",
        note: {
          text: "Give the next version a stronger attack.",
          target: {
            animation: "attack",
          },
        },
      }),
    );

    const working = readJson(reviewPath);
    expect(working.approvedRevisionId).toBe("r001");
    expect(working.candidate).toEqual({
      revisionId: "r001",
      lane: "intake",
    });
    expect(working.notes.at(-1)?.text).toBe(
      "Give the next version a stronger attack.",
    );
  });

  it("adds notes in Intake and enforces Archive-only-from-Denied", () => {
    const { libraryRoot, reviewPath } = createLibrary();
    const intake = readJson(reviewPath);

    expect(() =>
      applyReviewAction(
        actionInput(libraryRoot, intake, { action: "archive" }),
      ),
    ).toThrow("requires revision r001 in denied");
    expect(readJson(reviewPath)).toEqual(intake);

    applyReviewAction(
      actionInput(libraryRoot, intake, {
        action: "add-note",
        note: {
          text: "Strengthen the silhouette.",
          target: {},
        },
      }),
    );
    const revisionRequested = readJson(reviewPath);
    applyReviewAction(
      actionInput(libraryRoot, revisionRequested, {
        action: "add-note",
        now: () => "2026-07-30T18:01:00.000Z",
        noteIdFactory: () => "second-note",
        note: {
          text: "Preserve the palette.",
          target: {},
        },
      }),
    );
    expect(readJson(reviewPath).notes).toHaveLength(2);
  });

  it("denies from Intake, archives from Denied, and restores only to Denied", () => {
    const { libraryRoot, reviewPath } = createLibrary();
    const intake = readJson(reviewPath);
    applyReviewAction(
      actionInput(libraryRoot, intake, {
        action: "add-note",
        note: {
          text: "Keep for a later pass.",
          target: {},
        },
      }),
    );
    const revisionRequested = readJson(reviewPath);
    applyReviewAction(
      actionInput(libraryRoot, revisionRequested, {
        action: "deny",
        now: () => "2026-07-30T18:01:00.000Z",
      }),
    );
    const denied = readJson(reviewPath);
    applyReviewAction(
      actionInput(libraryRoot, denied, {
        action: "archive",
        now: () => "2026-07-30T18:02:00.000Z",
      }),
    );
    const archived = readJson(reviewPath);
    expect(archived.candidate?.lane).toBe("archive");
    expect(archived.archiveHistory.at(-1)).toEqual({
      revisionId: "r001",
      archivedAt: "2026-07-30T18:02:00.000Z",
      restoredAt: null,
    });

    applyReviewAction(
      actionInput(libraryRoot, archived, {
        action: "restore",
        now: () => "2026-07-30T18:03:00.000Z",
      }),
    );
    const restored = readJson(reviewPath);
    expect(restored.candidate?.lane).toBe("denied");
    expect(restored.archiveHistory.at(-1)?.restoredAt).toBe(
      "2026-07-30T18:03:00.000Z",
    );
    expect(restored.notes).toHaveLength(1);
  });

  it("returns a Denied candidate to Intake without losing its revision request", () => {
    const { libraryRoot, assetDirectory, reviewPath } = createLibrary();
    const before = immutableHashes(assetDirectory);
    const intake = readJson(reviewPath);

    applyReviewAction(
      actionInput(libraryRoot, intake, {
        action: "add-note",
        note: {
          text: "Rework the attack silhouette.",
          target: { animation: "attack" },
        },
      }),
    );
    const revisionRequested = readJson(reviewPath);

    applyReviewAction(
      actionInput(libraryRoot, revisionRequested, {
        action: "deny",
        now: () => "2026-07-30T18:01:00.000Z",
      }),
    );
    const denied = readJson(reviewPath);
    expect(denied.candidate?.lane).toBe("denied");

    applyReviewAction(
      actionInput(libraryRoot, denied, {
        action: "reopen",
        now: () => "2026-07-30T18:02:00.000Z",
      }),
    );
    const reopened = readJson(reviewPath);

    expect(reopened.candidate).toEqual({
      revisionId: "r001",
      lane: "intake",
    });
    expect(reopened.notes).toEqual(revisionRequested.notes);
    expect(reopened.archiveHistory).toEqual([]);
    expect(immutableHashes(assetDirectory)).toEqual(before);
    expect(() =>
      applyReviewAction(actionInput(libraryRoot, reopened)),
    ).toThrow("open revision notes");
  });

  it("blocks approval while an Intake candidate has an unresolved note", () => {
    const { libraryRoot, reviewPath } = createLibrary();
    const intake = readJson(reviewPath);
    applyReviewAction(
      actionInput(libraryRoot, intake, {
        action: "add-note",
        note: {
          text: "Increase the silhouette.",
          target: {},
        },
      }),
    );
    const revisionRequested = readJson(reviewPath);

    expect(() =>
      applyReviewAction(actionInput(libraryRoot, revisionRequested)),
    ).toThrow("open revision notes");
    expect(readJson(reviewPath)).toEqual(revisionRequested);
  });

  it("refuses stale, mismatched, and unsafe requests without changing review state", () => {
    const { libraryRoot, reviewPath } = createLibrary();
    const review = readJson(reviewPath);

    expect(() =>
      applyReviewAction(
        actionInput(libraryRoot, review, {
          expectedUpdatedAt: "2026-07-30T00:00:00.000Z",
        }),
      ),
    ).toThrow("changed after the page loaded");
    expect(() =>
      applyReviewAction(
        actionInput(libraryRoot, review, {
          revisionId: "r999",
        }),
      ),
    ).toThrow("was not found");
    expect(() =>
      applyReviewAction(
        actionInput(libraryRoot, review, {
          assetId: "../escape",
        }),
      ),
    ).toThrow(ReviewActionError);
    expect(readJson(reviewPath)).toEqual(review);
  });
});
