import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import {
  createContractValidator,
  readJson,
  validateRecord,
} from "./contracts.mjs";
import { writeJsonAtomically } from "./fs-safety.mjs";

const assetIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const revisionIdPattern = /^r[0-9]{3,}$/;

export const reviewActions = [
  "approve",
  "send-to-revise",
  "add-note",
  "start-revision",
  "archive",
  "restore",
];

export class ReviewActionError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "ReviewActionError";
    this.statusCode = statusCode;
  }
}

const staysInside = (root, path) => {
  const fromRoot = relative(resolve(root), resolve(path));
  return (
    fromRoot !== "" &&
    fromRoot !== ".." &&
    !fromRoot.startsWith("..\\") &&
    !fromRoot.startsWith("../") &&
    !isAbsolute(fromRoot)
  );
};

const requireIdentity = (assetId, revisionId) => {
  if (!assetIdPattern.test(assetId ?? "")) {
    throw new ReviewActionError("Invalid asset identity.");
  }
  if (!revisionIdPattern.test(revisionId ?? "")) {
    throw new ReviewActionError("Invalid revision identity.");
  }
};

const requireCandidate = (review, revisionId, lane) => {
  if (
    !review.candidate ||
    review.candidate.revisionId !== revisionId ||
    review.candidate.lane !== lane
  ) {
    throw new ReviewActionError(
      `Action requires revision ${revisionId} in ${lane}.`,
      409,
    );
  }
  return review.candidate;
};

const normalizeNote = ({ note, revision, createdAt, noteIdFactory }) => {
  if (!note || typeof note !== "object" || Array.isArray(note)) {
    throw new ReviewActionError("A revision note is required.");
  }

  const text = typeof note.text === "string" ? note.text.trim() : "";
  if (!text) {
    throw new ReviewActionError("A revision note cannot be empty.");
  }
  if (text.length > 4000) {
    throw new ReviewActionError(
      "A revision note cannot exceed 4000 characters.",
    );
  }

  const rawTarget =
    note.target && typeof note.target === "object" && !Array.isArray(note.target)
      ? note.target
      : {};
  const target = {};

  if (rawTarget.direction !== undefined) {
    if (
      typeof rawTarget.direction !== "string" ||
      !revision.directions.includes(rawTarget.direction)
    ) {
      throw new ReviewActionError("The note direction is not in this revision.");
    }
    target.direction = rawTarget.direction;
  }

  const animation = revision.animations.find(
    (candidate) => candidate.id === rawTarget.animation,
  );
  if (rawTarget.animation !== undefined) {
    if (!animation) {
      throw new ReviewActionError(
        "The note animation is not in this revision.",
      );
    }
    target.animation = animation.id;
  }

  if (rawTarget.frames !== undefined) {
    if (!animation) {
      throw new ReviewActionError(
        "Frame-specific notes must select an animation.",
      );
    }
    if (
      !Array.isArray(rawTarget.frames) ||
      rawTarget.frames.length === 0 ||
      rawTarget.frames.some(
        (frame) =>
          !Number.isInteger(frame) || frame < 1 || frame > animation.frames,
      )
    ) {
      throw new ReviewActionError(
        `Note frames must be between 1 and ${animation.frames}.`,
      );
    }
    target.frames = [...new Set(rawTarget.frames)].sort(
      (left, right) => left - right,
    );
  }

  return {
    id: `note-${noteIdFactory()}`,
    text,
    createdAt,
    resolvedAt: null,
    target,
  };
};

