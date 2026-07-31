import {
  copyFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import {
  createContractValidator,
  readJson,
  repositoryRoot,
  validateLibraryRoot,
  validateRecord,
} from "./contracts.mjs";
import {
  renameWithRetry,
  sha256,
  writeJson,
} from "./fs-safety.mjs";
import { ingestExistingRevision } from "./revision-ingestion.mjs";
import {
  completePromptinatorClaim,
  resolvePromptinatorClaimForSubmission,
} from "./promptinator.mjs";
import { validateSubmissionDirectory } from "./submission.mjs";

const staysInside = (root, path) => {
  const fromRoot = relative(resolve(root), resolve(path));
  return (
    fromRoot !== "" &&
    fromRoot !== ".." &&
    !fromRoot.startsWith("..\\") &&
    !fromRoot.startsWith("../")
  );
};

const tagsForSubmission = (submission) => {
  const words = submission.requestedName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return [...new Set([...words, "antigravity", submission.category.id])];
};

const sameJson = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);

const newAssetReceiptFor = ({
  submission,
  revisionId,
  resolvedJobDirectory,
  targetAssetDirectory,
  completedAt,
  warnings,
}) => ({
  kind: "ingestion-receipt",
  jobId: submission.jobId,
  assetId: submission.assetId,
  revisionId,
  sourceStagingDirectory: resolvedJobDirectory,
  registeredAssetDirectory: targetAssetDirectory,
  completedAt,
  warnings,
});

const newAssetResultFor = ({
  submission,
  revisionId,
  targetAssetDirectory,
  receiptPath,
  warnings,
}) => ({
  assetId: submission.assetId,
  revisionId,
  jobId: submission.jobId,
  assetDirectory: targetAssetDirectory,
  transactionReceipt: receiptPath,
  warnings,
});

const completePromptinatorForResult = ({
  result,
  resolvedWorkspaceRoot,
  promptinatorClaim,
  completedAt,
}) => {
  if (!promptinatorClaim) return result;
  const store = completePromptinatorClaim({
    workspaceRoot: resolvedWorkspaceRoot,
    entryId: promptinatorClaim.entryId,
    claimId: promptinatorClaim.claimId,
    assetId: result.assetId,
    revisionId: result.revisionId,
    completedAt,
  });
  const entry = store.entries.find(
    (candidate) => candidate.id === promptinatorClaim.entryId,
  );
  return {
    ...result,
    promptinator: {
      entryId: promptinatorClaim.entryId,
      claimId: promptinatorClaim.claimId,
      state: entry?.state ?? "completed",
    },
  };
};

const validatePreparedNewAssetTransaction = ({
  transactionRoot,
  transactionAssetDirectory,
  submission,
  validation,
  completion,
  category,
  style,
  styles,
  artifactPaths,
}) => {
  const revisionId = "r001";
  const revisionDirectory = join(
    transactionAssetDirectory,
    "revisions",
    revisionId,
  );
  const paths = {
    asset: join(transactionAssetDirectory, "asset.json"),
    review: join(transactionAssetDirectory, "review.json"),
    revision: join(revisionDirectory, "revision.json"),
    validation: join(revisionDirectory, "validation.json"),
    source: join(revisionDirectory, "source.aseprite"),
    sheet: join(revisionDirectory, "sheet.png"),
    thumbnail: join(revisionDirectory, "thumbnail.png"),
  };
  const missingPaths = Object.values(paths).filter(
    (path) => !existsSync(path),
  );
  if (missingPaths.length > 0) {
    throw new Error(
      [
        `Incomplete new-asset transaction cannot be recovered automatically: ${transactionRoot}`,
        ...missingPaths.map((path) => `- missing ${path}`),
      ].join("\n"),
    );
  }

  const asset = readJson(paths.asset);
  const review = readJson(paths.review);
  const revision = readJson(paths.revision);
  const copiedValidation = readJson(paths.validation);
  const ajv = createContractValidator();
  const failures = [
    ...validateRecord(ajv, asset, "prepared asset.json"),
    ...validateRecord(ajv, review, "prepared review.json"),
    ...validateRecord(ajv, revision, "prepared revision.json"),
    ...validateRecord(
      ajv,
      copiedValidation,
      "prepared validation.json",
    ),
  ];

  if (
    asset.id !== submission.assetId ||
    asset.name !== submission.requestedName ||
    asset.createdAt !== submission.submittedAt ||
    !sameJson(asset.category, submission.category) ||
    !sameJson(asset.style, submission.style)
  ) {
    failures.push(
      "prepared asset identity does not match the current staging submission",
    );
  }
  if (
    review.assetId !== submission.assetId ||
    review.approvedRevisionId !== null ||
    review.candidate?.revisionId !== revisionId ||
    review.candidate?.lane !== "intake" ||
    review.updatedAt !== completion.completedAt
  ) {
    failures.push(
      "prepared review state is not the expected unapproved r001 Intake candidate",
    );
  }
  if (
    revision.assetId !== submission.assetId ||
    revision.id !== revisionId ||
    revision.parentRevisionId !== null ||
    revision.createdAt !== completion.completedAt ||
    revision.request !== submission.request ||
    !sameJson(revision.category, submission.category) ||
    !sameJson(revision.style, submission.style) ||
    !sameJson(revision.producer, submission.producer)
  ) {
    failures.push(
      "prepared revision provenance does not match the current staging submission",
    );
  }
  if (!sameJson(copiedValidation, validation)) {
    failures.push(
      "prepared validation report does not match the current staging report",
    );
  }

  const expectedHashes = {
    source: sha256(artifactPaths.source),
    sheet: sha256(artifactPaths.sheet),
    thumbnail: sha256(artifactPaths.thumbnail),
  };
  for (const artifact of ["source", "sheet", "thumbnail"]) {
    if (
      sha256(paths[artifact]) !== expectedHashes[artifact] ||
      revision.artifacts?.[artifact]?.sha256 !==
        expectedHashes[artifact]
    ) {
      failures.push(
        `prepared ${artifact} does not match the current staging artifact`,
      );
    }
  }

  const transactionScan = validateLibraryRoot({
    ajv,
    libraryRoot: transactionRoot,
    category,
    styles,
  });
  failures.push(...transactionScan.failures);
  if (failures.length > 0) {
    throw new Error(
      [
        `Prepared new-asset transaction failed recovery validation: ${transactionRoot}`,
        ...failures.map((failure) => `- ${failure}`),
      ].join("\n"),
    );
  }
};

