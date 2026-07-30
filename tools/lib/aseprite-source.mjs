import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

const defaultAsepritePath = "C:\\Program Files\\Aseprite\\Aseprite.exe";

const compareSheets = (expectedPath, actualPath, cellWidth, cellHeight) => {
  const expected = PNG.sync.read(readFileSync(expectedPath));
  const actual = PNG.sync.read(readFileSync(actualPath));
  if (expected.width !== actual.width || expected.height !== actual.height) {
    return {
      failure: `source re-export is ${actual.width}x${actual.height}; staged sheet is ${expected.width}x${expected.height}`,
      mismatchedCells: [],
    };
  }

  const mismatchedCells = [];
  const columns = expected.width / cellWidth;
  const rows = expected.height / cellHeight;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let differingPixels = 0;
      for (let y = 0; y < cellHeight; y += 1) {
        for (let x = 0; x < cellWidth; x += 1) {
          const pixelX = column * cellWidth + x;
          const pixelY = row * cellHeight + y;
          const index = (expected.width * pixelY + pixelX) * 4;
          if (
            expected.data[index] !== actual.data[index] ||
            expected.data[index + 1] !== actual.data[index + 1] ||
            expected.data[index + 2] !== actual.data[index + 2] ||
            expected.data[index + 3] !== actual.data[index + 3]
          ) {
            differingPixels += 1;
          }
        }
      }
      if (differingPixels > 0) {
        mismatchedCells.push({
          row: row + 1,
          column: column + 1,
          differingPixels,
        });
      }
    }
  }

  return {
    failure:
      mismatchedCells.length > 0
        ? `saved Aseprite source does not reproduce ${mismatchedCells.length} staged sheet cells`
        : null,
    mismatchedCells,
  };
};

export const verifyAsepriteSource = ({
  sourcePath,
  sheetPath,
  submission,
  category,
  outputDirectory,
  asepritePath = process.env.ASEPRITE_PATH ?? defaultAsepritePath,
}) => {
  const failures = [];
  const warnings = [];
  if (!existsSync(asepritePath)) {
    return {
      failures: [`Aseprite executable was not found: ${asepritePath}`],
      warnings,
      evidence: null,
    };
  }

  mkdirSync(outputDirectory, { recursive: true });
  const exportedSheetPath = join(outputDirectory, "source-sheet.png");
  const exportedDataPath = join(outputDirectory, "source-data.json");
  const columns = submission.output.animations.reduce(
    (total, animation) => total + animation.frames,
    0,
  );
  const exportResult = spawnSync(
    asepritePath,
    [
      "--batch",
      "--noinapp",
      sourcePath,
      "--sheet",
      exportedSheetPath,
      "--data",
      exportedDataPath,
      "--format",
      "json-array",
      "--sheet-type",
      "rows",
      "--sheet-columns",
      String(columns),
    ],
    {
      encoding: "utf8",
      timeout: 30000,
      windowsHide: true,
    },
  );
  if (exportResult.error || exportResult.status !== 0) {
    failures.push(
      `Aseprite source export failed: ${
        exportResult.error?.message ??
        exportResult.stderr?.trim() ??
        `exit ${String(exportResult.status)}`
      }`,
    );
    return {
      failures,
      warnings,
      evidence: {
        exportedSheetPath,
        exportedDataPath,
      },
    };
  }

  let sourceData;
  try {
    sourceData = JSON.parse(readFileSync(exportedDataPath, "utf8"));
  } catch (error) {
    failures.push(
      `Aseprite source data could not be read: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      failures,
      warnings,
      evidence: {
        exportedSheetPath,
        exportedDataPath,
      },
    };
  }

  const expectedDurations = [];
  for (const _direction of submission.output.directions) {
    for (const animation of submission.output.animations) {
      expectedDurations.push(
        ...Array.from(
          {
            length: animation.frames,
          },
          () => animation.durationMs,
        ),
      );
    }
  }
  const sourceFrames = Array.isArray(sourceData.frames)
    ? sourceData.frames
    : Object.values(sourceData.frames ?? {});
  if (sourceFrames.length !== expectedDurations.length) {
    failures.push(
      `Aseprite source has ${sourceFrames.length} frames; expected ${expectedDurations.length}`,
    );
  } else {
    const durationMismatches = sourceFrames
      .map((frame, index) => ({
        frame: index + 1,
        actual: frame.duration,
        expected: expectedDurations[index],
      }))
      .filter((entry) => entry.actual !== entry.expected);
    if (durationMismatches.length > 0) {
      failures.push(
        `Aseprite source has ${durationMismatches.length} frame-duration mismatches`,
      );
    }
  }

  const parity = compareSheets(
    sheetPath,
    exportedSheetPath,
    category.frame.width,
    category.frame.height,
  );
  if (parity.failure) {
    const detail = parity.mismatchedCells
      .map(
        (cell) =>
          `r${cell.row}c${cell.column} (${cell.differingPixels} pixels)`,
      )
      .join(", ");
    failures.push(`${parity.failure}${detail ? `: ${detail}` : ""}`);
  }

  const inventoryResult = spawnSync(
    asepritePath,
    [
      "--batch",
      "--noinapp",
      "--list-layers",
      "--list-tags",
      sourcePath,
    ],
    {
      encoding: "utf8",
      timeout: 30000,
      windowsHide: true,
    },
  );
  const inventory = `${inventoryResult.stdout ?? ""}\n${inventoryResult.stderr ?? ""}`;
  for (const layer of category.source.requiredLayers) {
    if (!inventory.split(/\r?\n/).includes(layer)) {
      failures.push(`Aseprite source is missing required layer: ${layer}`);
    }
  }
  for (const direction of submission.output.directions) {
    for (const animation of submission.output.animations) {
      const tag = `${direction}_${animation.id}`;
      if (!inventory.split(/\r?\n/).includes(tag)) {
        failures.push(`Aseprite source is missing required tag: ${tag}`);
      }
    }
  }

  return {
    failures,
    warnings,
    evidence: {
      exportedSheetPath,
      exportedDataPath,
      mismatchedCells: parity.mismatchedCells,
    },
  };
};
