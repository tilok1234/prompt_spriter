import { describe, expect, it } from "vitest";
import { routeAfterReviewAction } from "../src/domain/review-navigation";

describe("review action navigation", () => {
  it("keeps the Intake tab after denying a candidate", () => {
    expect(
      routeAfterReviewAction({
        action: "deny",
        currentSection: "intake",
        nextSection: "denied",
        assetId: "enemy-mob-32-example",
        revisionId: "r001",
      }),
    ).toBe("#/intake");
  });

  it("keeps the Denied tab after archiving a candidate", () => {
    expect(
      routeAfterReviewAction({
        action: "archive",
        currentSection: "denied",
        nextSection: "archive",
        assetId: "enemy-mob-32-example",
        revisionId: "r001",
      }),
    ).toBe("#/denied");
  });

  it("keeps the selected Library revision after starting a revision", () => {
    expect(
      routeAfterReviewAction({
        action: "start-revision",
        currentSection: "library",
        nextSection: "intake",
        assetId: "enemy-mob-32-example",
        revisionId: "r001",
      }),
    ).toBe("#/library/review/enemy-mob-32-example/r001");
  });

  it("still opens the destination for other review actions", () => {
    expect(
      routeAfterReviewAction({
        action: "approve",
        currentSection: "intake",
        nextSection: "library",
        assetId: "enemy-mob-32-example",
        revisionId: "r001",
      }),
    ).toBe("#/library/review/enemy-mob-32-example/r001");
  });

  it("opens the exact Intake candidate when Denied is reopened", () => {
    expect(
      routeAfterReviewAction({
        action: "reopen",
        currentSection: "denied",
        nextSection: "intake",
        assetId: "enemy-mob-32-example",
        revisionId: "r001",
      }),
    ).toBe("#/intake/review/enemy-mob-32-example/r001");
  });
});
