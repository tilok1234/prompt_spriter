import { join } from "node:path";
import {
  createContractValidator,
  readJson,
  repositoryRoot,
  validateCategorySemantics,
  validateLibraryRoot,
  validateRecord,
  validateStyleSemantics,
} from "./lib/contracts.mjs";

const categoryPath = join(
  repositoryRoot,
  "categories",
  "enemy-mob-32",
  "category.json",
);
const stylePath = join(
  repositoryRoot,
  "styles",
  "assembler-inspired-v1",
  "style.json",
);
const fixtureRoot = join(repositoryRoot, "fixtures", "library");

const category = readJson(categoryPath);
const style = readJson(stylePath);
const ajv = createContractValidator();
const failures = [
  ...validateRecord(ajv, category, categoryPath),
  ...validateCategorySemantics(category, categoryPath),
  ...validateRecord(ajv, style, stylePath),
  ...validateStyleSemantics(style, stylePath),
];

const library = validateLibraryRoot({
  ajv,
  libraryRoot: fixtureRoot,
  category,
  style,
});
failures.push(...library.failures);

if (failures.length > 0) {
  console.error("Prompt Spriter contract validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Prompt Spriter contracts passed (${library.assets} fixture asset, ${library.revisions} revision).`,
  );
  if (library.warnings.length > 0) {
    console.log(`Advisory fixture warnings: ${library.warnings.length}`);
  }
}

