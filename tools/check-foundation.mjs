import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const toolsDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = dirname(toolsDirectory);
const failures = [];

const requiredFiles = [
  ".gitignore",
  "AGENTS.md",
  "HANDOFF.md",
  "README.md",
  "docs/ANTIGRAVITY_WORKFLOW.md",
  "docs/ASEPRITE_CAPABILITIES.md",
  "docs/ASEPRITE_CONTRACT.md",
  "docs/BOUNDARIES.md",
  "docs/DEVELOPMENT.md",
  "docs/MASTER_PLAN.md",
  "docs/PROMPTINATOR.md",
  "docs/STATUS.md",
  "docs/WORKFLOW.md",
  "categories/README.md",
  "schemas/README.md",
  "styles/README.md",
  "tests/README.md",
  "jobs/templates/enemy-mob-32-first-slice.md",
  "tools/claim-next-prompt.mjs",
  "tools/reconcile-promptinator.mjs",
];

for (const relativePath of requiredFiles) {
  if (!existsSync(join(repositoryRoot, relativePath))) {
    failures.push(`Missing required file: ${relativePath}`);
  }
}

const forbiddenRootPaths = [".mcp.json", "project.godot"];

for (const relativePath of forbiddenRootPaths) {
  if (existsSync(join(repositoryRoot, relativePath))) {
    failures.push(`Protected root path must not exist: ${relativePath}`);
  }
}

const requiredText = new Map([
  [
    "AGENTS.md",
    [
      "Automated checks are validation, never visual approval.",
      "Only a Denied candidate may",
      "Do not create or change `.mcp.json`",
    ],
  ],
  [
    "docs/WORKFLOW.md",
    [
      "Unresolved notes are the approval safeguard",
      "Archive is available only from Denied.",
      "Game-ready export defaults to the exact approved revision",
    ],
  ],
  [
    "docs/BOUNDARIES.md",
    [
      "existing shared MCP setup",
      "8-bit sprite assembler",
      "No Godot dependency",
    ],
  ],
  [
    ".gitignore",
    ["workspace/", "node_modules/", "src-tauri/target/"],
  ],
]);

for (const [relativePath, snippets] of requiredText) {
  const absolutePath = join(repositoryRoot, relativePath);
  if (!existsSync(absolutePath)) {
    continue;
  }

  const contents = readFileSync(absolutePath, "utf8");
  for (const snippet of snippets) {
    if (!contents.includes(snippet)) {
      failures.push(`${relativePath} is missing required text: ${snippet}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Prompt Spriter foundation check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Prompt Spriter foundation check passed (${requiredFiles.length} required files, ${forbiddenRootPaths.length} protected paths).`,
  );
}
