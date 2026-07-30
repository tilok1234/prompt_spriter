import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";
import {
  createContractValidator,
  readJson,
  validateLibraryRoot,
  validateRecord,
} from "./contracts.mjs";
import {
  renameWithRetry,
  sha256,
  writeJson,
  writeJsonAtomically,
} from "./fs-safety.mjs";

const revisionPattern = /^r([0-9]{3,})$/;

const nextRevisionId = (revisionsRoot) => {
  const numbers = readdirSync(revisionsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name.match(revisionPattern))
    .filter(Boolean)
    .map((match) => Number(match[1]));
  const next = Math.max(0, ...numbers) + 1;
  return `r${String(next).padStart(3, "0")}`;
};

const buildRevision = ({
  submission,
  category,
  revisionId,
  createdAt,
  copiedPaths,
}) => {
  const revisionRelativeRoot = `revisions/${revisionId}`;
  const columns = submission.output.animations.reduce(
    (total, animation) => total + animation.frames,
    0,
  );
  return {
    kind: "revision",
    schemaVersion: "1.0.0",
    assetId: submission.assetId,
    id: revisionId,
    parentRevisionId: submission.baseRevisionId,
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
};

const validateCurrentRecords = ({
  ajv,
  asset,
  review,
  baseRevision,
  submission,
}) => {
  const failures = [
    ...validateRecord(ajv, asset, "asset.json"),
    ...validateRecord(ajv, review, "review.json"),
    ...validateRecord(ajv, baseRevision, "base revision.json"),
  ];
  if (
    asset.id !== submission.assetId ||
    review.assetId !== submission.assetId ||
    baseRevision.assetId !== submission.assetId ||
    baseRevision.id !== submission.baseRevisionId
  ) {
    failures.push("existing asset, review, or base revision identity mismatch");
  }
  if (asset.name !== submission.requestedName) {
    failures.push(
      `revision requestedName must remain "${asset.name}"`,
    );
  }
  if (
    asset.category.id !== submission.category.id ||
    asset.category.version !== submission.category.version ||
    asset.style.id !== submission.style.id ||
    asset.style.version !== submission.style.version ||
    baseRevision.category.id !== submission.category.id ||
    baseRevision.category.version !== submission.category.version ||
    baseRevision.style.id !== submission.style.id ||
    baseRevision.style.version !== submission.style.version
  ) {
    failures.push(
      "revision category/style must match the existing asset and base revision",
    );
  }
  if (
    !review.candidate ||
    review.candidate.revisionId !== submission.baseRevisionId ||
    review.candidate.lane !== "revise"
  ) {
    failures.push(
      `revision ingestion requires base ${submission.baseRevisionId} as the active Revise candidate`,
    );
  }
  return failures;
};

const receiptFor = ({
  submission,
  revisionId,
  resolvedJobDirectory,
  targetAssetDirectory,
  targetRevisionDirectory,
  completedAt,
  approvedRevisionId,
  warnings,
}) => ({
  kind: "ingestion-receipt",
  jobId: submission.jobId,
  assetId: submission.assetId,
  revisionId,
  baseRevisionId: submission.baseRevisionId,
  sourceStagingDirectory: resolvedJobDirectory,
  registeredAssetDirectory: targetAssetDirectory,
  registeredRevisionDirectory: targetRevisionDirectory,
  approvedRevisionIdPreserved: approvedRevisionId,
  completedAt,
  warnings,
});

const transactionMatchesStaging = ({
  transaction,
  submission,
  artifactPaths,
}) =>
  transaction.jobId === submission.jobId &&
  transaction.assetId === submission.assetId &&
  transaction.baseRevisionId === submission.baseRevisionId &&
  transaction.stagingHashes.source === sha256(artifactPaths.source) &&
  transaction.stagingHashes.sheet === sha256(artifactPaths.sheet) &&
  transaction.stagingHashes.thumbnail === sha256(artifactPaths.thumbnail);

const validateRegisteredRevisionHashes = ({
  transaction,
  targetRevisionDirectory,
}) => {
  const paths = {
    source: join(targetRevisionDirectory, "source.aseprite"),
    sheet: join(targetRevisionDirectory, "sheet.png"),
    thumbnail: join(targetRevisionDirectory, "thumbnail.png"),
  };
  return (
    existsSync(paths.source) &&
    existsSync(paths.sheet) &&
    existsSync(paths.thumbnail) &&
    sha256(paths.source) === transaction.stagingHashes.source &&
    sha256(paths.sheet) === transaction.stagingHashes.sheet &&
    sha256(paths.thumbnail) === transaction.stagingHashes.thumbnail
  );
};

const finishRevisionTransaction = ({
  transactionRoot,
  transaction,
  nextReview,
  reviewPath,
  currentReview,
  targetAssetDirectory,
  resolvedJobDirectory,
  submission,
  validationResult,
  libraryRoot,
  category,
  style,
}) => {
  const transactionRevisionDirectory = join(
    transactionRoot,
    "revision",
    transaction.revisionId,
  );
  const targetRevisionDirectory = join(
    targetAssetDirectory,
    "revisions",
    transaction.revisionId,
  );

  if (!existsSync(targetRevisionDirectory)) {
    if (!existsSync(transactionRevisionDirectory)) {
      throw new Error(
        "Revision transaction lost both its prepared and registered revision directories",
      );
    }
    renameWithRetry(
      transactionRevisionDirectory,
      targetRevisionDirectory,
    );
    transaction = {
      ...transaction,
      phase: "revision-registered",
    };
    writeJsonAtomically(
      join(transactionRoot, "transaction.json"),
      transaction,
    );
  } else if (
    existsSync(transactionRevisionDirectory) ||
    !validateRegisteredRevisionHashes({
      transaction,
      targetRevisionDirectory,
    })
  ) {
    throw new Error(
      `Registered revision collision or hash mismatch: ${targetRevisionDirectory}`,
    );
  }

  if (
    currentReview.updatedAt === transaction.reviewUpdatedAtBefore &&
    currentReview.candidate?.revisionId === transaction.baseRevisionId &&
    currentReview.candidate?.lane === "revise"
  ) {
    writeJsonAtomically(reviewPath, nextReview);
    currentReview = nextReview;
  } else if (
    currentReview.updatedAt !== nextReview.updatedAt ||
    currentReview.candidate?.revisionId !== transaction.revisionId ||
    currentReview.candidate?.lane !== "intake" ||
    currentReview.approvedRevisionId !==
      transaction.approvedRevisionIdBefore
  ) {
    throw new Error(
      "Review state changed while revision ingestion was in progress; the registered revision was left immutable for recovery",
    );
  }

  transaction = {
    ...transaction,
    phase: "review-updated",
  };
  writeJsonAtomically(
    join(transactionRoot, "transaction.json"),
    transaction,
  );

  const ajv = createContractValidator();
  const finalScan = validateLibraryRoot({
    ajv,
    libraryRoot,
    category,
    style,
  });
  if (finalScan.failures.length > 0) {
    throw new Error(
      [
        "Library failed after revision registration:",
        ...finalScan.failures.map((failure) => `- ${failure}`),
      ].join("\n"),
    );
  }

  const receipt = receiptFor({
    submission,
    revisionId: transaction.revisionId,
    resolvedJobDirectory,
    targetAssetDirectory,
    targetRevisionDirectory,
    completedAt: nextReview.updatedAt,
    approvedRevisionId: transaction.approvedRevisionIdBefore,
    warnings: validationResult.technicalWarnings,
  });
  writeJson(join(transactionRoot, "receipt.json"), receipt);

  return {
    assetId: submission.assetId,
    revisionId: transaction.revisionId,
    baseRevisionId: submission.baseRevisionId,
    jobId: submission.jobId,
    assetDirectory: targetAssetDirectory,
    transactionReceipt: join(transactionRoot, "receipt.json"),
    warnings: validationResult.technicalWarnings,
  };
};

export const ingestExistingRevision = ({
  resolvedWorkspaceRoot,
  resolvedJobDirectory,
  validationResult,
}) => {
  const {
    submission,
    validation,
    completion,
    category,
    style,
    artifactPaths,
  } = validationResult;
  const libraryRoot = join(resolvedWorkspaceRoot, "library");
  const targetAssetDirectory = join(
    libraryRoot,
    "assets",
    submission.assetId,
  );
  if (!existsSync(targetAssetDirectory)) {
    throw new Error(
      `Revision asset does not exist: ${targetAssetDirectory}`,
    );
  }

  const transactionRoot = join(
    resolvedWorkspaceRoot,
    "transactions",
    `ingest-${submission.jobId}-${submission.assetId}`,
  );
  const assetPath = join(targetAssetDirectory, "asset.json");
  const reviewPath = join(targetAssetDirectory, "review.json");
  const revisionsRoot = join(targetAssetDirectory, "revisions");
  const baseRevisionPath = join(
    revisionsRoot,
    submission.baseRevisionId,
    "revision.json",
  );
  if (
    !existsSync(assetPath) ||
    !existsSync(reviewPath) ||
    !existsSync(baseRevisionPath)
  ) {
    throw new Error(
      "Existing asset is missing asset.json, review.json, or the declared base revision",
    );
  }

  const ajv = createContractValidator();
  const asset = readJson(assetPath);
  let review = readJson(reviewPath);
  const baseRevision = readJson(baseRevisionPath);
  const currentFailures = validateCurrentRecords({
    ajv,
    asset,
    review,
    baseRevision,
    submission,
  });

  if (existsSync(transactionRoot)) {
    const receiptPath = join(transactionRoot, "receipt.json");
    if (existsSync(receiptPath)) {
      const receipt = readJson(receiptPath);
      if (
        receipt.jobId !== submission.jobId ||
        receipt.assetId !== submission.assetId ||
        receipt.baseRevisionId !== submission.baseRevisionId
      ) {
        throw new Error(
          `Ingestion transaction already belongs to different work: ${transactionRoot}`,
        );
      }
      return {
        assetId: receipt.assetId,
        revisionId: receipt.revisionId,
        baseRevisionId: receipt.baseRevisionId,
        jobId: receipt.jobId,
        assetDirectory: targetAssetDirectory,
        transactionReceipt: receiptPath,
        warnings: receipt.warnings ?? [],
      };
    }

    const transactionPath = join(transactionRoot, "transaction.json");
    const nextReviewPath = join(transactionRoot, "next-review.json");
    if (
      !existsSync(transactionPath) ||
      !existsSync(nextReviewPath)
    ) {
      throw new Error(
        `Incomplete revision transaction cannot be recovered automatically: ${transactionRoot}`,
      );
    }
    const transaction = readJson(transactionPath);
    const nextReview = readJson(nextReviewPath);
    if (
      !transactionMatchesStaging({
        transaction,
        submission,
        artifactPaths,
      })
    ) {
      throw new Error(
        `Revision transaction does not match the current staging artifacts: ${transactionRoot}`,
      );
    }
    return finishRevisionTransaction({
      transactionRoot,
      transaction,
      nextReview,
      reviewPath,
      currentReview: review,
      targetAssetDirectory,
      resolvedJobDirectory,
      submission,
      validationResult,
      libraryRoot,
      category,
      style,
    });
  }

  if (currentFailures.length > 0) {
    throw new Error(
      [
        "Existing asset is not ready for revision ingestion:",
        ...currentFailures.map((failure) => `- ${failure}`),
      ].join("\n"),
    );
  }

  const currentScan = validateLibraryRoot({
    ajv,
    libraryRoot,
    category,
    style,
  });
  if (currentScan.failures.length > 0) {
    throw new Error(
      [
        "Library must pass before revision ingestion:",
        ...currentScan.failures.map((failure) => `- ${failure}`),
      ].join("\n"),
    );
  }

  const revisionId = nextRevisionId(revisionsRoot);
  const targetRevisionDirectory = join(revisionsRoot, revisionId);
  if (existsSync(targetRevisionDirectory)) {
    throw new Error(
      `Revision already exists and will not be overwritten: ${targetRevisionDirectory}`,
    );
  }

  const transactionRevisionDirectory = join(
    transactionRoot,
    "revision",
    revisionId,
  );
  mkdirSync(transactionRevisionDirectory, { recursive: true });
  const copiedPaths = {
    source: join(transactionRevisionDirectory, "source.aseprite"),
    sheet: join(transactionRevisionDirectory, "sheet.png"),
    thumbnail: join(transactionRevisionDirectory, "thumbnail.png"),
    validation: join(transactionRevisionDirectory, "validation.json"),
  };
  copyFileSync(artifactPaths.source, copiedPaths.source);
  copyFileSync(artifactPaths.sheet, copiedPaths.sheet);
  copyFileSync(artifactPaths.thumbnail, copiedPaths.thumbnail);
  writeJson(copiedPaths.validation, validation);

  const createdAt = completion.completedAt;
  const revision = buildRevision({
    submission,
    category,
    revisionId,
    createdAt,
    copiedPaths,
  });
  const nextReview = {
    ...review,
    candidate: {
      revisionId,
      lane: "intake",
    },
    notes: review.notes.map((note) =>
      note.resolvedAt === null
        ? {
            ...note,
            resolvedAt: createdAt,
          }
        : note,
    ),
    updatedAt: createdAt,
  };
  writeJson(
    join(transactionRevisionDirectory, "revision.json"),
    revision,
  );
  writeJson(join(transactionRoot, "next-review.json"), nextReview);

  const generatedFailures = [
    ...validateRecord(ajv, revision, "generated revision.json"),
    ...validateRecord(ajv, nextReview, "generated next-review.json"),
    ...validateRecord(ajv, validation, "copied validation.json"),
  ];
  if (generatedFailures.length > 0) {
    throw new Error(
      [
        `Generated revision transaction failed before registration: ${transactionRoot}`,
        ...generatedFailures.map((failure) => `- ${failure}`),
      ].join("\n"),
    );
  }

  const transaction = {
    kind: "revision-ingestion-transaction",
    phase: "prepared",
    jobId: submission.jobId,
    assetId: submission.assetId,
    baseRevisionId: submission.baseRevisionId,
    revisionId,
    reviewUpdatedAtBefore: review.updatedAt,
    approvedRevisionIdBefore: review.approvedRevisionId,
    stagingHashes: {
      source: sha256(artifactPaths.source),
      sheet: sha256(artifactPaths.sheet),
      thumbnail: sha256(artifactPaths.thumbnail),
    },
  };
  writeJson(join(transactionRoot, "transaction.json"), transaction);

  return finishRevisionTransaction({
    transactionRoot,
    transaction,
    nextReview,
    reviewPath,
    currentReview: review,
    targetAssetDirectory,
    resolvedJobDirectory,
    submission,
    validationResult,
    libraryRoot,
    category,
    style,
  });
};
