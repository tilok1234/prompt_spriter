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

const motionValidation = {
  ...qualityValidation,
  anatomyMotion: {
    translationOnly: "warning",
    alignmentShiftPx: 2,
    minIdleResidualPixels: 6,
    minWalkResidualPixels: 15,
    minWalkFramesMeetingResidual: 2,
  },
  groundContact: {
    unstableContact: "warning",
    groundedMinBottomRow: 6,
    minWalkFramesOnBaselineRow: 2,
  },
};
const motionRevision = { ...qualityRevision, validation: motionValidation };

const drawCreature = (png, column, { offsetY = 1, accents = [] }) => {
  const accentKeys = new Set(accents.map(([bx, by]) => `${bx},${by}`));
  for (let by = 0; by < 6; by += 1) {
    for (let bx = 0; bx < 6; bx += 1) {
      const index = (png.width * (offsetY + by) + column * 8 + 1 + bx) * 4;
      const accent = accentKeys.has(`${bx},${by}`);
      png.data[index] = accent ? 40 : 180;
      png.data[index + 1] = accent ? 160 : 70;
      png.data[index + 2] = accent ? 220 : 50;
      png.data[index + 3] = 255;
    }
  }
};

const writeMotionSheet = (path, cells) => {
  const png = new PNG({ width: 80, height: 8, colorType: 6 });
  cells.forEach((cell, column) => drawCreature(png, column, cell));
  writeFileSync(path, PNG.sync.write(png));
};

const fullRows = (rows) =>
  rows.flatMap((by) => [0, 1, 2, 3, 4, 5].map((bx) => [bx, by]));

describe("anatomy motion and ground contact advisories", () => {
  it("flags translation-only idle, sliding walk, and bobbing ground contact", () => {
    const root = mkdtempSync(join(tmpdir(), "prompt-spriter-contract-"));
    temporaryRoots.push(root);
    const path = join(root, "translation-bob.png");
    writeMotionSheet(path, [
      { offsetY: 1, accents: [[1, 0]] },
      { offsetY: 2, accents: [[1, 0]] },
      { offsetY: 1, accents: [[2, 1]] },
      { offsetY: 2, accents: [[3, 1]] },
      { offsetY: 1, accents: [[4, 1]] },
      { offsetY: 2, accents: [[5, 1]] },
      { offsetY: 1, accents: [[0, 2]] },
      { offsetY: 1, accents: [[1, 2]] },
      { offsetY: 1, accents: [[2, 2]] },
      { offsetY: 1, accents: [[3, 2]] },
    ]);

    const result = inspectSpriteSheet(path, motionRevision);

    expect(result.failures).toEqual([]);
    expect(result.warnings).toContain(
      `${path}: down idle changes 0 pixels beyond its best +/-2px translation; minimum is 6`,
    );
    expect(result.warnings).toContain(
      `${path}: down walk has 0 frames moving at least 15 pixels beyond the translated idle pose; minimum is 2`,
    );
    expect(result.warnings).toContain(
      `${path}: down idle bottom contact moves from pixel row 6 to 7; ground contact must stay fixed`,
    );
  });

  it("accepts anatomy-level motion with stable ground contact", () => {
    const root = mkdtempSync(join(tmpdir(), "prompt-spriter-contract-"));
    temporaryRoots.push(root);
    const path = join(root, "anatomy-motion.png");
    writeMotionSheet(path, [
      { offsetY: 1, accents: [[1, 0]] },
      {
        offsetY: 1,
        accents: [[1, 0], [2, 2], [3, 2], [2, 3], [3, 3], [2, 4], [3, 4]],
      },
      {
        offsetY: 1,
        accents: [[1, 0], ...fullRows([3, 4]), [2, 2], [3, 2], [2, 5], [3, 5]],
      },
      { offsetY: 1, accents: [[2, 0]] },
      {
        offsetY: 1,
        accents: [[1, 0], ...fullRows([2, 5]), [0, 3], [5, 3], [0, 4], [5, 4]],
      },
      { offsetY: 1, accents: [[3, 0]] },
      { offsetY: 1, accents: [[0, 2]] },
      { offsetY: 1, accents: [[1, 2]] },
      { offsetY: 1, accents: [[2, 2]] },
      { offsetY: 1, accents: [[3, 2]] },
    ]);

    const result = inspectSpriteSheet(path, motionRevision);

    expect(result.failures).toEqual([]);
    expect(
      result.warnings.filter(
        (warning) =>
          warning.includes("translat") || warning.includes("ground"),
      ),
    ).toEqual([]);
  });

  it("skips ground-contact checks for hovering silhouettes but still requires anatomy motion", () => {
    const root = mkdtempSync(join(tmpdir(), "prompt-spriter-contract-"));
    temporaryRoots.push(root);
    const path = join(root, "hovering.png");
    writeMotionSheet(path, [
      { offsetY: 0, accents: [[1, 0]] },
      { offsetY: 1, accents: [[1, 0]] },
      { offsetY: 0, accents: [[2, 1]] },
      { offsetY: 1, accents: [[3, 1]] },
      { offsetY: 0, accents: [[4, 1]] },
      { offsetY: 1, accents: [[5, 1]] },
      { offsetY: 0, accents: [[0, 2]] },
      { offsetY: 0, accents: [[1, 2]] },
      { offsetY: 0, accents: [[2, 2]] },
      { offsetY: 0, accents: [[3, 2]] },
    ]);

    const result = inspectSpriteSheet(path, motionRevision);

    expect(result.failures).toEqual([]);
    expect(result.warnings).toContain(
      `${path}: down idle changes 0 pixels beyond its best +/-2px translation; minimum is 6`,
    );
    expect(
      result.warnings.filter((warning) => warning.includes("ground")),
    ).toEqual([]);
  });
});

