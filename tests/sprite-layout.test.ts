import { describe, expect, it } from "vitest";
import revisionJson from "../fixtures/library/assets/fixture-ember-slime-001/revisions/r001/revision.json";
import {
  assertContiguousLayout,
  getFrameCell,
} from "../src/domain/sprite-layout";
import type { RevisionRecord } from "../src/domain/types";

const revision = revisionJson as RevisionRecord;

describe("sprite layout", () => {
  it("maps animation frames into the correct direction row", () => {
    expect(getFrameCell(revision, "right", "attack", 2)).toEqual({
      column: 8,
      row: 2,
    });
  });

  it("accepts the contiguous vertical-slice fixture layout", () => {
    expect(() => assertContiguousLayout(revision)).not.toThrow();
  });

  it("rejects an unknown direction", () => {
    expect(() => getFrameCell(revision, "northwest", "idle", 0)).toThrow(
      "Unknown direction",
    );
  });
});

