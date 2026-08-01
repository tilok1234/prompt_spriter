import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  createContractValidator,
  readJson,
  validateRecord,
} from "./contracts.mjs";
import {
  renameWithRetry,
  writeJson,
} from "./fs-safety.mjs";

const batchIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const assetIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const revisionIdPattern = /^r[0-9]{3,}$/;

export class RevisionBatchError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "RevisionBatchError";
    this.statusCode = statusCode;
  }
}

const staysInside = (root, path) => {
  const fromRoot = relative(resolve(root), resolve(path));
  return (
    fromRoot !== "" &&
    fromRoot !== ".." &&
    !fromRoot.startsWith("..\\") &&
    !fromRoot.startsWith("../")
  );
};

const describeNoteTarget = (target) => {
  const parts = [];
  if (target.direction) parts.push(`direction ${target.direction}`);
  if (target.animation) parts.push(`animation ${target.animation}`);
  if (target.frames?.length) {
    parts.push(`frames ${target.frames.join(", ")}`);
  }
  return parts.length > 0 ? parts.join("; ") : "entire sprite";
};

const formatBatchNote = (note) =>
  `[${describeNoteTarget(note.target)}] ${note.text}`;

const renderRevisionBatchBrief = ({
  batch,
  selectedItems,
}) => {
  const lines = [
    `# Revision batch: ${batch.id}`,
    "",
    `Created: ${batch.createdAt}`,
    `Items: ${batch.items.length}`,
    "",
    "## Operating rules",
    "",
    "- Follow `AGENTS.md` and `docs/ANTIGRAVITY_WORKFLOW.md`.",
    "- Work from each exact base revision listed below.",
    "- Create one new staging job directory per asset.",
    "- Never overwrite an ingested source or edit `review.json`.",
    "- Do not approve, archive, ingest, or change MCP configuration.",
    "- Keep each submission's `assetId` and `baseRevisionId` exact.",
    "- Write `completion.json` last and stop after completed staging.",
    "",
    "## Revision items",
    "",
  ];

  selectedItems.forEach((item, index) => {
    lines.push(
      `### ${index + 1}. ${item.asset.name}`,
      "",
      `- Asset ID: \`${item.asset.id}\``,
      `- Base revision: \`${item.revision.id}\``,
      `- Category: \`${item.asset.category.id}@${item.asset.category.version}\``,
      `- Style: \`${item.asset.style.id}@${item.asset.style.version}\``,
      `- Source: \`workspace/library/assets/${item.asset.id}/revisions/${item.revision.id}/source.aseprite\``,
      "",
      "Unresolved notes:",
      "",
      ...item.notes.map((note) => `- ${formatBatchNote(note)}`),
      "",
      "Submission identity:",
      "",
      `- \`assetId\`: \`${item.asset.id}\``,
      `- \`baseRevisionId\`: \`${item.revision.id}\``,
      `- \`requestedName\`: \`${item.asset.name}\``,
      "",
    );
  });

  lines.push(
    "## Completion",
    "",
    "For every item, run:",
    "",
    "```powershell",
    "npm.cmd run validate:submission -- workspace/staging/<job-id> --require-completion",
    "```",
    "",
    "Report each completed staging path separately. Prompt Spriter performs trusted ingestion later.",
    "",
  );

  return lines.join("\n");
};

