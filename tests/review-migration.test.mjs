import { describe, expect, it } from "vitest";
import { migrateReviewRecord } from "../tools/lib/contracts.mjs";

describe("review record migration", () => {
  it("projects legacy Revise candidates into Intake without changing notes", () => {
    const legacy = {
      kind: "review",
      schemaVersion: "1.0.0",
      assetId: "enemy-mob-32-example",
      approvedRevisionId: null,
      candidate: { revisionId: "r001", lane: "revise" },
      notes: [
        {
          id: "note-example",
          text: "Keep iterating.",
          createdAt: "2026-07-30T18:00:00.000Z",
          resolvedAt: null,
          target: {},
        },
      ],
      archiveHistory: [],
      updatedAt: "2026-07-30T18:00:00.000Z",
    };

    const migrated = migrateReviewRecord(legacy);
    expect(migrated.schemaVersion).toBe("1.1.0");
    expect(migrated.candidate).toEqual({
      revisionId: "r001",
      lane: "intake",
    });
    expect(migrated.notes).toEqual(legacy.notes);
    expect(legacy.candidate.lane).toBe("revise");
  });
});
