import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import {
  createContractValidator,
  migrateReviewRecord,
  readJson,
  repositoryRoot,
  validateRecord,
} from "./contracts.mjs";
import { writeJsonAtomically } from "./fs-safety.mjs";

export class StyleExampleError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "StyleExampleError";
    this.statusCode = statusCode;
  }
}

const defaultStylesRoot = () => join(repositoryRoot, "styles");
const defaultLibraryRoot = () => join(repositoryRoot, "workspace", "library");
const registryPathFor = (styleId, stylesRoot) =>
  join(stylesRoot ?? defaultStylesRoot(), styleId, "examples.json");
const revisionDirectoryFor = (libraryRoot, assetId, revisionId) =>
  join(libraryRoot, "assets", assetId, "revisions", revisionId);

const sha256File = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

export const readStyleExampleRegistry = ({ styleId, stylesRoot } = {}) => {
  const path = registryPathFor(styleId, stylesRoot);
  if (!existsSync(path)) return null;
  return readJson(path);
};

export const validateStyleExampleRegistry = ({
  registry,
  label,
  ajv = createContractValidator(),
  libraryRoot = defaultLibraryRoot(),
}) => {
  const failures = validateRecord(ajv, registry, label);
  if (failures.length > 0) return failures;

  const seen = new Set();
  for (const example of registry.examples) {
    const exampleLabel = `${label}: ${example.assetId}/${example.revisionId}`;
    if (seen.has(example.assetId)) {
      failures.push(`${exampleLabel}: asset is promoted more than once`);
      continue;
    }
    seen.add(example.assetId);

    const canonicalSegment = `assets/${example.assetId}/revisions/${example.revisionId}/`;
    for (const path of [example.sheetPath, example.sourcePath]) {
      if (!path.replaceAll("\\", "/").includes(canonicalSegment)) {
        failures.push(
          `${exampleLabel}: artifact path does not point at the promoted revision: ${path}`,
        );
      }
    }

    const assetDirectory = join(libraryRoot, "assets", example.assetId);
    const reviewPath = join(assetDirectory, "review.json");
    const revisionDirectory = revisionDirectoryFor(
      libraryRoot,
      example.assetId,
      example.revisionId,
    );
    const revisionPath = join(revisionDirectory, "revision.json");
    if (!existsSync(reviewPath) || !existsSync(revisionPath)) {
      failures.push(`${exampleLabel}: promoted revision does not exist`);
      continue;
    }
    const review = migrateReviewRecord(readJson(reviewPath));
    if (review.approvedRevisionId !== example.revisionId) {
      failures.push(
        `${exampleLabel}: promoted revision is not the approved revision`,
      );
    }
    const revision = readJson(revisionPath);
    if (
      revision.style.id !== registry.style.id ||
      revision.style.version !== registry.style.version
    ) {
      failures.push(
        `${exampleLabel}: revision style ${revision.style.id}@${revision.style.version} does not match the registry style`,
      );
    }
    const sheetFile = join(revisionDirectory, basename(example.sheetPath));
    const sourceFile = join(revisionDirectory, basename(example.sourcePath));
    if (!existsSync(sheetFile) || !existsSync(sourceFile)) {
      failures.push(`${exampleLabel}: promoted artifacts do not exist`);
      continue;
    }
    if (sha256File(sheetFile) !== example.sheetSha256) {
      failures.push(
        `${exampleLabel}: promoted sheet hash does not match the registry`,
      );
    }
    const recordedSha = revision.artifacts?.sheet?.sha256;
    if (recordedSha && recordedSha !== example.sheetSha256) {
      failures.push(
        `${exampleLabel}: registry hash does not match the immutable revision record`,
      );
    }
  }
  return failures;
};

