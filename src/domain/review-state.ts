import type { ReviewRecord } from "./types";

const requireCandidateLane = (
  review: ReviewRecord,
  expectedLane: "intake" | "denied" | "archive",
) => {
  if (!review.candidate || review.candidate.lane !== expectedLane) {
    throw new Error(`Action requires a candidate in ${expectedLane}`);
  }
  return review.candidate;
};

export const denyCandidate = (
  review: ReviewRecord,
  updatedAt: string,
): ReviewRecord => {
  const candidate = requireCandidateLane(review, "intake");
  return {
    ...review,
    candidate: {
      ...candidate,
      lane: "denied",
    },
    updatedAt,
  };
};

export const reopenCandidate = (
  review: ReviewRecord,
  updatedAt: string,
): ReviewRecord => {
  const candidate = requireCandidateLane(review, "denied");
  return {
    ...review,
    candidate: {
      ...candidate,
      lane: "intake",
    },
    updatedAt,
  };
};

export const approveCandidate = (
  review: ReviewRecord,
  updatedAt: string,
): ReviewRecord => {
  const candidate = requireCandidateLane(review, "intake");
  if (review.notes.some((note) => note.resolvedAt === null)) {
    throw new Error("Candidate has unresolved revision notes");
  }
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
  const candidate = requireCandidateLane(review, "denied");
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
      lane: "denied",
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
      lane: "intake",
    },
    updatedAt,
  };
};
