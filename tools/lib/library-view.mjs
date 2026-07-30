import { existsSync, readdirSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { isSafeRelativePath, readJson } from "./contracts.mjs";

const revisionPattern = /^r[0-9]{3,}$/;

const staysInside = (root, path) => {
  const fromRoot = relative(resolve(root), resolve(path));
  return (
    fromRoot !== ".." &&
    !fromRoot.startsWith("..\\") &&
    !fromRoot.startsWith("../") &&
    !isAbsolute(fromRoot)
  );
};

const resolveArtifact = (assetDirectory, relativePath) => {
  if (
    !isSafeRelativePath(relativePath) ||
    !staysInside(assetDirectory, join(assetDirectory, relativePath))
  ) {
    throw new Error(`unsafe artifact path: ${relativePath}`);
  }
  const path = join(assetDirectory, relativePath);
  if (!existsSync(path)) {
    throw new Error(`missing artifact: ${relativePath}`);
  }
  return path;
};

export const readViewerLibrary = (libraryRoot) => {
  const assetsRoot = join(resolve(libraryRoot), "assets");
  const entries = [];
  const errors = [];
  if (!existsSync(assetsRoot)) return { entries, errors };

  const assetDirectories = readdirSync(assetsRoot, {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const directory of assetDirectories) {
    const assetDirectory = join(assetsRoot, directory.name);
    try {
      const asset = readJson(join(assetDirectory, "asset.json"));
      const review = readJson(join(assetDirectory, "review.json"));
      const revisionsRoot = join(assetDirectory, "revisions");
      const revisionIds = readdirSync(revisionsRoot, {
        withFileTypes: true,
      })
        .filter(
          (entry) =>
            entry.isDirectory() && revisionPattern.test(entry.name),
        )
        .map((entry) => entry.name)
        .sort((left, right) => right.localeCompare(left));

      for (const revisionId of revisionIds) {
        const revisionDirectory = join(
          assetDirectory,
          "revisions",
          revisionId,
        );
        const revision = readJson(join(revisionDirectory, "revision.json"));
        const validation = readJson(
          join(assetDirectory, revision.validationReportPath),
        );
        entries.push({
          asset,
          review,
          revision,
          validation,
          sheetFile: resolveArtifact(
            assetDirectory,
            revision.artifacts.sheet.path,
          ),
          thumbnailFile: resolveArtifact(
            assetDirectory,
            revision.artifacts.thumbnail.path,
          ),
          origin: "local-library",
        });
      }
    } catch (error) {
      errors.push(
        `${directory.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  entries.sort(
    (left, right) =>
      Date.parse(right.revision.createdAt) - Date.parse(left.revision.createdAt),
  );
  return { entries, errors };
};
