export interface PromptinatorBrief {
  coreConcept: string;
  bodyAndSilhouette: string;
  signatureFeatures: string;
  paletteAndMaterials: string;
  movementPersonality: string;
  attackConcept: string;
  directionalDetails: string;
  avoid: string;
}

export interface PromptinatorEntry {
  id: string;
  ordinal: number;
  name: string;
  family: { ordinal: number; name: string; description: string };
  brief: PromptinatorBrief;
  category: { id: string; version: string };
  style: { id: string; version: string };
  formulaVersion: "structured-v1" | "structured-v2";
  promptText: string;
  state: "ready" | "copied" | "claimed" | "completed";
  importedAt: string;
  copiedAt: string | null;
  claim: {
    id: string;
    claimedAt: string;
    claimant: string;
    expectedAssetId: string;
  } | null;
  completion: {
    assetId: string;
    revisionId: string;
    completedAt: string;
  } | null;
  source: { name: string; sha256: string };
  history: Array<{
    action:
      | "imported"
      | "copied"
      | "claimed"
      | "completed"
      | "requeued"
      | "style-selected"
      | "default-style-migrated";
    at: string;
    style?: { id: string; version: string };
    claimId?: string;
    assetId?: string;
    revisionId?: string;
  }>;
}

export interface PromptinatorStore {
  kind: "promptinator-store";
  schemaVersion: "1.3.0";
  updatedAt: string;
  entries: PromptinatorEntry[];
}

export interface PromptCatalogPreview {
  sourceName: string;
  sourceSha256: string;
  entryCount: number;
  familyCount: number;
  firstOrdinal: number;
  lastOrdinal: number;
  sampleNames: string[];
}

interface ResponsePayload {
  store?: PromptinatorStore;
  preview?: PromptCatalogPreview;
  importedCount?: number;
  alreadyImported?: boolean;
  error?: string;
}

const payloadFrom = async (response: Response) => {
  const payload = (await response.json()) as ResponsePayload;
  if (!response.ok) {
    throw new Error(payload.error || "Promptinator request failed.");
  }
  return payload;
};

export const loadPromptinatorStore = async (): Promise<PromptinatorStore> => {
  const payload = await payloadFrom(
    await fetch("/__prompt-spriter/promptinator", { cache: "no-store" }),
  );
  if (!payload.store) throw new Error("Promptinator did not return its store.");
  return payload.store;
};

export const previewPromptCatalog = async ({
  sourceName,
  text,
}: {
  sourceName: string;
  text: string;
}): Promise<PromptCatalogPreview> => {
  const payload = await payloadFrom(
    await fetch("/__prompt-spriter/promptinator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "preview-import", sourceName, text }),
    }),
  );
  if (!payload.preview) throw new Error("Import preview was not returned.");
  return payload.preview;
};

export const importPromptCatalog = async ({
  sourceName,
  text,
  expectedUpdatedAt,
}: {
  sourceName: string;
  text: string;
  expectedUpdatedAt: string;
}) => {
  const payload = await payloadFrom(
    await fetch("/__prompt-spriter/promptinator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "import",
        sourceName,
        text,
        expectedUpdatedAt,
      }),
    }),
  );
  if (
    !payload.store ||
    typeof payload.importedCount !== "number" ||
    typeof payload.alreadyImported !== "boolean"
  ) {
    throw new Error("Promptinator returned an incomplete import result.");
  }
  return {
    store: payload.store,
    importedCount: payload.importedCount,
    alreadyImported: payload.alreadyImported,
  };
};

export const transitionPromptinatorEntry = async ({
  action,
  entryId,
  expectedUpdatedAt,
}: {
  action: "mark-copied" | "requeue";
  entryId: string;
  expectedUpdatedAt: string;
}) => {
  const payload = await payloadFrom(
    await fetch("/__prompt-spriter/promptinator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, entryId, expectedUpdatedAt }),
    }),
  );
  if (!payload.store) throw new Error("Updated store was not returned.");
  return payload.store;
};

export const setPromptinatorEntryStyle = async ({
  entryId,
  style,
  expectedUpdatedAt,
}: {
  entryId: string;
  style: { id: string; version: string };
  expectedUpdatedAt: string;
}) => {
  const payload = await payloadFrom(
    await fetch("/__prompt-spriter/promptinator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "set-style",
        entryId,
        style,
        expectedUpdatedAt,
      }),
    }),
  );
  if (!payload.store) throw new Error("Updated store was not returned.");
  return payload.store;
};
