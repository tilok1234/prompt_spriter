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
import {
  readStyleExampleRegistry,
  validateStyleExampleRegistry,
} from "./lib/style-examples.mjs";

const categoryPath = join(
  repositoryRoot,
  "categories",
  "enemy-mob-32",
  "category.json",
);
const stylePaths = [
  join(repositoryRoot, "styles", "assembler-inspired-v1", "style.json"),
  join(repositoryRoot, "styles", "assembler-inspired-v2", "style.json"),
];
const fixtureRoot = join(repositoryRoot, "fixtures", "library");

const category = readJson(categoryPath);
const styles = stylePaths.map((stylePath) => ({
  path: stylePath,
  value: readJson(stylePath),
}));
const fixtureStyle = styles[0].value;
const ajv = createContractValidator();
const failures = [
  ...validateRecord(ajv, category, categoryPath),
  ...validateCategorySemantics(category, categoryPath),
  ...styles.flatMap(({ path, value }) => [
    ...validateRecord(ajv, value, path),
    ...validateStyleSemantics(value, path),
  ]),
];

for (const { value } of styles) {
  const registry = readStyleExampleRegistry({ styleId: value.id });
  if (!registry) continue;
  failures.push(
    ...validateStyleExampleRegistry({
      registry,
      label: join(repositoryRoot, "styles", value.id, "examples.json"),
      ajv,
    }),
  );
}

const library = validateLibraryRoot({
  ajv,
  libraryRoot: fixtureRoot,
  category,
  style: fixtureStyle,
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
