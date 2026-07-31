import { join, resolve } from "node:path";
import { repositoryRoot } from "./lib/contracts.mjs";
import { readViewerLibrary } from "./lib/library-view.mjs";
import { claimNextPromptinatorEntry } from "./lib/promptinator.mjs";

const args = process.argv.slice(2);
const claimantIndex = args.indexOf("--claimant");
const claimant =
  claimantIndex >= 0 ? args[claimantIndex + 1] : "Antigravity";
const supportedArgs = new Set(
  claimantIndex >= 0 ? ["--claimant", claimant] : [],
);
if (!claimant || args.some((value) => !supportedArgs.has(value))) {
  console.error(
    "Usage: npm.cmd run promptinator:claim-next -- [--claimant <label>]",
  );
  process.exitCode = 1;
} else {
  try {
    const workspaceRoot = resolve(repositoryRoot, "workspace");
    const library = readViewerLibrary(join(workspaceRoot, "library"));
    if (library.errors.length > 0) {
      throw new Error(
        [
          "Promptinator refused to claim while the Library has read errors:",
          ...library.errors.map((error) => `- ${error}`),
        ].join("\n"),
      );
    }
    const result = claimNextPromptinatorEntry({
      workspaceRoot,
      libraryEntries: library.entries,
      claimant,
    });
    console.log("Promptinator next-entry claim created.");
    console.log(`Entry: ${result.entry.id}`);
    console.log(`Ordinal: ${result.entry.ordinal}`);
    console.log(`Name: ${result.entry.name}`);
    console.log(
      `Style: ${result.entry.style.id}@${result.entry.style.version}`,
    );
    console.log(
      `Dispatch source: ${result.testBatch ? `active v2 test batch ${result.testBatch.id}` : "normal Ready queue"}`,
    );
    console.log(`Claim: ${result.claim.id}`);
    console.log(`Expected asset ID: ${result.claim.expectedAssetId}`);
    console.log(
      `Existing Library completions reconciled: ${result.reconciledCount}`,
    );
    console.log("");
    console.log("Use the exact prompt below as submission.json request.");
    console.log("--- PROMPTINATOR PROMPT START ---");
    console.log(result.entry.promptText);
    console.log("--- PROMPTINATOR PROMPT END ---");
    console.log("");
    console.log(
      "After completion-required validation, run the documented trusted ingestion command. Successful Intake ingestion completes this claim automatically.",
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
