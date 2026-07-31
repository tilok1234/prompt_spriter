export type ReviewNavigationAction =
  | "approve"
  | "send-to-revise"
  | "add-note"
  | "start-revision"
  | "archive"
  | "restore";

export type ReviewSection = "intake" | "revise" | "library" | "archive";

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
  if (action === "send-to-revise" || action === "archive") {
    return `#/${currentSection}`;
  }

  if (action === "start-revision") {
    return `#/${currentSection}/review/${assetId}/${revisionId}`;
  }

  return `#/${nextSection}/review/${assetId}/${revisionId}`;
};
