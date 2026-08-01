import { writeFileSync, mkdirSync } from "fs";

const stagingDir = "C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-marshjaw-snapper";
mkdirSync(stagingDir, { recursive: true });

const promptText = `Read and follow the project documentation.

Promptinator entry ID: prompt-0019-marshjaw-snapper
Prompt formula: structured-v1

Create an enemy-mob-32 sprite named "Marshjaw Snapper".

## Creative brief

- Collection: Mireborn Swarm. Swamp creatures built around mud, reeds, bubbles, toxins, shallow water, and deceptive movement.
- Core concept: A crocodilian charger that divides the battlefield with a muddy wake.
- Body and silhouette: Long armored body, huge flat head, low legs, and thick tail.
- Signature features: Reed-covered back, broad jaws, and chipped dorsal plates.
- Palette and materials: Dark olive, mud brown, pale teeth, and rugged scales.
- Movement personality: Patient at first, then brutally direct.
- Attack concept: Rushes forward with open jaws and leaves two lines of mud droplets spreading behind it.
- Directional details: A missing plate near the right shoulder exposes a pale patch.
- Avoid: Realistic full-size crocodile, upright humanoid posture, invisible water movement.

## Interpretation rules

- Left and right refer to the creature's own anatomical sides and must remain consistent in every direction.
- Treat gameplay effects as motion intent: make the attack readable through body posing, and use the effects layer only where the category contract allows.
- Hard-alpha and style-contract rules override words such as translucent, glowing, soft, or transparent in the creative brief.`;

const submission = {
  kind: "agent-submission",
  schemaVersion: "1.0.0",
  jobId: "enemy-mob-32-marshjaw-snapper",
  assetId: "enemy-mob-32-marshjaw-snapper",
  baseRevisionId: null,
  requestedName: "Marshjaw Snapper",
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
  submittedAt: new Date().toISOString()
};

writeFileSync(`${stagingDir}/submission.json`, JSON.stringify(submission, null, 2));
console.log("Written submission.json");
