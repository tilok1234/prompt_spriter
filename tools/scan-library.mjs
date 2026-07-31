import { resolve } from "node:path";
import {
  createContractValidator,
  readJson,
  readStyleProfiles,
  repositoryRoot,
  validateLibraryRoot,
} from "./lib/contracts.mjs";

const requestedRoot = process.argv[2] ?? "fixtures/library";
const libraryRoot = resolve(repositoryRoot, requestedRoot);
const category = readJson(
  resolve(repositoryRoot, "categories/enemy-mob-32/category.json"),
);
const styles = readStyleProfiles();
const result = validateLibraryRoot({
  ajv: createContractValidator(),
  libraryRoot,
  category,
  styles,
});

if (result.failures.length > 0) {
  console.error(`Library scan failed: ${libraryRoot}`);
  for (const failure of result.failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Library scan passed: ${libraryRoot}`);
  console.log(`Assets: ${result.assets}`);
  console.log(`Revisions: ${result.revisions}`);
  console.log(
    `Views: Intake ${result.lanes.intake}, Denied ${result.lanes.denied}, Library ${result.lanes.library}, Archive ${result.lanes.archive}`,
  );
  console.log(`Advisory warnings: ${result.warnings.length}`);
}
