import { join, resolve } from "node:path";
import { repositoryRoot } from "./lib/contracts.mjs";
import { readViewerLibrary } from "./lib/library-view.mjs";
import {
  readPromptinatorStore,
  reconcilePromptinatorWithLibrary,
} from "./lib/promptinator.mjs";

try {
  const workspaceRoot = resolve(repositoryRoot, "workspace");
  const library = readViewerLibrary(join(workspaceRoot, "library"));
  if (library.errors.length > 0) {
    throw new Error(
      [
        "Promptinator reconciliation refused while the Library has read errors:",
        ...library.errors.map((error) => `- ${error}`),
      ].join("\n"),
    );
  }
  const result = reconcilePromptinatorWithLibrary({
    workspaceRoot,
    libraryEntries: library.entries,
  });
  const store = readPromptinatorStore({ workspaceRoot });
  const count = (states) =>
    store.entries.filter((entry) => states.includes(entry.state)).length;
  console.log(
    `Promptinator reconciled ${result.reconciledCount} completed entr${result.reconciledCount === 1 ? "y" : "ies"} from immutable Library provenance.`,
  );
  console.log(
    `Ready: ${count(["ready"])}; In progress: ${count(["copied", "claimed"])}; Completed: ${count(["completed"])}; Total: ${store.entries.length}.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
