import type { ReviewRecord } from "./types";

const requireCandidateLane = (
  review: ReviewRecord,
  expectedLane: "intake" | "revise" | "archive",
) => {
  if (!review.candidate || review.candidate.lane !== expectedLane) {
    throw new Error(`Action requires a candidate in ${expectedLane}`);
  }
  return review.candidate;
};

export const sendToRevise = (
  review: ReviewRecord,
  updatedAt: string,
): ReviewRecord => {
  const candidate = requireCandidateLane(review, "intake");
  return {
    ...review,
    candidate: {
      ...candidate,
      lane: "revise",
    },
    updatedAt,
  };
};

export const approveCandidate = (
  review: ReviewRecord,
  updatedAt: string,
): ReviewRecord => {
  const candidate = requireCandidateLane(review, "intake");
  return {
    ...review,
    approvedRevisionId: candidate.revisionId,
    candidate: null,
    updatedAt,
  };
};

export const archiveCandidate = (
  review: ReviewRecord,
  archivedAt: string,
): ReviewRecord => {
  const candidate = requireCandidateLane(review, "revise");
  return {
    ...review,
    candidate: {
      ...candidate,
      lane: "archive",
    },
    archiveHistory: [
      ...review.archiveHistory,
      {
        revisionId: candidate.revisionId,
        archivedAt,
        restoredAt: null,
      },
    ],
    updatedAt: archivedAt,
  };
};

export const restoreCandidate = (
  review: ReviewRecord,
  restoredAt: string,
): ReviewRecord => {
  const candidate = requireCandidateLane(review, "archive");
  const history = [...review.archiveHistory];
  let entryIndex = -1;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index];
    if (
      entry.revisionId === candidate.revisionId &&
      entry.restoredAt === null
    ) {
      entryIndex = index;
      break;
    }
  }

  if (entryIndex < 0) {
    throw new Error("Archived candidate has no open Archive history entry");
  }

  history[entryIndex] = {
    ...history[entryIndex],
    restoredAt,
  };

  return {
    ...review,
    candidate: {
      ...candidate,
      lane: "revise",
    },
    archiveHistory: history,
    updatedAt: restoredAt,
  };
};

export const startLibraryRevision = (
  review: ReviewRecord,
  candidateRevisionId: string,
  updatedAt: string,
): ReviewRecord => {
  if (!review.approvedRevisionId) {
    throw new Error("A Library revision is required");
  }
  if (review.candidate) {
    throw new Error("An active candidate already exists");
  }

  return {
    ...review,
    candidate: {
      revisionId: candidateRevisionId,
      lane: "revise",
    },
    updatedAt,
  };
};
