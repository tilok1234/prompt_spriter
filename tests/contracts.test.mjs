import {
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import { inspectSpriteSheet } from "../tools/lib/contracts.mjs";

const temporaryRoots = [];

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
});
