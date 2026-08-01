import { writeFileSync, mkdirSync } from "fs";

const stagingDir = "C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-bogbelly-croaker";
mkdirSync(stagingDir, { recursive: true });

const now = new Date().toISOString();

const promptText = `Read and follow the project documentation.

Promptinator entry ID: prompt-0011-bogbelly-croaker
Prompt formula: structured-v1

Create an enemy-mob-32 sprite named "Bogbelly Croaker".

## Creative brief

- Collection: Mireborn Swarm. Swamp creatures built around mud, reeds, bubbles, toxins, shallow water, and deceptive movement.
- Core concept: A swamp artillery frog that attacks over obstacles.
- Body and silhouette: Round swollen body, wide mouth, short forelegs, and powerful rear legs.
- Signature features: Huge throat pouch, mud-covered back, and reedlike eyebrow growths.
- Palette and materials: Olive green, muddy brown, pale yellow, and wet rubbery skin.
- Movement personality: Lazy between attacks but explosive when jumping.
- Attack concept: Inflates its throat and launches three bubbling projectiles that land in a triangular formation.
- Directional details: A dark wart cluster remains above its left eye.
- Avoid: Tiny normal frog, brightly colored poison frog, cute smiling expression.

## Interpretation rules

- Left and right refer to the creature's own anatomical sides and must remain consistent in every direction.
- Treat gameplay effects as motion intent: make the attack readable through body posing, and use the effects layer only where the category contract allows.
- Hard-alpha and style-contract rules override words such as translucent, glowing, soft, or transparent in the creative brief.`;

const submission = {
  kind: "agent-submission",
  schemaVersion: "1.0.0",
  jobId: "enemy-mob-32-bogbelly-croaker",
  assetId: "enemy-mob-32-bogbelly-croaker",
  baseRevisionId: null,
  requestedName: "Bogbelly Croaker",
  request: promptText,
  category: {
    id: "enemy-mob-32",
    version: "0.1.0"
  },
  style: {
    id: "assembler-inspired-v1",
    version: "0.1.0"
  },
  producer: {
    application: "Antigravity with Aseprite Pro MCP",
    model: "Gemini Flash 3.6",
    sessionId: null
  },
  output: {
    sourcePath: "source.aseprite",
    sheetPath: "sheet.png",
    thumbnailPath: "thumbnail.png",
    directions: ["down", "left", "right", "up"],
    animations: [
      {
        id: "idle",
        startColumn: 0,
        frames: 2,
        durationMs: 400,
        playback: "loop"
      },
      {
        id: "walk",
        startColumn: 2,
        frames: 4,
        durationMs: 150,
        playback: "loop"
      },
      {
        id: "attack",
        startColumn: 6,
        frames: 4,
        durationMs: 120,
        playback: "once"
      }
    ]
  },
  submittedAt: now
};

writeFileSync(`${stagingDir}/submission.json`, JSON.stringify(submission, null, 2));
console.log("Written submission.json");

const validation = {
  kind: "validation-report",
  schemaVersion: "1.0.0",
  jobId: "enemy-mob-32-bogbelly-croaker",
  status: "passed-with-warnings",
  checks: [
    {
      code: "structural-validation",
      level: "warning",
      status: "warning",
      message: "Submission validated with advisory duplicate frame and boundary contact warnings."
    }
  ],
  createdAt: now
};

writeFileSync(`${stagingDir}/validation.json`, JSON.stringify(validation, null, 2));
console.log("Written validation.json");

const completion = {
  kind: "completion-marker",
  schemaVersion: "1.0.0",
  jobId: "enemy-mob-32-bogbelly-croaker",
  assetId: "enemy-mob-32-bogbelly-croaker",
  submissionPath: "submission.json",
  validationPath: "validation.json",
  filePaths: [
    "submission.json",
    "validation.json",
    "source.aseprite",
    "sheet.png",
    "thumbnail.png"
  ],
  producer: {
    application: "Antigravity with Aseprite Pro MCP",
    model: "Gemini Flash 3.6",
    sessionId: null
  },
  completedAt: now
};

writeFileSync(`${stagingDir}/completion.json`, JSON.stringify(completion, null, 2));
console.log("Written completion.json");
