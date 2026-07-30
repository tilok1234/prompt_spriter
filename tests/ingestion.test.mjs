import {
  cpSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readJson } from "../tools/lib/contracts.mjs";
import { ingestSubmission } from "../tools/lib/ingestion.mjs";
import { readViewerLibrary } from "../tools/lib/library-view.mjs";
import { applyReviewAction } from "../tools/lib/review-actions.mjs";
import { validateSubmissionDirectory } from "../tools/lib/submission.mjs";

const temporaryRoots = [];
const repositoryRoot = resolve(import.meta.dirname, "..");
const fixtureRevision = join(
  repositoryRoot,
  "fixtures",
  "library",
  "assets",
  "fixture-ember-slime-001",
  "revisions",
  "r001",
);
const fixtureAssetDirectory = resolve(
  repositoryRoot,
  "fixtures",
  "library",
  "assets",
  "fixture-ember-slime-001",
);

const writeJson = (path, value) => {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const createWorkspaceRoot = () => {
  const workspaceRoot = mkdtempSync(
    join(tmpdir(), "prompt-spriter-ingestion-"),
  );
  temporaryRoots.push(workspaceRoot);
  return workspaceRoot;
};

const createStagingJob = ({
  complete = true,
  workspaceRoot = createWorkspaceRoot(),
  jobId = "lion-first-slice",
  assetId = "lion-mob-001",
  baseRevisionId = null,
  requestedName = "Lion",
} = {}) => {
  const jobDirectory = join(workspaceRoot, "staging", jobId);
  mkdirSync(jobDirectory, { recursive: true });
  copyFileSync(
    join(fixtureRevision, "sheet.png"),
    join(jobDirectory, "sheet.png"),
  );
  copyFileSync(
    join(fixtureRevision, "thumbnail.png"),
    join(jobDirectory, "thumbnail.png"),
  );
  writeFileSync(
    join(jobDirectory, "source.aseprite"),
    "test-only Aseprite source placeholder",
    "utf8",
  );

  const submittedAt = "2026-07-30T15:00:00.000Z";
  const completedAt = "2026-07-30T15:01:00.000Z";
  const submission = {
    kind: "agent-submission",
    schemaVersion: "1.0.0",
    jobId,
    assetId,
    baseRevisionId,
    requestedName,
    request: "Create a 32x32 enemy mob lion using the first vertical slice.",
    category: {
      id: "enemy-mob-32",
      version: "0.1.0",
    },
    style: {
      id: "assembler-inspired-v1",
      version: "0.1.0",
    },
    producer: {
      application: "Antigravity with Aseprite Pro MCP",
      model: "Gemini Flash 3.6",
      sessionId: null,
    },
    output: {
      sourcePath: "source.aseprite",
      sheetPath: "sheet.png",
      thumbnailPath: "thumbnail.png",
      directions: ["down", "left", "right", "up"],
      animations: [
        {
          id: "idle",
          startColumn: 0,
          frames: 2,
          durationMs: 400,
          playback: "loop",
        },
        {
          id: "walk",
          startColumn: 2,
          frames: 4,
          durationMs: 150,
          playback: "loop",
        },
        {
          id: "attack",
          startColumn: 6,
          frames: 4,
          durationMs: 120,
          playback: "once",
        },
      ],
    },
    submittedAt,
  };
  const validation = {
    kind: "validation-report",
    schemaVersion: "1.0.0",
    jobId,
    status: "passed-with-warnings",
    checks: [
      {
        code: "structural-validation",
        level: "warning",
        status: "warning",
        message:
          "The deterministic test sheet contains advisory duplicate frames.",
      },
    ],
    createdAt: completedAt,
  };
  writeJson(join(jobDirectory, "submission.json"), submission);
  writeJson(join(jobDirectory, "validation.json"), validation);
  if (complete) {
    writeJson(join(jobDirectory, "completion.json"), {
      kind: "completion-marker",
      schemaVersion: "1.0.0",
      jobId,
      assetId: submission.assetId,
      submissionPath: "submission.json",
      validationPath: "validation.json",
      filePaths: [
        "submission.json",
        "validation.json",
        "source.aseprite",
        "sheet.png",
        "thumbnail.png",
      ],
      producer: submission.producer,
      completedAt,
    });
  }
  return { workspaceRoot, jobDirectory };
};

const seedFixtureLibrary = (workspaceRoot) => {
  const assetDirectory = join(
    workspaceRoot,
    "library",
    "assets",
    "fixture-ember-slime-001",
  );
  cpSync(fixtureAssetDirectory, assetDirectory, { recursive: true });
  return assetDirectory;
};

const sha256 = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("staging ingestion", () => {
  it("registers a complete new asset without changing its staging job", () => {
    const { workspaceRoot, jobDirectory } = createStagingJob();
    const preflight = validateSubmissionDirectory({
      jobDirectory,
      requireCompletion: true,
    });
    expect(preflight.failures).toEqual([]);
    expect(preflight.computedStatus).toBe("passed-with-warnings");

    const result = ingestSubmission({
      jobDirectory,
      workspaceRoot,
      verifySource: false,
    });
    expect(result.assetId).toBe("lion-mob-001");
    expect(result.revisionId).toBe("r001");
    expect(existsSync(join(jobDirectory, "completion.json"))).toBe(true);

    const library = readViewerLibrary(join(workspaceRoot, "library"));
    expect(library.errors).toEqual([]);
    expect(library.entries).toHaveLength(1);
    expect(library.entries[0].asset.name).toBe("Lion");
    expect(library.entries[0].review.candidate).toEqual({
      revisionId: "r001",
      lane: "intake",
    });
    expect(existsSync(library.entries[0].sheetFile)).toBe(true);

    expect(() =>
      ingestSubmission({
        jobDirectory,
        workspaceRoot,
        verifySource: false,
      }),
    ).toThrow("will not be overwritten");
  });

  it("refuses a staging job without a completion marker", () => {
    const { workspaceRoot, jobDirectory } = createStagingJob({
      complete: false,
    });
    expect(() =>
      ingestSubmission({
        jobDirectory,
        workspaceRoot,
        verifySource: false,
      }),
    ).toThrow("completion.json is required for ingestion");
    expect(
      existsSync(
        join(workspaceRoot, "library", "assets", "lion-mob-001"),
      ),
    ).toBe(false);
  });

  it("registers r002 from the exact Revise base and preserves r001", () => {
    const workspaceRoot = createWorkspaceRoot();
    const assetDirectory = seedFixtureLibrary(workspaceRoot);
    const reviewPath = join(assetDirectory, "review.json");
    const intake = readJson(reviewPath);
    applyReviewAction({
      libraryRoot: join(workspaceRoot, "library"),
      action: "send-to-revise",
      assetId: "fixture-ember-slime-001",
      revisionId: "r001",
      expectedUpdatedAt: intake.updatedAt,
      note: {
        text: "Give the next revision more weight.",
        target: {
          animation: "walk",
        },
      },
      now: () => "2026-07-30T16:00:00.000Z",
      noteIdFactory: () => "revision-note",
    });
    const r001Root = join(assetDirectory, "revisions", "r001");
    const protectedHashes = {
      revision: sha256(join(r001Root, "revision.json")),
      sheet: sha256(join(r001Root, "sheet.png")),
      thumbnail: sha256(join(r001Root, "thumbnail.png")),
    };
    const { jobDirectory } = createStagingJob({
      workspaceRoot,
      jobId: "fixture-ember-slime-revision",
      assetId: "fixture-ember-slime-001",
      baseRevisionId: "r001",
      requestedName: "Ember Slime",
    });

    const result = ingestSubmission({
      jobDirectory,
      workspaceRoot,
      verifySource: false,
    });

    expect(result.revisionId).toBe("r002");
    expect(result.baseRevisionId).toBe("r001");
    const revision = readJson(
      join(assetDirectory, "revisions", "r002", "revision.json"),
    );
    expect(revision.parentRevisionId).toBe("r001");
    const review = readJson(reviewPath);
    expect(review.approvedRevisionId).toBeNull();
    expect(review.candidate).toEqual({
      revisionId: "r002",
      lane: "intake",
    });
    expect(review.notes[0].resolvedAt).toBe(
      "2026-07-30T15:01:00.000Z",
    );
    expect({
      revision: sha256(join(r001Root, "revision.json")),
      sheet: sha256(join(r001Root, "sheet.png")),
      thumbnail: sha256(join(r001Root, "thumbnail.png")),
    }).toEqual(protectedHashes);
    expect(existsSync(join(jobDirectory, "completion.json"))).toBe(true);

    const repeated = ingestSubmission({
      jobDirectory,
      workspaceRoot,
      verifySource: false,
    });
    expect(repeated.revisionId).toBe("r002");
  });

  it("keeps approved r001 selected while a new r002 returns to Intake", () => {
    const workspaceRoot = createWorkspaceRoot();
    const assetDirectory = seedFixtureLibrary(workspaceRoot);
    const libraryRoot = join(workspaceRoot, "library");
    const reviewPath = join(assetDirectory, "review.json");
    const intake = readJson(reviewPath);
    applyReviewAction({
      libraryRoot,
      action: "approve",
      assetId: "fixture-ember-slime-001",
      revisionId: "r001",
      expectedUpdatedAt: intake.updatedAt,
      now: () => "2026-07-30T16:00:00.000Z",
    });
    const approved = readJson(reviewPath);
    applyReviewAction({
      libraryRoot,
      action: "start-revision",
      assetId: "fixture-ember-slime-001",
      revisionId: "r001",
      expectedUpdatedAt: approved.updatedAt,
      note: {
        text: "Create a stronger second revision.",
        target: {},
      },
      now: () => "2026-07-30T16:01:00.000Z",
      noteIdFactory: () => "approved-revision-note",
    });
    const { jobDirectory } = createStagingJob({
      workspaceRoot,
      jobId: "fixture-ember-slime-approved-revision",
      assetId: "fixture-ember-slime-001",
      baseRevisionId: "r001",
      requestedName: "Ember Slime",
    });

    ingestSubmission({
      jobDirectory,
      workspaceRoot,
      verifySource: false,
    });

    const review = readJson(reviewPath);
    expect(review.approvedRevisionId).toBe("r001");
    expect(review.candidate).toEqual({
      revisionId: "r002",
      lane: "intake",
    });
    expect(
      existsSync(join(assetDirectory, "revisions", "r001", "sheet.png")),
    ).toBe(true);
    expect(
      existsSync(join(assetDirectory, "revisions", "r002", "sheet.png")),
    ).toBe(true);

    const viewerLibrary = readViewerLibrary(libraryRoot);
    expect(viewerLibrary.errors).toEqual([]);
    expect(
      viewerLibrary.entries.map((entry) => entry.revision.id),
    ).toEqual(["r002", "r001"]);
    for (const entry of viewerLibrary.entries) {
      expect(entry.review.approvedRevisionId).toBe("r001");
      expect(entry.review.candidate).toEqual({
        revisionId: "r002",
        lane: "intake",
      });
    }

    applyReviewAction({
      libraryRoot,
      action: "send-to-revise",
      assetId: "fixture-ember-slime-001",
      revisionId: "r002",
      expectedUpdatedAt: review.updatedAt,
      note: {
        text: "Keep iterating without replacing the approved revision.",
        target: {},
      },
      now: () => "2026-07-30T16:02:00.000Z",
      noteIdFactory: () => "r002-revision-note",
    });
    const revisedR002 = readJson(reviewPath);
    expect(revisedR002.approvedRevisionId).toBe("r001");
    expect(revisedR002.candidate).toEqual({
      revisionId: "r002",
      lane: "revise",
    });

    applyReviewAction({
      libraryRoot,
      action: "archive",
      assetId: "fixture-ember-slime-001",
      revisionId: "r002",
      expectedUpdatedAt: revisedR002.updatedAt,
      now: () => "2026-07-30T16:03:00.000Z",
    });
    const archivedR002 = readJson(reviewPath);
    expect(archivedR002.approvedRevisionId).toBe("r001");
    expect(archivedR002.candidate).toEqual({
      revisionId: "r002",
      lane: "archive",
    });
  });

  it("refuses revision ingestion unless the declared base is in Revise", () => {
    const workspaceRoot = createWorkspaceRoot();
    const assetDirectory = seedFixtureLibrary(workspaceRoot);
    const { jobDirectory } = createStagingJob({
      workspaceRoot,
      jobId: "fixture-ember-slime-illegal-revision",
      assetId: "fixture-ember-slime-001",
      baseRevisionId: "r001",
      requestedName: "Ember Slime",
    });

    expect(() =>
      ingestSubmission({
        jobDirectory,
        workspaceRoot,
        verifySource: false,
      }),
    ).toThrow("active Revise candidate");
    expect(
      existsSync(join(assetDirectory, "revisions", "r002")),
    ).toBe(false);
  });
});
