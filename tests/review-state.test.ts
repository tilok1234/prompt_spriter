import { describe, expect, it } from "vitest";
import reviewJson from "../fixtures/library/assets/fixture-ember-slime-001/review.json";
import {
  approveCandidate,
  archiveCandidate,
  restoreCandidate,
  sendToRevise,
  startLibraryRevision,
} from "../src/domain/review-state";
import type { ReviewRecord } from "../src/domain/types";

const intakeReview = reviewJson as ReviewRecord;
const time = "2026-07-30T13:00:00.000Z";

describe("review state", () => {
  it("sends Intake to Revise without changing approval", () => {
    const revised = sendToRevise(intakeReview, time);
    expect(revised.candidate?.lane).toBe("revise");
    expect(revised.approvedRevisionId).toBeNull();
  });

  it("approves the exact Intake revision", () => {
    const approved = approveCandidate(intakeReview, time);
    expect(approved.approvedRevisionId).toBe("r001");
    expect(approved.candidate).toBeNull();
  });

  it("allows Archive only from Revise", () => {
    expect(() => archiveCandidate(intakeReview, time)).toThrow(
      "requires a candidate in revise",
    );
    const revised = sendToRevise(intakeReview, time);
    const archived = archiveCandidate(revised, time);
    expect(archived.candidate?.lane).toBe("archive");
  });

  it("restores Archive only to Revise", () => {
    const revised = sendToRevise(intakeReview, time);
    const archived = archiveCandidate(revised, time);
    const restored = restoreCandidate(
      archived,
      "2026-07-30T14:00:00.000Z",
    );
    expect(restored.candidate?.lane).toBe("revise");
    expect(restored.archiveHistory.at(-1)?.restoredAt).not.toBeNull();
  });

  it("keeps a Library approval while starting a separate revision", () => {
    const approved = approveCandidate(intakeReview, time);
    const working = startLibraryRevision(
      approved,
      "r002",
      "2026-07-30T14:00:00.000Z",
    );
    expect(working.approvedRevisionId).toBe("r001");
    expect(working.candidate).toEqual({
      revisionId: "r002",
      lane: "revise",
    });
  });
});

