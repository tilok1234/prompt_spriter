import type { ReviewRecord, ViewerAsset } from "../domain/types";

interface LibraryResponse {
  items: ViewerAsset[];
  errors: string[];
}

export interface RevisionBatchRecord {
  kind: "batch";
  schemaVersion: string;
  id: string;
  batchType: "revision";
  createdAt: string;
  items: Array<{
    assetId: string;
    baseRevisionId: string;
    notes: string[];
  }>;
}

export interface RevisionBatchEntry {
  batch: RevisionBatchRecord;
  brief: string;
  relativeDirectory: string;
}

export interface RevisionBatchSelection {
  assetId: string;
  revisionId: string;
  expectedUpdatedAt: string;
}

interface RevisionBatchResponse {
  created?: RevisionBatchEntry;
  items?: RevisionBatchEntry[];
  errors?: string[];
  error?: string;
}

export type ReviewMutationAction =
  | "approve"
  | "add-note"
  | "deny"
  | "reopen"
  | "start-revision"
  | "archive"
  | "restore";

export interface ReviewNoteDraft {
  text: string;
  target: {
    direction?: string;
    animation?: string;
    frames?: number[];
  };
}

export interface ReviewMutationRequest {
  action: ReviewMutationAction;
  assetId: string;
  revisionId: string;
  expectedUpdatedAt: string;
  note?: ReviewNoteDraft;
}

interface ReviewMutationResponse {
  review?: ReviewRecord;
  items?: ViewerAsset[];
  errors?: string[];
  error?: string;
}

export const loadLocalLibrary = async (): Promise<ViewerAsset[]> => {
  const response = await fetch("/__prompt-spriter/library", {
    cache: "no-store",
  });
  const payload = (await response.json()) as LibraryResponse;
  if (!response.ok) {
    throw new Error(
      payload.errors.join("; ") || "The local library could not be read.",
    );
  }
  return payload.items;
};

export const loadRevisionBatches = async (): Promise<
  RevisionBatchEntry[]
> => {
  const response = await fetch("/__prompt-spriter/batches", {
    cache: "no-store",
  });
  const payload = (await response.json()) as RevisionBatchResponse;
  if (!response.ok || !payload.items) {
    throw new Error(
      payload.error ||
        payload.errors?.join("; ") ||
        "Revision batches could not be read.",
    );
  }
  return payload.items;
};

export const createRevisionBatch = async ({
  batchId,
  selections,
}: {
  batchId: string;
  selections: RevisionBatchSelection[];
}): Promise<{
  created: RevisionBatchEntry;
  items: RevisionBatchEntry[];
}> => {
  const response = await fetch("/__prompt-spriter/batches", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      batchId,
      selections,
    }),
  });
  const payload = (await response.json()) as RevisionBatchResponse;
  if (!response.ok || !payload.created || !payload.items) {
    throw new Error(
      payload.error ||
        payload.errors?.join("; ") ||
        "The revision batch could not be created.",
    );
  }
  return {
    created: payload.created,
    items: payload.items,
  };
};

export const mutateReview = async (
  mutation: ReviewMutationRequest,
): Promise<ViewerAsset[]> => {
  const response = await fetch("/__prompt-spriter/review", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mutation),
  });
  const payload = (await response.json()) as ReviewMutationResponse;
  if (!response.ok || !payload.items) {
    throw new Error(
      payload.error ||
        payload.errors?.join("; ") ||
        "The review action could not be saved.",
    );
  }
  return payload.items;
};