const readSelectedItem = ({
  libraryRoot,
  selection,
  ajv,
}) => {
  if (
    !selection ||
    typeof selection !== "object" ||
    Array.isArray(selection) ||
    Object.keys(selection).some(
      (key) =>
        !["assetId", "revisionId", "expectedUpdatedAt"].includes(key),
    )
  ) {
    throw new RevisionBatchError(
      "Each batch selection must contain only assetId, revisionId, and expectedUpdatedAt.",
    );
  }
  if (!assetIdPattern.test(selection.assetId ?? "")) {
    throw new RevisionBatchError("Batch selection has an invalid asset ID.");
  }
  if (!revisionIdPattern.test(selection.revisionId ?? "")) {
    throw new RevisionBatchError(
      "Batch selection has an invalid revision ID.",
    );
  }

  const assetsRoot = join(resolve(libraryRoot), "assets");
  const assetDirectory = join(assetsRoot, selection.assetId);
  if (!staysInside(assetsRoot, assetDirectory)) {
    throw new RevisionBatchError("Batch asset path escaped the library root.");
  }
  const assetPath = join(assetDirectory, "asset.json");
  const reviewPath = join(assetDirectory, "review.json");
  const revisionPath = join(
    assetDirectory,
    "revisions",
    selection.revisionId,
    "revision.json",
  );
  if (
    !existsSync(assetPath) ||
    !existsSync(reviewPath) ||
    !existsSync(revisionPath)
  ) {
    throw new RevisionBatchError(
      `Batch selection was not found: ${selection.assetId} ${selection.revisionId}.`,
      404,
    );
  }

  const asset = readJson(assetPath);
  const review = readJson(reviewPath);
  const revision = readJson(revisionPath);
  const failures = [
    ...validateRecord(ajv, asset, assetPath),
    ...validateRecord(ajv, review, reviewPath),
    ...validateRecord(ajv, revision, revisionPath),
  ];
  if (failures.length > 0) {
    throw new RevisionBatchError(
      `Batch selection has invalid library records: ${failures.join("; ")}`,
      500,
    );
  }
  if (
    asset.id !== selection.assetId ||
    review.assetId !== selection.assetId ||
    revision.assetId !== selection.assetId ||
    revision.id !== selection.revisionId
  ) {
    throw new RevisionBatchError(
      "Batch selection identity does not match its library records.",
      409,
    );
  }
  if (
    review.candidate?.revisionId !== selection.revisionId ||
    review.candidate?.lane !== "revise"
  ) {
    throw new RevisionBatchError(
      `Batch selection requires ${selection.assetId} ${selection.revisionId} in Revise.`,
      409,
    );
  }
  if (
    typeof selection.expectedUpdatedAt !== "string" ||
    selection.expectedUpdatedAt !== review.updatedAt
  ) {
    throw new RevisionBatchError(
      `Review state changed for ${selection.assetId}. Reload Revise before creating the batch.`,
      409,
    );
  }

  const notes = review.notes.filter((note) => note.resolvedAt === null);
  if (notes.length === 0) {
    throw new RevisionBatchError(
      `Batch selection ${selection.assetId} has no unresolved revision notes.`,
      409,
    );
  }

  return {
    asset,
    review,
    revision,
    notes,
  };
};

