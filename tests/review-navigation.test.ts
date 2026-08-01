import { describe, expect, it } from "vitest";
import { routeAfterReviewAction } from "../src/domain/review-navigation";

describe("review action navigation", () => {
  it("keeps the Intake tab after sending a candidate to Revise", () => {
    expect(
      routeAfterReviewAction({
        action: "send-to-revise",
        currentSection: "intake",
        nextSection: "revise",
        assetId: "enemy-mob-32-example",
        revisionId: "r001",
      }),
    ).toBe("#/intake");
  });

  it("keeps the Revise tab after archiving a candidate", () => {
    expect(
      routeAfterReviewAction({
        action: "archive",
        currentSection: "revise",
        nextSection: "archive",
        assetId: "enemy-mob-32-example",
        revisionId: "r001",
      }),
    ).toBe("#/revise");
  });

  it("keeps the selected Library revision after starting a revision", () => {
    expect(
      routeAfterReviewAction({
        action: "start-revision",
        currentSection: "library",
        nextSection: "revise",
        assetId: "enemy-mob-32-example",
        revisionId: "r001",
      }),
    ).toBe("#/library/review/enemy-mob-32-example/r001");
  });

  it("keeps the Intake tab after approving a candidate", () => {
    expect(
      routeAfterReviewAction({
        action: "approve",
        currentSection: "intake",
        nextSection: "library",
        assetId: "enemy-mob-32-example",
        revisionId: "r001",
      }),
    ).toBe("#/intake");
  });

  it("opens the exact Revise candidate when an archived item is restored", () => {
    expect(
      routeAfterReviewAction({
        action: "restore",
        currentSection: "archive",
        nextSection: "revise",
        assetId: "enemy-mob-32-example",
        revisionId: "r001",
      }),
    ).toBe("#/revise/review/enemy-mob-32-example/r001");
  });
});
