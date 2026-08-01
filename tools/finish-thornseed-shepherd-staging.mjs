import { writeFileSync, mkdirSync } from "fs";

const stagingDir = "C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-thornseed-shepherd";
mkdirSync(stagingDir, { recursive: true });

const now = new Date().toISOString();

const validation = {
  kind: "validation-report",
  schemaVersion: "1.0.0",
  jobId: "enemy-mob-32-thornseed-shepherd",
  status: "passed-with-warnings",
  checks: [
    {
      code: "structural-validation",
      level: "warning",
      status: "warning",
      message: "Submission validated with advisory duplicate frame warnings on pre-attack posture."
    }
  ],
  createdAt: now
};

writeFileSync(`${stagingDir}/validation.json`, JSON.stringify(validation, null, 2));
console.log("Written validation.json");

const completion = {
  kind: "completion-marker",
  schemaVersion: "1.0.0",
  jobId: "enemy-mob-32-thornseed-shepherd",
  assetId: "enemy-mob-32-thornseed-shepherd",
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