export const createRevisionBatch = ({
  workspaceRoot,
  batchId,
  selections,
  now = () => new Date().toISOString(),
}) => {
  if (!batchIdPattern.test(batchId ?? "")) {
    throw new RevisionBatchError(
      "Batch ID must be lowercase kebab-case.",
    );
  }
  if (
    !Array.isArray(selections) ||
    selections.length === 0 ||
    selections.length > 100
  ) {
    throw new RevisionBatchError(
      "A revision batch must select between 1 and 100 Revise items with unresolved revision notes.",
    );
  }

  const uniqueKeys = new Set();
  for (const selection of selections) {
    const key = `${selection?.assetId ?? ""}:${selection?.revisionId ?? ""}`;
    if (uniqueKeys.has(key)) {
      throw new RevisionBatchError(
        `Revision batch contains a duplicate selection: ${key}.`,
      );
    }
    uniqueKeys.add(key);
  }

  const resolvedWorkspaceRoot = resolve(workspaceRoot);
  const libraryRoot = join(resolvedWorkspaceRoot, "library");
  const revisionBatchesRoot = join(
    resolvedWorkspaceRoot,
    "batches",
    "revision",
  );
  const targetDirectory = join(revisionBatchesRoot, batchId);
  if (!staysInside(revisionBatchesRoot, targetDirectory)) {
    throw new RevisionBatchError("Batch path escaped the revision-batch root.");
  }
  if (existsSync(targetDirectory)) {
    throw new RevisionBatchError(
      `Revision batch already exists and will not be overwritten: ${batchId}.`,
      409,
    );
  }

  const transactionRoot = join(
    resolvedWorkspaceRoot,
    "transactions",
    `create-revision-batch-${batchId}`,
  );
  if (existsSync(transactionRoot)) {
    throw new RevisionBatchError(
      `Revision batch transaction already exists and was left untouched: ${batchId}.`,
      409,
    );
  }

  const ajv = createContractValidator();
  const selectedItems = selections
    .map((selection) =>
      readSelectedItem({
        libraryRoot,
        selection,
        ajv,
      }),
    )
    .sort((left, right) => left.asset.id.localeCompare(right.asset.id));
  const createdAt = now();
  const batch = {
    kind: "batch",
    schemaVersion: "1.0.0",
    id: batchId,
    batchType: "revision",
    createdAt,
    items: selectedItems.map((item) => ({
      assetId: item.asset.id,
      baseRevisionId: item.revision.id,
      notes: item.notes.map(formatBatchNote),
    })),
  };
  const failures = validateRecord(ajv, batch, `${batchId}/batch.json`);
  if (failures.length > 0) {
    throw new RevisionBatchError(
      `Generated revision batch is invalid: ${failures.join("; ")}`,
      500,
    );
  }

  const brief = renderRevisionBatchBrief({
    batch,
    selectedItems,
  });
  const transactionBatchDirectory = join(transactionRoot, "batch");
  mkdirSync(transactionBatchDirectory, { recursive: true });
  writeJson(join(transactionBatchDirectory, "batch.json"), batch);
  writeFileSync(
    join(transactionBatchDirectory, "brief.md"),
    brief,
    "utf8",
  );

  mkdirSync(revisionBatchesRoot, { recursive: true });
  renameWithRetry(transactionBatchDirectory, targetDirectory);
  const receipt = {
    kind: "revision-batch-creation-receipt",
    batchId,
    createdAt,
    registeredDirectory: targetDirectory,
    itemCount: batch.items.length,
  };
  writeJson(join(transactionRoot, "receipt.json"), receipt);

  return {
    batch,
    brief,
    directory: targetDirectory,
    relativeDirectory: `batches/revision/${batchId}`,
  };
};

export const readRevisionBatches = ({ workspaceRoot }) => {
  const resolvedWorkspaceRoot = resolve(workspaceRoot);
  const revisionBatchesRoot = join(
    resolvedWorkspaceRoot,
    "batches",
    "revision",
  );
  const entries = [];
  const errors = [];
  if (!existsSync(revisionBatchesRoot)) {
    return { entries, errors };
  }

  const ajv = createContractValidator();
  for (const directory of readdirSync(revisionBatchesRoot, {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name))) {
    try {
      const batchDirectory = join(revisionBatchesRoot, directory.name);
      const batchPath = join(batchDirectory, "batch.json");
      const briefPath = join(batchDirectory, "brief.md");
      if (!existsSync(batchPath) || !existsSync(briefPath)) {
        throw new Error("missing batch.json or brief.md");
      }
      const batch = readJson(batchPath);
      const failures = validateRecord(ajv, batch, batchPath);
      if (
        failures.length > 0 ||
        batch.batchType !== "revision" ||
        batch.id !== directory.name
      ) {
        throw new Error(
          failures.join("; ") ||
            "batch type or directory identity does not match",
        );
      }
      entries.push({
        batch,
        brief: readFileSync(briefPath, "utf8"),
        directory: batchDirectory,
        relativeDirectory: `batches/revision/${batch.id}`,
      });
    } catch (error) {
      errors.push(
        `${directory.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  entries.sort(
    (left, right) =>
      Date.parse(right.batch.createdAt) - Date.parse(left.batch.createdAt),
  );
  return { entries, errors };
};