export const ingestSubmission = ({
  jobDirectory,
  workspaceRoot = resolve(repositoryRoot, "workspace"),
  verifySource = true,
}) => {
  const resolvedWorkspaceRoot = resolve(workspaceRoot);
  const stagingRoot = join(resolvedWorkspaceRoot, "staging");
  const resolvedJobDirectory = resolve(jobDirectory);
  if (!staysInside(stagingRoot, resolvedJobDirectory)) {
    throw new Error(
      `Ingestion source must be one job inside ${stagingRoot}`,
    );
  }

  const validationResult = validateSubmissionDirectory({
    jobDirectory: resolvedJobDirectory,
    requireCompletion: true,
    verifySource,
  });
  if (validationResult.failures.length > 0) {
    throw new Error(
      [
        "Staging job is not ingestion-ready:",
        ...validationResult.failures.map((failure) => `- ${failure}`),
      ].join("\n"),
    );
  }

  const {
    submission,
    validation,
    completion,
    category,
    style,
    styles,
    artifactPaths,
  } = validationResult;
  if (!submission.assetId) {
    throw new Error("An ingestion submission must declare a stable assetId");
  }
  const promptinatorClaim = resolvePromptinatorClaimForSubmission({
    workspaceRoot: resolvedWorkspaceRoot,
    submission,
  });
  if (submission.baseRevisionId !== null) {
    return ingestExistingRevision({
      resolvedWorkspaceRoot,
      resolvedJobDirectory,
      validationResult,
    });
  }

  const libraryRoot = join(resolvedWorkspaceRoot, "library");
  const assetsRoot = join(libraryRoot, "assets");
  const targetAssetDirectory = join(assetsRoot, submission.assetId);
  if (existsSync(targetAssetDirectory)) {
    throw new Error(
      `Asset already exists and will not be overwritten: ${targetAssetDirectory}`,
    );
  }

  const transactionId = `ingest-${submission.jobId}-${submission.assetId}`;
  const transactionRoot = join(
    resolvedWorkspaceRoot,
    "transactions",
    transactionId,
  );
  const revisionId = "r001";
  const transactionAssetDirectory = join(
    transactionRoot,
    "assets",
    submission.assetId,
  );
  const receiptPath = join(transactionRoot, "receipt.json");
  if (existsSync(transactionRoot)) {
    if (
      existsSync(receiptPath) ||
      !existsSync(transactionAssetDirectory)
    ) {
      throw new Error(
        `Ingestion transaction already exists and was left untouched: ${transactionRoot}`,
      );
    }
    validatePreparedNewAssetTransaction({
      transactionRoot,
      transactionAssetDirectory,
      submission,
      validation,
      completion,
      category,
      style,
      styles,
      artifactPaths,
    });
    mkdirSync(assetsRoot, { recursive: true });
    renameWithRetry(transactionAssetDirectory, targetAssetDirectory);
    writeJson(
      receiptPath,
      newAssetReceiptFor({
        submission,
        revisionId,
        resolvedJobDirectory,
        targetAssetDirectory,
        completedAt: completion.completedAt,
        warnings: validationResult.technicalWarnings,
      }),
    );
    return completePromptinatorForResult({
      resolvedWorkspaceRoot,
      promptinatorClaim,
      completedAt: completion.completedAt,
      result: newAssetResultFor({
        submission,
        revisionId,
        targetAssetDirectory,
        receiptPath,
        warnings: validationResult.technicalWarnings,
      }),
    });
  }

  const revisionDirectory = join(
    transactionAssetDirectory,
    "revisions",
    revisionId,
  );
  mkdirSync(revisionDirectory, { recursive: true });

  const copiedPaths = {
    source: join(revisionDirectory, "source.aseprite"),
    sheet: join(revisionDirectory, "sheet.png"),
    thumbnail: join(revisionDirectory, "thumbnail.png"),
    validation: join(revisionDirectory, "validation.json"),
  };
  copyFileSync(artifactPaths.source, copiedPaths.source);
  copyFileSync(artifactPaths.sheet, copiedPaths.sheet);
  copyFileSync(artifactPaths.thumbnail, copiedPaths.thumbnail);
  writeJson(copiedPaths.validation, validation);

  const revisionRelativeRoot = `revisions/${revisionId}`;
  const columns = submission.output.animations.reduce(
    (total, animation) => total + animation.frames,
    0,
  );
  const createdAt = completion.completedAt;
  const asset = {
    kind: "asset",
    schemaVersion: "1.0.0",
    id: submission.assetId,
    name: submission.requestedName,
    category: submission.category,
    style: submission.style,
    createdAt: submission.submittedAt,
    tags: tagsForSubmission(submission),
  };
  const revision = {
    kind: "revision",
    schemaVersion: "1.0.0",
    assetId: submission.assetId,
    id: revisionId,
    parentRevisionId: null,
    createdAt,
    request: submission.request,
    category: submission.category,
    style: submission.style,
    producer: submission.producer,
    artifacts: {
      source: {
        path: `${revisionRelativeRoot}/source.aseprite`,
        sha256: sha256(copiedPaths.source),
      },
      sheet: {
        path: `${revisionRelativeRoot}/sheet.png`,
        sha256: sha256(copiedPaths.sheet),
      },
      thumbnail: {
        path: `${revisionRelativeRoot}/thumbnail.png`,
        sha256: sha256(copiedPaths.thumbnail),
      },
    },
    sheet: {
      cellWidth: category.frame.width,
      cellHeight: category.frame.height,
      columns,
      rows: submission.output.directions.length,
      width: columns * category.frame.width,
      height: submission.output.directions.length * category.frame.height,
    },
    directions: submission.output.directions,
    animations: submission.output.animations,
    validationReportPath: `${revisionRelativeRoot}/validation.json`,
    batchId: null,
  };
  const review = {
    kind: "review",
    schemaVersion: "1.0.0",
    assetId: submission.assetId,
    approvedRevisionId: null,
    candidate: {
      revisionId,
      lane: "intake",
    },
    notes: [],
    archiveHistory: [],
    updatedAt: createdAt,
  };

  writeJson(join(transactionAssetDirectory, "asset.json"), asset);
  writeJson(join(transactionAssetDirectory, "review.json"), review);
  writeJson(join(revisionDirectory, "revision.json"), revision);

  const ajv = createContractValidator();
  const generatedFailures = [
    ...validateRecord(ajv, asset, "generated asset.json"),
    ...validateRecord(ajv, review, "generated review.json"),
    ...validateRecord(ajv, revision, "generated revision.json"),
    ...validateRecord(ajv, validation, "copied validation.json"),
  ];
  if (generatedFailures.length > 0) {
    throw new Error(
      [
        `Generated transaction failed before registration: ${transactionRoot}`,
        ...generatedFailures.map((failure) => `- ${failure}`),
      ].join("\n"),
    );
  }

  const transactionScan = validateLibraryRoot({
    ajv,
    libraryRoot: transactionRoot,
    category,
    styles,
  });
  if (transactionScan.failures.length > 0) {
    throw new Error(
      [
        `Generated transaction failed its library scan: ${transactionRoot}`,
        ...transactionScan.failures.map((failure) => `- ${failure}`),
      ].join("\n"),
    );
  }

  mkdirSync(assetsRoot, { recursive: true });
  renameWithRetry(transactionAssetDirectory, targetAssetDirectory);
  writeJson(
    receiptPath,
    newAssetReceiptFor({
      submission,
      revisionId,
      resolvedJobDirectory,
      targetAssetDirectory,
      completedAt: createdAt,
      warnings: validationResult.technicalWarnings,
    }),
  );

  return completePromptinatorForResult({
    resolvedWorkspaceRoot,
    promptinatorClaim,
    completedAt: completion.completedAt,
    result: newAssetResultFor({
      submission,
      revisionId,
      targetAssetDirectory,
      receiptPath,
      warnings: validationResult.technicalWarnings,
    }),
  });
};

export const defaultWorkspaceRoot = resolve(repositoryRoot, "workspace");
export const stagingJobName = (jobDirectory) => basename(resolve(jobDirectory));