export const applyReviewAction = ({
  libraryRoot,
  action,
  assetId,
  revisionId,
  expectedUpdatedAt,
  note,
  now = () => new Date().toISOString(),
  noteIdFactory = () => randomUUID(),
}) => {
  if (!reviewActions.includes(action)) {
    throw new ReviewActionError("Unknown review action.");
  }
  requireIdentity(assetId, revisionId);

  const resolvedLibraryRoot = resolve(libraryRoot);
  const assetsRoot = join(resolvedLibraryRoot, "assets");
  const assetDirectory = join(assetsRoot, assetId);
  if (!staysInside(assetsRoot, assetDirectory)) {
    throw new ReviewActionError("Asset path escaped the library root.");
  }

  const assetPath = join(assetDirectory, "asset.json");
  const reviewPath = join(assetDirectory, "review.json");
  const revisionPath = join(
    assetDirectory,
    "revisions",
    revisionId,
    "revision.json",
  );
  if (
    !existsSync(assetPath) ||
    !existsSync(reviewPath) ||
    !existsSync(revisionPath)
  ) {
    throw new ReviewActionError(
      "The requested asset revision was not found.",
      404,
    );
  }

  const asset = readJson(assetPath);
  const review = readJson(reviewPath);
  const revision = readJson(revisionPath);
  const ajv = createContractValidator();
  const currentFailures = [
    ...validateRecord(ajv, asset, "asset.json"),
    ...validateRecord(ajv, review, "review.json"),
    ...validateRecord(ajv, revision, "revision.json"),
  ];
  if (currentFailures.length > 0) {
    throw new ReviewActionError(
      `Current library records are invalid: ${currentFailures.join("; ")}`,
      500,
    );
  }
  if (
    asset.id !== assetId ||
    review.assetId !== assetId ||
    revision.assetId !== assetId ||
    revision.id !== revisionId
  ) {
    throw new ReviewActionError("Asset or revision identity mismatch.", 409);
  }
  if (
    typeof expectedUpdatedAt !== "string" ||
    expectedUpdatedAt !== review.updatedAt
  ) {
    throw new ReviewActionError(
      "This review changed after the page loaded. Reload it before deciding.",
      409,
    );
  }

  const changedAt = now();
  let nextReview;

  switch (action) {
    case "approve": {
      requireCandidate(review, revisionId, "intake");
      nextReview = {
        ...review,
        approvedRevisionId: revisionId,
        candidate: null,
        updatedAt: changedAt,
      };
      break;
    }
    case "send-to-revise": {
      const candidate = requireCandidate(review, revisionId, "intake");
      const reviewNote = normalizeNote({
        note,
        revision,
        createdAt: changedAt,
        noteIdFactory,
      });
      nextReview = {
        ...review,
        candidate: {
          ...candidate,
          lane: "revise",
        },
        notes: [...review.notes, reviewNote],
        updatedAt: changedAt,
      };
      break;
    }
    case "add-note": {
      requireCandidate(review, revisionId, "revise");
      const reviewNote = normalizeNote({
        note,
        revision,
        createdAt: changedAt,
        noteIdFactory,
      });
      nextReview = {
        ...review,
        notes: [...review.notes, reviewNote],
        updatedAt: changedAt,
      };
      break;
    }
    case "start-revision": {
      if (
        review.approvedRevisionId !== revisionId ||
        review.candidate !== null
      ) {
        throw new ReviewActionError(
          `Action requires approved revision ${revisionId} with no active candidate.`,
          409,
        );
      }
      const reviewNote = normalizeNote({
        note,
        revision,
        createdAt: changedAt,
        noteIdFactory,
      });
      nextReview = {
        ...review,
        candidate: {
          revisionId,
          lane: "revise",
        },
        notes: [...review.notes, reviewNote],
        updatedAt: changedAt,
      };
      break;
    }
    case "archive": {
      const candidate = requireCandidate(review, revisionId, "revise");
      nextReview = {
        ...review,
        candidate: {
          ...candidate,
          lane: "archive",
        },
        archiveHistory: [
          ...review.archiveHistory,
          {
            revisionId,
            archivedAt: changedAt,
            restoredAt: null,
          },
        ],
        updatedAt: changedAt,
      };
      break;
    }
    case "restore": {
      const candidate = requireCandidate(review, revisionId, "archive");
      const archiveHistory = review.archiveHistory.map((entry) => ({
        ...entry,
      }));
      let openEntryIndex = -1;
      for (let index = archiveHistory.length - 1; index >= 0; index -= 1) {
        const entry = archiveHistory[index];
        if (entry.revisionId === revisionId && entry.restoredAt === null) {
          openEntryIndex = index;
          break;
        }
      }
      if (openEntryIndex < 0) {
        throw new ReviewActionError(
          "The archived candidate has no open Archive history entry.",
          409,
        );
      }
      archiveHistory[openEntryIndex].restoredAt = changedAt;
      nextReview = {
        ...review,
        candidate: {
          ...candidate,
          lane: "revise",
        },
        archiveHistory,
        updatedAt: changedAt,
      };
      break;
    }
    default:
      throw new ReviewActionError("Unknown review action.");
  }

  const nextFailures = validateRecord(ajv, nextReview, "next review.json");
  if (nextFailures.length > 0) {
    throw new ReviewActionError(
      `Review action produced invalid state: ${nextFailures.join("; ")}`,
      500,
    );
  }

  try {
    writeJsonAtomically(reviewPath, nextReview);
  } catch (error) {
    throw new ReviewActionError(
      `Review state could not be saved: ${
        error instanceof Error ? error.message : String(error)
      }`,
      500,
    );
  }

  return {
    asset,
    revision,
    review: nextReview,
    reviewPath,
  };
};
