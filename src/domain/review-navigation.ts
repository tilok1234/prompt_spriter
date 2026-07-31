export type ReviewNavigationAction =
  | "approve"
  | "add-note"
  | "deny"
  | "reopen"
  | "start-revision"
  | "archive"
  | "restore";

export type ReviewSection = "intake" | "denied" | "library" | "archive";

interface ReviewNavigationInput {
  action: ReviewNavigationAction;
  currentSection: ReviewSection;
  nextSection: ReviewSection;
  assetId: string;
  revisionId: string;
}

export const routeAfterReviewAction = ({
  action,
  currentSection,
  nextSection,
  assetId,
  revisionId,
}: ReviewNavigationInput): string => {
  if (action === "deny" || action === "archive") {
    return `#/${currentSection}`;
  }

  if (action === "start-revision") {
    return `#/${currentSection}/review/${assetId}/${revisionId}`;
  }

  return `#/${nextSection}/review/${assetId}/${revisionId}`;
};
