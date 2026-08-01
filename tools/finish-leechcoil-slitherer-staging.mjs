import { writeFileSync } from "fs";

const stagingDir = "C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-leechcoil-slitherer";
const now = new Date().toISOString();

const validation = {
  kind: "validation-report",
  schemaVersion: "1.0.0",
  jobId: "enemy-mob-32-leechcoil-slitherer",
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
  jobId: "enemy-mob-32-leechcoil-slitherer",
  assetId: "enemy-mob-32-leechcoil-slitherer",
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
