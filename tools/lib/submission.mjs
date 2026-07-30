import { existsSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import {
  createContractValidator,
  inspectSpriteSheet,
  isSafeRelativePath,
  readJson,
  repositoryRoot,
  validateRecord,
} from "./contracts.mjs";
import { verifyAsepriteSource } from "./aseprite-source.mjs";

const readRecord = (path, label, failures) => {
  if (!existsSync(path)) return null;
  try {
    return readJson(path);
  } catch (error) {
    failures.push(
      `${label} is not valid JSON (${error instanceof Error ? error.message : String(error)})`,
    );
    return null;
  }
};

const pathStaysInside = (root, relativePath) => {
  if (!isSafeRelativePath(relativePath)) return false;
  const fromRoot = relative(root, resolve(root, relativePath));
  return (
    fromRoot !== ".." &&
    !fromRoot.startsWith("..\\") &&
    !fromRoot.startsWith("../")
  );
};

export const validateSubmissionDirectory = ({
  jobDirectory,
  requireCompletion = false,
  verifySource = false,
}) => {
  const resolvedJobDirectory = resolve(jobDirectory);
  const failures = [];
  const technicalWarnings = [];
  const readinessWarnings = [];
  const ajv = createContractValidator();
  const artifactPaths = {};
  let sourceEvidence = null;

  const requireArtifact = (relativePath, label) => {
    if (!pathStaysInside(resolvedJobDirectory, relativePath)) {
      failures.push(`${label} uses an unsafe path: ${String(relativePath)}`);
      return null;
    }

    const artifactPath = join(resolvedJobDirectory, relativePath);
    if (!existsSync(artifactPath)) {
      failures.push(`${label} does not exist: ${relativePath}`);
      return null;
    }
    return artifactPath;
  };

  const category = readJson(
    join(repositoryRoot, "categories", "enemy-mob-32", "category.json"),
  );
  const style = readJson(
    join(repositoryRoot, "styles", "assembler-inspired-v1", "style.json"),
  );
  const submissionPath = join(resolvedJobDirectory, "submission.json");
  const validationPath = join(resolvedJobDirectory, "validation.json");
  const completionPath = join(resolvedJobDirectory, "completion.json");

  const submission = readRecord(
    submissionPath,
    "submission.json",
    failures,
  );
  if (!submission) {
    if (!existsSync(submissionPath)) {
      failures.push(`submission is incomplete: missing ${submissionPath}`);
    }
    return {
      failures,
      warnings: readinessWarnings,
      technicalWarnings,
      computedStatus: "failed",
      submission: null,
      validation: null,
      completion: null,
      category,
      style,
      artifactPaths,
      sourceEvidence,
      jobDirectory: resolvedJobDirectory,
    };
  }

  const submissionSchemaFailures = validateRecord(
    ajv,
    submission,
    submissionPath,
  );
  failures.push(...submissionSchemaFailures);
  if (submissionSchemaFailures.length === 0) {
    if (submission.jobId !== basename(resolvedJobDirectory)) {
      failures.push(
        `submission jobId "${submission.jobId}" does not match staging folder "${basename(resolvedJobDirectory)}"`,
      );
    }

    if (
      submission.category.id !== category.id ||
      submission.category.version !== category.version
    ) {
      failures.push(
        "submission does not reference the live enemy-mob-32 contract",
      );
    }

    if (
      submission.style.id !== style.id ||
      submission.style.version !== style.version
    ) {
      failures.push(
        "submission does not reference the live assembler-inspired-v1 profile",
      );
    }

    const expectedDirections = category.directions.map(
      (direction) => direction.id,
    );
    if (
      JSON.stringify(submission.output.directions) !==
      JSON.stringify(expectedDirections)
    ) {
      failures.push(
        `directions must be exactly: ${expectedDirections.join(", ")}`,
      );
    }

    const declaredAnimationIds = submission.output.animations.map(
      (animation) => animation.id,
    );
    const allowedAnimationSets = [
      category.firstVerticalSlice.animations,
      category.animations.map((animation) => animation.id),
    ];
    if (
      !allowedAnimationSets.some(
        (animationIds) =>
          JSON.stringify(animationIds) ===
          JSON.stringify(declaredAnimationIds),
      )
    ) {
      failures.push(
        "animations must be the first vertical slice or the complete category set, in contract order",
      );
    }

    let nextColumn = 0;
    for (const animation of submission.output.animations) {
      const contractAnimation = category.animations.find(
        (candidate) => candidate.id === animation.id,
      );
      if (!contractAnimation) continue;

      if (
        animation.startColumn !== nextColumn ||
        animation.frames !== contractAnimation.frames ||
        animation.durationMs !== contractAnimation.durationMs ||
        animation.playback !== contractAnimation.playback
      ) {
        failures.push(
          `${animation.id} layout or timing does not match the category contract`,
        );
      }
      nextColumn += contractAnimation.frames;
    }

    artifactPaths.source = requireArtifact(
      submission.output.sourcePath,
      "Aseprite source",
    );
    artifactPaths.sheet = requireArtifact(
      submission.output.sheetPath,
      "sprite sheet",
    );
    artifactPaths.thumbnail = requireArtifact(
      submission.output.thumbnailPath,
      "thumbnail",
    );

    if (
      artifactPaths.source &&
      extname(artifactPaths.source).toLowerCase() !== ".aseprite"
    ) {
      failures.push("source artifact must use the .aseprite extension");
    }

    if (artifactPaths.sheet) {
      const sheetDeclaration = {
        cellWidth: category.frame.width,
        cellHeight: category.frame.height,
        columns: nextColumn,
        rows: expectedDirections.length,
        width: nextColumn * category.frame.width,
        height: expectedDirections.length * category.frame.height,
      };
      try {
        const inspection = inspectSpriteSheet(artifactPaths.sheet, {
          sheet: sheetDeclaration,
        });
        failures.push(...inspection.failures);
        technicalWarnings.push(...inspection.warnings);
        if (inspection.opaqueColors > style.color.maximumOpaqueColors) {
          failures.push(
            `${artifactPaths.sheet}: uses ${inspection.opaqueColors} opaque colors; style maximum is ${style.color.maximumOpaqueColors}`,
          );
        }
      } catch (error) {
        failures.push(
          `${artifactPaths.sheet}: could not be decoded as PNG (${error instanceof Error ? error.message : String(error)})`,
        );
      }
    }

    if (
      verifySource &&
      artifactPaths.source &&
      artifactPaths.sheet
    ) {
      const sourceResult = verifyAsepriteSource({
        sourcePath: artifactPaths.source,
        sheetPath: artifactPaths.sheet,
        submission,
        category,
        outputDirectory: join(
          repositoryRoot,
          "workspace",
          "qa",
          "source-validation",
          submission.jobId,
        ),
      });
      failures.push(...sourceResult.failures);
      technicalWarnings.push(...sourceResult.warnings);
      sourceEvidence = sourceResult.evidence;
    }
  }

  const computedStatus =
    failures.length > 0
      ? "failed"
      : technicalWarnings.length > 0
        ? "passed-with-warnings"
        : "passed";

  const validation = readRecord(
    validationPath,
    "validation.json",
    failures,
  );
  if (validation) {
    const schemaFailures = validateRecord(ajv, validation, validationPath);
    failures.push(...schemaFailures);
    if (schemaFailures.length === 0) {
      if (validation.jobId !== submission.jobId) {
        failures.push("validation jobId does not match submission jobId");
      }
      if (validation.status !== computedStatus) {
        failures.push(
          `validation status is "${validation.status}"; computed status is "${computedStatus}"`,
        );
      }
    }
  } else if (!existsSync(validationPath) || requireCompletion) {
    const message =
      "validation.json is not present; write it from the preflight result before completion";
    if (requireCompletion) failures.push(message);
    else readinessWarnings.push(message);
  }

  const completion = readRecord(
    completionPath,
    "completion.json",
    failures,
  );
  if (completion) {
    const schemaFailures = validateRecord(ajv, completion, completionPath);
    failures.push(...schemaFailures);
    if (schemaFailures.length === 0) {
      if (!validation) {
        failures.push("completion.json exists before a valid validation.json");
      }
      if (
        completion.jobId !== submission.jobId ||
        completion.assetId !== submission.assetId
      ) {
        failures.push("completion identity does not match submission");
      }
      if (
        completion.submissionPath !== "submission.json" ||
        completion.validationPath !== "validation.json"
      ) {
        failures.push(
          "completion must reference submission.json and validation.json in its staging folder",
        );
      }

      const requiredCompletionFiles = new Set([
        "submission.json",
        "validation.json",
        submission.output.sourcePath,
        submission.output.sheetPath,
        submission.output.thumbnailPath,
      ]);
      const declaredFiles = new Set(completion.filePaths);
      for (const requiredFile of requiredCompletionFiles) {
        if (!declaredFiles.has(requiredFile)) {
          failures.push(
            `completion filePaths is missing required file: ${requiredFile}`,
          );
        }
      }
      for (const filePath of completion.filePaths) {
        requireArtifact(filePath, "completion file");
      }
    }
  } else if (requireCompletion) {
    failures.push(
      "completion.json is required for ingestion and must be written last",
    );
  }

  return {
    failures,
    warnings: [...technicalWarnings, ...readinessWarnings],
    technicalWarnings,
    computedStatus,
    submission,
    validation,
    completion,
    category,
    style,
    artifactPaths,
    sourceEvidence,
    jobDirectory: resolvedJobDirectory,
  };
};
