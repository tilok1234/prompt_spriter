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
  it("moves Intake to Revise without changing approval", () => {
    const revise = sendToRevise(intakeReview, time);
    expect(revise.candidate?.lane).toBe("revise");
    expect(revise.approvedRevisionId).toBeNull();
    expect(revise.schemaVersion).toBe("1.2.0");
  });

  it("approves the exact Intake revision", () => {
    const approved = approveCandidate(intakeReview, time);
    expect(approved.approvedRevisionId).toBe("r001");
    expect(approved.candidate).toBeNull();
    expect(approved.schemaVersion).toBe("1.2.0");
  });

  it("blocks approval while revision notes are unresolved", () => {
    const withOpenNote: ReviewRecord = {
      ...intakeReview,
      notes: [
        {
          id: "note-open",
          text: "Increase the silhouette.",
          createdAt: time,
          resolvedAt: null,
          target: {},
        },
      ],
    };
    expect(() => approveCandidate(withOpenNote, time)).toThrow(
      "unresolved revision notes",
    );
  });

  it("allows Archive only from Revise", () => {
    expect(() => archiveCandidate(intakeReview, time)).toThrow(
      "requires a candidate in revise",
    );
    const revise = sendToRevise(intakeReview, time);
    const archived = archiveCandidate(revise, time);
    expect(archived.candidate?.lane).toBe("archive");
  });

  it("restores Archive only to Revise", () => {
    const revise = sendToRevise(intakeReview, time);
    const archived = archiveCandidate(revise, time);
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
    expect(working.schemaVersion).toBe("1.2.0");
  });
});
