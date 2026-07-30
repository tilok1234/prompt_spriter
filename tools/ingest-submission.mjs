import { resolve } from "node:path";
import { ingestSubmission } from "./lib/ingestion.mjs";
import { repositoryRoot } from "./lib/contracts.mjs";

const requestedDirectory = process.argv[2];
if (!requestedDirectory) {
  console.error(
    "Usage: npm.cmd run ingest:submission -- workspace/staging/<job-id>",
  );
  process.exit(1);
}

try {
  const result = ingestSubmission({
    jobDirectory: resolve(repositoryRoot, requestedDirectory),
  });
  console.log(
    `Ingested ${result.assetId}/${result.revisionId} into Intake from ${result.jobId}.`,
  );
  console.log(`Immutable asset: ${result.assetDirectory}`);
  console.log(`Transaction receipt: ${result.transactionReceipt}`);
  console.log(`Advisory warnings retained: ${result.warnings.length}`);
} catch (error) {
  console.error(
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}
