import { describe, expect, it } from "vitest";
import { migrateReviewRecord } from "../tools/lib/contracts.mjs";

describe("review record migration", () => {
  it("preserves legacy Revise candidates and notes in schema 1.2", () => {
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
    expect(migrated.schemaVersion).toBe("1.2.0");
    expect(migrated.candidate).toEqual({
      revisionId: "r001",
      lane: "revise",
    });
    expect(migrated.notes).toEqual(legacy.notes);
    expect(legacy.candidate.lane).toBe("revise");
  });

  it.each([
    ["intake", "revise"],
    ["denied", "revise"],
  ])(
    "projects schema 1.1 %s candidates with open notes into %s",
    (legacyLane, expectedLane) => {
      const legacy = {
        kind: "review",
        schemaVersion: "1.1.0",
        assetId: "enemy-mob-32-example",
        approvedRevisionId: null,
        candidate: { revisionId: "r001", lane: legacyLane },
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
      expect(migrated.schemaVersion).toBe("1.2.0");
      expect(migrated.candidate?.lane).toBe(expectedLane);
      expect(migrated.notes).toEqual(legacy.notes);
      expect(legacy.candidate.lane).toBe(legacyLane);
    },
  );

  it("keeps a clean schema 1.1 Intake candidate in Intake", () => {
    const legacy = {
      kind: "review",
      schemaVersion: "1.1.0",
      assetId: "enemy-mob-32-example",
      approvedRevisionId: null,
      candidate: { revisionId: "r001", lane: "intake" },
      notes: [],
      archiveHistory: [],
      updatedAt: "2026-07-30T18:00:00.000Z",
    };

    const migrated = migrateReviewRecord(legacy);
    expect(migrated.schemaVersion).toBe("1.2.0");
    expect(migrated.candidate?.lane).toBe("intake");
  });

  it("leaves schema 1.2 records unchanged", () => {
    const current = {
      kind: "review",
      schemaVersion: "1.2.0",
      assetId: "enemy-mob-32-example",
      approvedRevisionId: null,
      candidate: { revisionId: "r001", lane: "revise" },
      notes: [],
      archiveHistory: [],
      updatedAt: "2026-07-30T18:00:00.000Z",
    };

    expect(migrateReviewRecord(current)).toBe(current);
  });
});
