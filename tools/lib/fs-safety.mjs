import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";

const retryableRenameCodes = new Set(["EACCES", "EBUSY", "EPERM"]);

const wait = (milliseconds) => {
  Atomics.wait(
    new Int32Array(new SharedArrayBuffer(4)),
    0,
    0,
    milliseconds,
  );
};

export const renameWithRetry = (source, destination) => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      renameSync(source, destination);
      return;
    } catch (error) {
      if (
        attempt === 5 ||
        !retryableRenameCodes.has(error?.code)
      ) {
        throw error;
      }
      wait(25 * (attempt + 1));
    }
  }
};

export const writeJson = (path, value) => {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

export const writeJsonAtomically = (path, value) => {
  const temporaryPath = `${path}.tmp-${randomUUID()}`;
  try {
    writeFileSync(
      temporaryPath,
      `${JSON.stringify(value, null, 2)}\n`,
      {
        encoding: "utf8",
        flag: "wx",
      },
    );
    renameWithRetry(temporaryPath, path);
  } catch (error) {
    if (existsSync(temporaryPath)) {
      unlinkSync(temporaryPath);
    }
    throw error;
  }
};

export const sha256 = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");
