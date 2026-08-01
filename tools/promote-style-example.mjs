import {
  demoteStyleExample,
  promoteStyleExample,
} from "./lib/style-examples.mjs";

const args = process.argv.slice(2);
const demote = args.includes("--demote");
const styleIndex = args.indexOf("--style");
const noteIndex = args.indexOf("--note");
const styleId = styleIndex >= 0 ? args[styleIndex + 1] : "assembler-inspired-v2";
const note = noteIndex >= 0 ? args[noteIndex + 1] : null;
const consumed = new Set(["--demote"]);
if (styleIndex >= 0) {
  consumed.add("--style");
  consumed.add(styleId);
}
if (noteIndex >= 0) {
  consumed.add("--note");
  consumed.add(note);
}
const positional = args.filter((value) => !consumed.has(value));
const assetId = positional[0];

if (!assetId || positional.length !== 1 || (!demote && !note)) {
  console.error(
    [
      "Usage:",
      '  npm run style:promote-example -- <assetId> --note "why this sheet is exemplary" [--style <styleId>]',
      "  npm run style:promote-example -- <assetId> --demote [--style <styleId>]",
      "",
      "Promotion uses the asset's user-approved revision; it refuses unapproved",
      "assets, style mismatches, and hash mismatches. The registry lives at",
      "styles/<styleId>/examples.json and never modifies style.json.",
    ].join("\n"),
  );
  process.exitCode = 1;
} else {
  try {
    if (demote) {
      const result = demoteStyleExample({ styleId, assetId });
      console.log(`Demoted ${assetId} from ${result.registryPath}.`);
      console.log(`Promoted examples remaining: ${result.exampleCount}`);
    } else {
      const result = promoteStyleExample({ styleId, assetId, note });
      console.log(`Promoted ${assetId} ${result.entry.revisionId} as a ${styleId} example.`);
      console.log(`Registry: ${result.registryPath}`);
      console.log(`Sheet: ${result.entry.sheetPath}`);
      console.log(`Promoted examples: ${result.exampleCount}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
