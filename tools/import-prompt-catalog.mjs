import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { repositoryRoot } from "./lib/contracts.mjs";
import {
  importPromptCatalog,
  readPromptinatorStore,
} from "./lib/promptinator.mjs";

const args = process.argv.slice(2);
const catalogPath = args[0];
const sourceNameIndex = args.indexOf("--source-name");
const sourceName =
  sourceNameIndex >= 0
    ? args[sourceNameIndex + 1]
    : catalogPath
      ? basename(catalogPath)
      : "";

if (!catalogPath || !sourceName) {
  console.error(
    "Usage: npm.cmd run promptinator:import -- <catalog.txt> [--source-name <label>]",
  );
  process.exitCode = 1;
} else {
  try {
    const workspaceRoot = resolve(repositoryRoot, "workspace");
    const current = readPromptinatorStore({ workspaceRoot });
    const result = importPromptCatalog({
      workspaceRoot,
      text: readFileSync(resolve(catalogPath), "utf8"),
      sourceName,
      expectedUpdatedAt: current.updatedAt,
    });
    console.log(
      result.alreadyImported
        ? `Promptinator source was already imported: ${sourceName}`
        : `Promptinator imported ${result.importedCount} entries from ${sourceName}.`,
    );
    const count = (states) =>
      result.store.entries.filter((entry) => states.includes(entry.state))
        .length;
    console.log(
      `Ready: ${count(["ready"])}; In progress: ${count(["copied", "claimed"])}; Completed: ${count(["completed"])}; Total: ${result.store.entries.length}.`,
    );
    console.log(`Source SHA-256: ${result.sourceSha256}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
