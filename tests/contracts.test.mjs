import {
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import {
  createContractValidator,
  inspectSpriteSheet,
  readJson,
  validateLibraryRoot,
} from "../tools/lib/contracts.mjs";

const temporaryRoots = [];
const qualityValidation = {
  minOpaquePixelsPerFrame: 32,
  minOccupiedWidth: 6,
  minOccupiedHeight: 6,
  minVisibleColorsPerFrame: 2,
  minimumDistinctFramesPerDirection: {
    idle: 2,
    walk: 3,
    attack: 3,
  },
};
const qualityRevision = {
  sheet: {
    cellWidth: 8,
    cellHeight: 8,
    columns: 10,
    rows: 1,
    width: 80,
    height: 8,
  },
  directions: ["down"],
  animations: [
    { id: "idle", startColumn: 0, frames: 2 },
    { id: "walk", startColumn: 2, frames: 4 },
    { id: "attack", startColumn: 6, frames: 4 },
  ],
  validation: qualityValidation,
};

const writeQualitySheet = (path, { weak }) => {
  const png = new PNG({ width: 80, height: 8, colorType: 6 });
  for (let column = 0; column < 10; column += 1) {
    const size = weak ? 5 : 6;
    for (let y = 1; y <= size; y += 1) {
      for (let x = 1; x <= size; x += 1) {
        const index = (png.width * y + column * 8 + x) * 4;
        const variantX = 1 + (column % 3);
        const accent = !weak && y === 1 && x === variantX;
        png.data[index] = accent ? 40 : 180;
        png.data[index + 1] = accent ? 160 : 70;
        png.data[index + 2] = accent ? 220 : 50;
        png.data[index + 3] = 255;
      }
    }
  }
  writeFileSync(path, PNG.sync.write(png));
};

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("sprite sheet contract inspection", () => {
  it("reports opaque cell-edge contact as a one-based advisory", () => {
    const root = mkdtempSync(join(tmpdir(), "prompt-spriter-contract-"));
    temporaryRoots.push(root);
    const path = join(root, "boundary.png");
    const png = new PNG({
      width: 2,
      height: 2,
      colorType: 6,
    });
    png.data[0] = 255;
    png.data[3] = 255;
    writeFileSync(path, PNG.sync.write(png));

    const result = inspectSpriteSheet(path, {
      sheet: {
        cellWidth: 2,
        cellHeight: 2,
        columns: 1,
        rows: 1,
        width: 2,
        height: 2,
      },
    });

    expect(result.failures).toEqual([]);
    expect(result.warnings).toContain(
      `${path}: frame row 1, column 1 has 1 opaque boundary pixel`,
    );
  });

  it("accepts the enemy-mob-32 frame-quality minimums", () => {
    const root = mkdtempSync(join(tmpdir(), "prompt-spriter-contract-"));
    temporaryRoots.push(root);
    const path = join(root, "quality-pass.png");
    writeQualitySheet(path, { weak: false });

    const result = inspectSpriteSheet(path, qualityRevision);

    expect(result.failures).toEqual([]);
  });

  it("rejects sparse, tiny, monochrome, and repetitive creature frames", () => {
    const root = mkdtempSync(join(tmpdir(), "prompt-spriter-contract-"));
    temporaryRoots.push(root);
    const path = join(root, "quality-fail.png");
    writeQualitySheet(path, { weak: true });

    const result = inspectSpriteSheet(path, qualityRevision);

    expect(result.failures).toContain(
      `${path}: down idle frame 1 has 25 opaque pixels; minimum is 32`,
    );
    expect(result.failures).toContain(
      `${path}: down idle frame 1 occupies 5x5; minimum is 6x6`,
    );
    expect(result.failures).toContain(
      `${path}: down idle frame 1 uses 1 visible opaque color; minimum is 2`,
    );
    expect(result.failures).toContain(
      `${path}: down idle has 1 distinct frame; minimum is 2`,
    );
    expect(result.failures).toContain(
      `${path}: down walk has 1 distinct frame; minimum is 3`,
    );
    expect(result.failures).toContain(
      `${path}: down attack has 1 distinct frame; minimum is 3`,
    );
  });
});

describe("library quality scan scope", () => {
  it("can preserve integrity checks without reapplying current quality floors", () => {
    const repositoryRoot = resolve(import.meta.dirname, "..");
    const category = readJson(
      join(repositoryRoot, "categories", "enemy-mob-32", "category.json"),
    );
    const style = readJson(
      join(
        repositoryRoot,
        "styles",
        "assembler-inspired-v1",
        "style.json",
      ),
    );
    const impossibleQuality = {
      ...category,
      validation: {
        ...category.validation,
        minOpaquePixelsPerFrame: 999,
      },
    };
    const input = {
      ajv: createContractValidator(),
      libraryRoot: join(repositoryRoot, "fixtures", "library"),
      category: impossibleQuality,
      styles: [style],
    };

    expect(
      validateLibraryRoot(input).failures.some((failure) =>
        failure.includes("minimum is 999"),
      ),
    ).toBe(true);
    expect(
      validateLibraryRoot({ ...input, enforceQuality: false }).failures,
    ).toEqual([]);
  });
});
