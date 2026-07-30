import { resolve } from "node:path";
import { repositoryRoot } from "./lib/contracts.mjs";
import { validateSubmissionDirectory } from "./lib/submission.mjs";

const requestedDirectory = process.argv[2];
if (!requestedDirectory) {
  console.error(
    "Usage: npm.cmd run validate:submission -- workspace/staging/<job-id> [--require-completion]",
  );
  process.exit(1);
}

const requireCompletion = process.argv.includes("--require-completion");
const result = validateSubmissionDirectory({
  jobDirectory: resolve(repositoryRoot, requestedDirectory),
  requireCompletion,
  verifySource:
    requireCompletion || process.argv.includes("--verify-source"),
});

if (result.warnings.length > 0) {
  console.log("Submission warnings:");
  for (const warning of result.warnings) console.log(`- ${warning}`);
}

if (result.failures.length > 0) {
  console.error("Submission validation failed:");
  for (const failure of result.failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Submission validation passed: ${result.submission.jobId} (${result.computedStatus})`,
);