export const promoteStyleExample = ({
  styleId,
  assetId,
  note,
  stylesRoot,
  libraryRoot = defaultLibraryRoot(),
  now = () => new Date().toISOString(),
}) => {
  const assetDirectory = join(libraryRoot, "assets", assetId);
  const reviewPath = join(assetDirectory, "review.json");
  if (!existsSync(reviewPath)) {
    throw new StyleExampleError(
      `Asset was not found in the Library: ${assetId}`,
      404,
    );
  }
  const review = migrateReviewRecord(readJson(reviewPath));
  if (!review.approvedRevisionId) {
    throw new StyleExampleError(
      `Asset ${assetId} has no user-approved revision; promotion requires explicit approval first.`,
      409,
    );
  }
  const revisionId = review.approvedRevisionId;
  const revisionDirectory = revisionDirectoryFor(
    libraryRoot,
    assetId,
    revisionId,
  );
  const revision = readJson(join(revisionDirectory, "revision.json"));
  if (revision.style.id !== styleId) {
    throw new StyleExampleError(
      `Asset ${assetId} was drawn with ${revision.style.id}@${revision.style.version}, not ${styleId}.`,
      409,
    );
  }

  const stylePath = join(
    stylesRoot ?? defaultStylesRoot(),
    styleId,
    "style.json",
  );
  if (!existsSync(stylePath)) {
    throw new StyleExampleError(`Style profile was not found: ${styleId}`, 404);
  }
  const style = readJson(stylePath);

  const sheetName = basename(revision.artifacts.sheet.path);
  const sourceName = basename(revision.artifacts.source.path);
  const sheetFile = join(revisionDirectory, sheetName);
  if (!existsSync(sheetFile)) {
    throw new StyleExampleError(`Promoted sheet does not exist: ${sheetFile}`, 404);
  }
  const sheetSha256 = sha256File(sheetFile);
  const recordedSha = revision.artifacts?.sheet?.sha256;
  if (recordedSha && sheetSha256 !== recordedSha) {
    throw new StyleExampleError(
      `Sheet hash for ${assetId} ${revisionId} does not match its immutable revision record.`,
      409,
    );
  }

  const relativeDirectory = [
    "workspace",
    "library",
    "assets",
    assetId,
    "revisions",
    revisionId,
  ].join("/");

  const registryPath = registryPathFor(styleId, stylesRoot);
  const registry = existsSync(registryPath)
    ? readJson(registryPath)
    : {
        kind: "style-example-registry",
        schemaVersion: "1.0.0",
        style: { id: style.id, version: style.version },
        examples: [],
      };

  const entry = {
    assetId,
    revisionId,
    sheetPath: `${relativeDirectory}/${sheetName}`,
    sourcePath: `${relativeDirectory}/${sourceName}`,
    sheetSha256,
    note,
    promotedAt: now(),
  };
  const examples = registry.examples.filter(
    (candidate) => candidate.assetId !== assetId,
  );
  examples.push(entry);
  examples.sort((left, right) => left.assetId.localeCompare(right.assetId));
  const nextRegistry = { ...registry, examples };

  const failures = validateStyleExampleRegistry({
    registry: nextRegistry,
    label: registryPath,
    libraryRoot,
  });
  if (failures.length > 0) {
    throw new StyleExampleError(
      `Promotion produced an invalid registry:\n${failures.join("\n")}`,
      500,
    );
  }
  writeJsonAtomically(registryPath, nextRegistry);
  return { registryPath, entry, exampleCount: examples.length };
};

export const demoteStyleExample = ({ styleId, assetId, stylesRoot }) => {
  const registryPath = registryPathFor(styleId, stylesRoot);
  if (!existsSync(registryPath)) {
    throw new StyleExampleError(
      `No example registry exists for ${styleId}.`,
      404,
    );
  }
  const registry = readJson(registryPath);
  const examples = registry.examples.filter(
    (candidate) => candidate.assetId !== assetId,
  );
  if (examples.length === registry.examples.length) {
    throw new StyleExampleError(
      `Asset ${assetId} is not a promoted example for ${styleId}.`,
      404,
    );
  }
  writeJsonAtomically(registryPath, { ...registry, examples });
  return { registryPath, exampleCount: examples.length };
};