const attackRevision = {
  sheet: {
    cellWidth: 16,
    cellHeight: 16,
    columns: 10,
    rows: 1,
    width: 160,
    height: 16,
  },
  directions: ["down"],
  animations: [
    { id: "idle", startColumn: 0, frames: 2 },
    { id: "walk", startColumn: 2, frames: 4 },
    { id: "attack", startColumn: 6, frames: 4 },
  ],
  validation: {
    attackReadability: {
      effectsOnly: "warning",
      misaimedEffects: "warning",
      effectsEdgeContact: "warning",
      alignmentShiftPx: 2,
      minBodyResidualPixels: 12,
      minAttackFramesMeetingResidual: 2,
      maxEffectsAngleFromFacingDeg: 60,
      minEffectsTravelPx: 2,
      minEffectsEdgeMarginPx: 2,
    },
  },
};

const writeAttackSheet = (path, cells) => {
  const png = new PNG({ width: 160, height: 16, colorType: 6 });
  const paint = (index, accent) => {
    png.data[index] = accent ? 40 : 180;
    png.data[index + 1] = accent ? 160 : 70;
    png.data[index + 2] = accent ? 220 : 50;
    png.data[index + 3] = 255;
  };
  cells.forEach(({ recolorRows = [], extras = [] }, column) => {
    for (let by = 0; by < 6; by += 1) {
      for (let bx = 0; bx < 6; bx += 1) {
        paint(
          (png.width * (6 + by) + column * 16 + 2 + bx) * 4,
          recolorRows.includes(by),
        );
      }
    }
    for (const [x, y] of extras) {
      paint((png.width * y + column * 16 + x) * 4, true);
    }
  });
  writeFileSync(path, PNG.sync.write(png));
};

describe("attack readability advisories", () => {
  it("flags effects-only attacks, misaimed trajectories, and edge-hugging effects", () => {
    const root = mkdtempSync(join(tmpdir(), "prompt-spriter-contract-"));
    temporaryRoots.push(root);
    const path = join(root, "misaimed-attack.png");
    writeAttackSheet(path, [
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      { extras: [[13, 10], [14, 10]] },
      { extras: [[13, 7], [14, 7]] },
      { extras: [[13, 4], [14, 4]] },
    ]);

    const result = inspectSpriteSheet(path, attackRevision);

    expect(result.failures).toEqual([]);
    expect(result.warnings).toContain(
      `${path}: down attack has 0 frames with body motion of at least 12 pixels beyond the idle pose; minimum is 2`,
    );
    expect(result.warnings).toContain(
      `${path}: down attack effects end at (9, -4) relative to the body, outside 60 degrees of the down facing`,
    );
    expect(result.warnings).toContain(
      `${path}: down attack effects come closer than 2px to the cell edge`,
    );
  });

  it("accepts body-readable attacks with facing-aligned effects and persistent satellites", () => {
    const root = mkdtempSync(join(tmpdir(), "prompt-spriter-contract-"));
    temporaryRoots.push(root);
    const path = join(root, "aimed-attack.png");
    const satellite = [[2, 2], [3, 2]];
    writeAttackSheet(path, [
      { extras: satellite },
      { extras: satellite },
      { extras: satellite },
      { extras: satellite },
      { extras: satellite },
      { extras: satellite },
      { recolorRows: [0, 1], extras: [...satellite, [11, 4]] },
      { recolorRows: [2, 3], extras: [...satellite, [11, 8]] },
      { extras: [...satellite, [5, 13]] },
      { extras: satellite },
    ]);

    const result = inspectSpriteSheet(path, attackRevision);

    expect(result.failures).toEqual([]);
    expect(
      result.warnings.filter(
        (warning) =>
          warning.includes("attack effects") || warning.includes("body motion"),
      ),
    ).toEqual([]);
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
