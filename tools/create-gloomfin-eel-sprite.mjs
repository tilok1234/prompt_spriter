import { writeFileSync, mkdirSync } from "fs";

const stagingDir = "C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-gloomfin-eel";
mkdirSync(stagingDir, { recursive: true });

const promptText = `Read and follow the project documentation.

Promptinator entry ID: prompt-0018-gloomfin-eel
Prompt formula: structured-v1

Create an enemy-mob-32 sprite named "Gloomfin Eel".

## Creative brief

- Collection: Mireborn Swarm. Swamp creatures built around mud, reeds, bubbles, toxins, shallow water, and deceptive movement.
- Core concept: A shallow-water ambusher that creates dangerous lightning lanes.
- Body and silhouette: Long serpentine body, broad head, and thin fin running along its spine.
- Signature features: Glowing fin nodes, whiskerlike feelers, and a forked tail.
- Palette and materials: Midnight blue, muddy green, electric cyan, and slick skin.
- Movement personality: Smooth, secretive, and violently fast during attacks.
- Attack concept: Dashes between two marked points, leaving a short-lived electrified line behind.
- Directional details: The left whisker is shorter, and three bright nodes sit near the tail.
- Avoid: Ocean sea serpent, dragon head, constant lightning covering the silhouette.

## Interpretation rules

- Left and right refer to the creature's own anatomical sides and must remain consistent in every direction.
- Treat gameplay effects as motion intent: make the attack readable through body posing, and use the effects layer only where the category contract allows.
- Hard-alpha and style-contract rules override words such as translucent, glowing, soft, or transparent in the creative brief.`;

const submission = {
  kind: "agent-submission",
  schemaVersion: "1.0.0",
  jobId: "enemy-mob-32-gloomfin-eel",
  assetId: "enemy-mob-32-gloomfin-eel",
  baseRevisionId: null,
  requestedName: "Gloomfin Eel",
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
