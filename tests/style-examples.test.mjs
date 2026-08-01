import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  demoteStyleExample,
  promoteStyleExample,
  readStyleExampleRegistry,
  validateStyleExampleRegistry,
} from "../tools/lib/style-examples.mjs";
import { readJson } from "../tools/lib/contracts.mjs";

const temporaryRoots = [];

const writeJson = (path, value) =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");

const seedWorkspace = ({ approved = true, styleId = "test-style" } = {}) => {
  const root = mkdtempSync(join(tmpdir(), "prompt-spriter-examples-"));
  temporaryRoots.push(root);
  const libraryRoot = join(root, "library");
  const stylesRoot = join(root, "styles");
  const assetId = "test-critter-001";
  const revisionDirectory = join(
    libraryRoot,
    "assets",
    assetId,
    "revisions",
    "r001",
  );
  mkdirSync(revisionDirectory, { recursive: true });
  mkdirSync(join(stylesRoot, styleId), { recursive: true });

  writeJson(join(stylesRoot, styleId, "style.json"), {
    kind: "style-profile",
    id: styleId,
    version: "0.1.0",
  });
  writeJson(join(libraryRoot, "assets", assetId, "review.json"), {
    kind: "review",
    schemaVersion: "1.2.0",
    assetId,
    approvedRevisionId: approved ? "r001" : null,
    candidate: null,
    notes: [],
    archiveHistory: [],
    updatedAt: "2026-08-01T00:00:00.000Z",
  });
  writeJson(join(revisionDirectory, "revision.json"), {
    kind: "revision",
    style: { id: styleId, version: "0.1.0" },
    artifacts: {
      sheet: { path: "revisions/r001/sheet.png" },
      source: { path: "revisions/r001/source.aseprite" },
    },
  });
  writeFileSync(join(revisionDirectory, "sheet.png"), Buffer.from([1, 2, 3, 4]));
  writeFileSync(
    join(revisionDirectory, "source.aseprite"),
    Buffer.from([5, 6, 7, 8]),
  );
  return { root, libraryRoot, stylesRoot, assetId, styleId };
};

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("style example promotion", () => {
  it("promotes the approved revision and validates the written registry", () => {
    const { libraryRoot, stylesRoot, assetId, styleId } = seedWorkspace();

    const result = promoteStyleExample({
      styleId,
      assetId,
      note: "clean silhouette",
      stylesRoot,
      libraryRoot,
      now: () => "2026-08-01T12:00:00.000Z",
    });

    expect(result.exampleCount).toBe(1);
    const registry = readStyleExampleRegistry({ styleId, stylesRoot });
    expect(registry.style).toEqual({ id: styleId, version: "0.1.0" });
    expect(registry.examples[0]).toMatchObject({
      assetId,
      revisionId: "r001",
      note: "clean silhouette",
      promotedAt: "2026-08-01T12:00:00.000Z",
    });
    expect(registry.examples[0].sheetPath).toContain(
      `assets/${assetId}/revisions/r001/sheet.png`,
    );
    expect(
      validateStyleExampleRegistry({
        registry,
        label: "registry",
        libraryRoot,
      }),
    ).toEqual([]);
  });

  it("refuses assets without a user-approved revision", () => {
    const { libraryRoot, stylesRoot, assetId, styleId } = seedWorkspace({
      approved: false,
    });

    expect(() =>
      promoteStyleExample({
        styleId,
        assetId,
        note: "should fail",
        stylesRoot,
        libraryRoot,
      }),
    ).toThrow("requires explicit approval");
  });

  it("refuses promotion into a different style's registry", () => {
    const { libraryRoot, stylesRoot, assetId } = seedWorkspace();
    mkdirSync(join(stylesRoot, "other-style"), { recursive: true });
    writeJson(join(stylesRoot, "other-style", "style.json"), {
      kind: "style-profile",
      id: "other-style",
      version: "0.1.0",
    });

    expect(() =>
      promoteStyleExample({
        styleId: "other-style",
        assetId,
        note: "wrong style",
        stylesRoot,
        libraryRoot,
      }),
    ).toThrow("not other-style");
  });

  it("detects tampered sheets during registry validation and demotes cleanly", () => {
    const { libraryRoot, stylesRoot, assetId, styleId } = seedWorkspace();
    promoteStyleExample({
      styleId,
      assetId,
      note: "clean silhouette",
      stylesRoot,
      libraryRoot,
    });

    const sheetFile = join(
      libraryRoot,
      "assets",
      assetId,
      "revisions",
      "r001",
      "sheet.png",
    );
    writeFileSync(sheetFile, Buffer.from([9, 9, 9, 9]));
    const registry = readJson(
      join(stylesRoot, styleId, "examples.json"),
    );
    const failures = validateStyleExampleRegistry({
      registry,
      label: "registry",
      libraryRoot,
    });
    expect(
      failures.some((failure) => failure.includes("hash does not match")),
    ).toBe(true);

    const demoted = demoteStyleExample({ styleId, assetId, stylesRoot });
    expect(demoted.exampleCount).toBe(0);
    expect(() =>
      demoteStyleExample({ styleId, assetId, stylesRoot }),
    ).toThrow("not a promoted example");
  });
});
