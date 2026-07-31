import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { createContractValidator, validateRecord } from "./contracts.mjs";
import { writeJsonAtomically } from "./fs-safety.mjs";

const fieldMap = new Map([
  ["Name", "name"],
  ["Core concept", "coreConcept"],
  ["Body and silhouette", "bodyAndSilhouette"],
  ["Signature features", "signatureFeatures"],
  ["Palette and materials", "paletteAndMaterials"],
  ["Movement personality", "movementPersonality"],
  ["Attack concept", "attackConcept"],
  ["Directional details", "directionalDetails"],
  ["Avoid", "avoid"],
]);
const briefKeys = [...fieldMap.values()].filter((key) => key !== "name");
const familyPattern = /^([0-9]+)\.\s+(.+)$/;
const entryPattern = /^([0-9]+)$/;
const fieldPattern = /^([^:]+):\s*(.*)$/;
const promptinatorRequestPattern =
  /^Promptinator entry ID:\s*(prompt-[0-9]{4,}-[a-z0-9]+(?:-[a-z0-9]+)*)\s*$/m;
const claimIdPattern =
  /^claim-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const testBatchIdPattern =
  /^v2-test-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const currentStoreVersion = "1.4.0";
const productionStyle = { id: "assembler-inspired-v2", version: "0.1.0" };
const legacyStyle = { id: "assembler-inspired-v1", version: "0.1.0" };

export class PromptinatorError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "PromptinatorError";
    this.statusCode = statusCode;
  }
}

const sha256Text = (value) =>
  createHash("sha256").update(value, "utf8").digest("hex");

export const slugifyPromptinatorValue = (value) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const promptId = (ordinal, name) => {
  const slug = slugifyPromptinatorValue(name);
  if (!slug) {
    throw new PromptinatorError(
      `Entry ${ordinal} cannot produce a safe prompt ID from its name.`,
    );
  }
  return `prompt-${String(ordinal).padStart(4, "0")}-${slug}`;
};

export const renderPromptinatorPrompt = ({
  id,
  name,
  family,
  brief,
  style = productionStyle,
  formulaVersion = "structured-v2",
}) =>
  [
    "Read and follow the project documentation.",
    "",
    `Promptinator entry ID: ${id}`,
    `Prompt formula: ${formulaVersion}`,
    ...(formulaVersion === "structured-v2"
      ? [
          `Required style profile: ${style.id}@${style.version}`,
          `Required style guide: styles/${style.id}/STYLE_GUIDE.md`,
        ]
      : []),
    "",
    `Create an enemy-mob-32 sprite named "${name}".`,
    "",
    "## Creative brief",
    "",
    `- Collection: ${family.name}. ${family.description}`,
    `- Core concept: ${brief.coreConcept}`,
    `- Body and silhouette: ${brief.bodyAndSilhouette}`,
    `- Signature features: ${brief.signatureFeatures}`,
    `- Palette and materials: ${brief.paletteAndMaterials}`,
    `- Movement personality: ${brief.movementPersonality}`,
    `- Attack concept: ${brief.attackConcept}`,
    `- Directional details: ${brief.directionalDetails}`,
    `- Avoid: ${brief.avoid}`,
    "",
    "## Interpretation rules",
    "",
    "- Left and right refer to the creature's own anatomical sides and must remain consistent in every direction.",
    "- Treat gameplay effects as motion intent: make the attack readable through body posing, and use the effects layer only where the category contract allows.",
    "- Hard-alpha and style-contract rules override words such as translucent, glowing, soft, or transparent in the creative brief.",
    ...(formulaVersion === "structured-v2"
      ? [
          "- Before drawing, choose and state one controlled body plan from the required style guide.",
          "- Build and inspect the four idle directions under one camera and ground plane before expanding the animation timeline.",
          "- Use only the required style profile's master palette and contour rule.",
        ]
      : []),
  ].join("\n");

const nextNonBlank = (lines, startIndex) => {
  let index = startIndex;
  while (index < lines.length && lines[index].trim() === "") index += 1;
  return index;
};

export const parsePromptCatalog = ({
  text,
  sourceName = "pasted prompt catalog",
}) => {
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new PromptinatorError("Prompt catalog text is required.");
  }
  if (
    typeof sourceName !== "string" ||
    sourceName.trim().length === 0 ||
    sourceName.length > 240
  ) {
    throw new PromptinatorError(
      "Prompt catalog source name must be between 1 and 240 characters.",
    );
  }

  const lines = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const entries = [];
  let family = null;
  let index = 0;

  while (index < lines.length) {
    index = nextNonBlank(lines, index);
    if (index >= lines.length) break;
    const line = lines[index].trim();
    const familyMatch = line.match(familyPattern);
    if (familyMatch) {
      const descriptionIndex = nextNonBlank(lines, index + 1);
      if (
        descriptionIndex >= lines.length ||
        familyPattern.test(lines[descriptionIndex].trim()) ||
        entryPattern.test(lines[descriptionIndex].trim())
      ) {
        throw new PromptinatorError(
          `Family "${familyMatch[2].trim()}" is missing its description.`,
        );
      }
      family = {
        ordinal: Number(familyMatch[1]),
        name: familyMatch[2].trim(),
        description: lines[descriptionIndex].trim(),
      };
      index = descriptionIndex + 1;
      continue;
    }

    const entryMatch = line.match(entryPattern);
    if (!entryMatch) {
      throw new PromptinatorError(
        `Unexpected catalog line ${index + 1}: "${line}".`,
      );
    }
    if (!family) {
      throw new PromptinatorError(
        `Entry ${entryMatch[1]} appears before a collection heading.`,
      );
    }

    const ordinal = Number(entryMatch[1]);
    const values = {};
    let lastKey = null;
    index += 1;
    while (index < lines.length) {
      const candidate = lines[index].trim();
      if (familyPattern.test(candidate) || entryPattern.test(candidate)) break;
      if (candidate === "") {
        index += 1;
        continue;
      }
      const fieldMatch = candidate.match(fieldPattern);
      if (fieldMatch) {
        const key = fieldMap.get(fieldMatch[1].trim());
        if (!key) {
          throw new PromptinatorError(
            `Entry ${ordinal} has unsupported field "${fieldMatch[1].trim()}".`,
          );
        }
        if (Object.hasOwn(values, key)) {
          throw new PromptinatorError(
            `Entry ${ordinal} repeats field "${fieldMatch[1].trim()}".`,
          );
        }
        values[key] = fieldMatch[2].trim();
        lastKey = key;
      } else if (lastKey) {
        values[lastKey] = `${values[lastKey]} ${candidate}`.trim();
      } else {
        throw new PromptinatorError(
          `Entry ${ordinal} has text before its first field.`,
        );
      }
      index += 1;
    }

    for (const [label, key] of fieldMap) {
      if (typeof values[key] !== "string" || values[key].length === 0) {
        throw new PromptinatorError(
          `Entry ${ordinal} is missing field "${label}".`,
        );
      }
    }
    const id = promptId(ordinal, values.name);
    const brief = Object.fromEntries(
      briefKeys.map((key) => [key, values[key]]),
    );
    entries.push({
      id,
      ordinal,
      name: values.name,
      family: { ...family },
      brief,
      promptText: renderPromptinatorPrompt({
        id,
        name: values.name,
        family,
        brief,
      }),
    });
  }

  if (entries.length === 0) {
    throw new PromptinatorError("Prompt catalog did not contain any entries.");
  }
  const seenIds = new Set();
  const seenOrdinals = new Set();
  const seenNames = new Set();
  for (const entry of entries) {
    const normalizedName = entry.name.toLocaleLowerCase();
    if (seenIds.has(entry.id) || seenOrdinals.has(entry.ordinal)) {
      throw new PromptinatorError(
        `Prompt catalog contains a duplicate entry at ${entry.ordinal}.`,
      );
    }
    if (seenNames.has(normalizedName)) {
      throw new PromptinatorError(
        `Prompt catalog contains duplicate name "${entry.name}".`,
      );
    }
    seenIds.add(entry.id);
    seenOrdinals.add(entry.ordinal);
    seenNames.add(normalizedName);
  }
  const families = new Map();
  for (const entry of entries) {
    const signature = `${entry.family.name}\n${entry.family.description}`;
    const prior = families.get(entry.family.ordinal);
    if (prior && prior !== signature) {
      throw new PromptinatorError(
        `Collection ordinal ${entry.family.ordinal} has conflicting metadata.`,
      );
    }
    families.set(entry.family.ordinal, signature);
  }

  return {
    sourceName: sourceName.trim(),
    sourceSha256: sha256Text(text),
    entries,
    families: [...families].map(([ordinal, signature]) => {
      const [name, description] = signature.split("\n");
      return { ordinal, name, description };
    }),
  };
};

const emptyStore = (at = "1970-01-01T00:00:00.000Z") => ({
  kind: "promptinator-store",
  schemaVersion: currentStoreVersion,
  updatedAt: at,
  activeTestBatch: null,
  entries: [],
});
const storePathFor = (workspaceRoot) =>
  join(resolve(workspaceRoot), "promptinator", "store.json");
const lockPathFor = (workspaceRoot) =>
  join(resolve(workspaceRoot), "promptinator", "store.lock");

const migrateStore = (store) => {
  if (!["1.0.0", "1.1.0", "1.2.0", "1.3.0"].includes(store?.schemaVersion)) {
    return store;
  }
  const migrateReadyEntry = (entry) => {
    const normalizedEntry = {
      ...entry,
      ...(store.schemaVersion === "1.0.0"
        ? { claim: null, completion: null }
        : {}),
    };
    if (
      normalizedEntry.state !== "ready" ||
      normalizedEntry.style?.id !== legacyStyle.id ||
      normalizedEntry.style?.version !== legacyStyle.version ||
      normalizedEntry.formulaVersion !== "structured-v1"
    ) {
      return normalizedEntry;
    }
    return {
      ...normalizedEntry,
      style: { ...productionStyle },
      formulaVersion: "structured-v2",
      promptText: renderPromptinatorPrompt({
        id: normalizedEntry.id,
        name: normalizedEntry.name,
        family: normalizedEntry.family,
        brief: normalizedEntry.brief,
        style: productionStyle,
        formulaVersion: "structured-v2",
      }),
      history: [
        ...normalizedEntry.history,
        {
          action: "default-style-migrated",
          at: store.updatedAt,
          style: { ...productionStyle },
        },
      ],
    };
  };
  return {
    ...store,
    schemaVersion: currentStoreVersion,
    activeTestBatch: null,
    entries: Array.isArray(store.entries)
      ? store.entries.map(migrateReadyEntry)
      : store.entries,
  };
};

const withPromptinatorLock = (workspaceRoot, operation) => {
  const directory = join(resolve(workspaceRoot), "promptinator");
  mkdirSync(directory, { recursive: true });
  const lockPath = lockPathFor(workspaceRoot);
  let handle;
  try {
    handle = openSync(lockPath, "wx");
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new PromptinatorError(
        "Promptinator is busy with another queue operation. Retry after that operation finishes.",
        409,
      );
    }
    throw error;
  }
  try {
    return operation();
  } finally {
    closeSync(handle);
    if (existsSync(lockPath)) unlinkSync(lockPath);
  }
};

const validateStore = (store, label) => {
  const failures = validateRecord(
    createContractValidator(),
    store,
    label,
  );
  const ids = new Set();
  const ordinals = new Set();
  const names = new Set();
  const families = new Map();
  for (const entry of failures.length === 0 ? store.entries : []) {
    const normalizedName = entry.name.toLocaleLowerCase();
    if (ids.has(entry.id)) failures.push(`${label}: duplicate ID ${entry.id}`);
    if (ordinals.has(entry.ordinal)) {
      failures.push(`${label}: duplicate ordinal ${entry.ordinal}`);
    }
    if (names.has(normalizedName)) {
      failures.push(`${label}: duplicate name ${entry.name}`);
    }
    ids.add(entry.id);
    ordinals.add(entry.ordinal);
    names.add(normalizedName);

    const familySignature = `${entry.family.name}\n${entry.family.description}`;
    const priorFamily = families.get(entry.family.ordinal);
    if (priorFamily && priorFamily !== familySignature) {
      failures.push(
        `${label}: collection ${entry.family.ordinal} has conflicting metadata`,
      );
    }
    families.set(entry.family.ordinal, familySignature);
    for (const event of entry.history) {
      if (
        [
          "style-selected",
          "default-style-migrated",
          "v2-test-batch-selected",
        ].includes(event.action) &&
        !event.style
      ) {
        failures.push(
          `${label}: ${event.action} history is missing its style for ${entry.id}`,
        );
      }
      if (event.action === "v2-test-batch-selected" && !event.batchId) {
        failures.push(
          `${label}: v2 test-batch history is missing its batch ID for ${entry.id}`,
        );
      }
    }
    if (entry.id !== promptId(entry.ordinal, entry.name)) {
      failures.push(`${label}: mismatched ID for ${entry.id}`);
    }
    if (
      entry.promptText !==
      renderPromptinatorPrompt({
        id: entry.id,
        name: entry.name,
        family: entry.family,
        brief: entry.brief,
        style: entry.style,
        formulaVersion: entry.formulaVersion,
      })
    ) {
      failures.push(`${label}: mismatched prompt text for ${entry.id}`);
    }
    const lastAction = entry.history.at(-1)?.action;
    if (
      entry.state === "copied" &&
      (entry.copiedAt === null ||
        entry.claim !== null ||
        entry.completion !== null ||
        lastAction !== "copied")
    ) {
      failures.push(`${label}: inconsistent copied state for ${entry.id}`);
    }
    if (
      entry.state === "ready" &&
      (entry.copiedAt !== null ||
        entry.claim !== null ||
        entry.completion !== null ||
        ![
          "imported",
          "requeued",
          "style-selected",
          "default-style-migrated",
          "v2-test-batch-selected",
        ].includes(lastAction))
    ) {
      failures.push(`${label}: inconsistent ready state for ${entry.id}`);
    }
    if (
      entry.state === "claimed" &&
      (entry.copiedAt !== null ||
        entry.claim === null ||
        entry.completion !== null ||
        lastAction !== "claimed" ||
        entry.history.at(-1)?.claimId !== entry.claim?.id)
    ) {
      failures.push(`${label}: inconsistent claimed state for ${entry.id}`);
    }
    if (
      entry.state === "completed" &&
      (entry.completion === null ||
        lastAction !== "completed" ||
        entry.history.at(-1)?.assetId !== entry.completion?.assetId ||
        entry.history.at(-1)?.revisionId !== entry.completion?.revisionId)
    ) {
      failures.push(`${label}: inconsistent completed state for ${entry.id}`);
    }
  }
  if (failures.length === 0 && store.activeTestBatch) {
    const batch = store.activeTestBatch;
    if (
      batch.style.id !== productionStyle.id ||
      batch.style.version !== productionStyle.version
    ) {
      failures.push(`${label}: active test batch must use the v2 production style`);
    }
    const selectedEntries = batch.entryIds.map((entryId) =>
      store.entries.find((entry) => entry.id === entryId),
    );
    for (let index = 0; index < selectedEntries.length; index += 1) {
      const entry = selectedEntries[index];
      const entryId = batch.entryIds[index];
      if (!entry) {
        failures.push(`${label}: active test batch references missing entry ${entryId}`);
        continue;
      }
      if (
        entry.style.id !== productionStyle.id ||
        entry.style.version !== productionStyle.version ||
        entry.formulaVersion !== "structured-v2"
      ) {
        failures.push(`${label}: active test-batch entry ${entryId} is not locked to v2`);
      }
      if (
        !entry.history.some(
          (event) =>
            event.action === "v2-test-batch-selected" &&
            event.batchId === batch.id,
        )
      ) {
        failures.push(`${label}: active test-batch entry ${entryId} lacks batch provenance`);
      }
    }
    const sortedEntryIds = [...selectedEntries]
      .filter(Boolean)
      .sort((left, right) => left.ordinal - right.ordinal)
      .map((entry) => entry.id);
    if (JSON.stringify(sortedEntryIds) !== JSON.stringify(batch.entryIds)) {
      failures.push(`${label}: active test-batch entries must be in ordinal order`);
    }
  }
  if (failures.length > 0) {
    throw new PromptinatorError(
      `Promptinator store is invalid: ${failures.join("; ")}`,
      500,
    );
  }
};

export const readPromptinatorStore = ({ workspaceRoot }) => {
  const path = storePathFor(workspaceRoot);
  if (!existsSync(path)) return emptyStore();
  let store;
  try {
    store = migrateStore(JSON.parse(readFileSync(path, "utf8")));
  } catch (error) {
    throw new PromptinatorError(
      `Promptinator store could not be read: ${error instanceof Error ? error.message : String(error)}`,
      500,
    );
  }
  validateStore(store, path);
  return store;
};

const writeStore = ({ workspaceRoot, store }) => {
  validateStore(store, storePathFor(workspaceRoot));
  const directory = join(resolve(workspaceRoot), "promptinator");
  mkdirSync(directory, { recursive: true });
  writeJsonAtomically(join(directory, "store.json"), store);
  return store;
};

const assertExpectedUpdatedAt = (store, expectedUpdatedAt) => {
  if (
    typeof expectedUpdatedAt !== "string" ||
    expectedUpdatedAt !== store.updatedAt
  ) {
    throw new PromptinatorError(
      "Promptinator changed since this view loaded. Reload before trying again.",
      409,
    );
  }
};

export const importPromptCatalog = ({
  workspaceRoot,
  text,
  sourceName,
  expectedUpdatedAt,
  now = () => new Date().toISOString(),
}) => {
  const preview = parsePromptCatalog({ text, sourceName });
  return withPromptinatorLock(workspaceRoot, () => {
    const store = readPromptinatorStore({ workspaceRoot });
    assertExpectedUpdatedAt(store, expectedUpdatedAt);
    if (
      store.entries.some(
        (entry) => entry.source.sha256 === preview.sourceSha256,
      )
    ) {
      return {
        store,
        importedCount: 0,
        alreadyImported: true,
        sourceSha256: preview.sourceSha256,
      };
    }
    const ids = new Set(store.entries.map((entry) => entry.id));
    const ordinals = new Set(store.entries.map((entry) => entry.ordinal));
    const names = new Set(
      store.entries.map((entry) => entry.name.toLocaleLowerCase()),
    );
    for (const entry of preview.entries) {
      if (
        ids.has(entry.id) ||
        ordinals.has(entry.ordinal) ||
        names.has(entry.name.toLocaleLowerCase())
      ) {
        throw new PromptinatorError(
          `Import conflicts with an existing entry: ${entry.ordinal}. ${entry.name}.`,
          409,
        );
      }
    }
    const importedAt = now();
    const importedEntries = preview.entries.map((entry) => ({
      ...entry,
      category: { id: "enemy-mob-32", version: "0.1.0" },
      style: { ...productionStyle },
      formulaVersion: "structured-v2",
      state: "ready",
      importedAt,
      copiedAt: null,
      claim: null,
      completion: null,
      source: { name: preview.sourceName, sha256: preview.sourceSha256 },
      history: [{ action: "imported", at: importedAt }],
    }));
    const nextStore = {
      ...store,
      updatedAt: importedAt,
      entries: [...store.entries, ...importedEntries].sort(
        (left, right) => left.ordinal - right.ordinal,
      ),
    };
    writeStore({ workspaceRoot, store: nextStore });
    return {
      store: nextStore,
      importedCount: importedEntries.length,
      alreadyImported: false,
      sourceSha256: preview.sourceSha256,
    };
  });
};

export const transitionPromptinatorEntry = ({
  workspaceRoot,
  entryId,
  action,
  expectedUpdatedAt,
  now = () => new Date().toISOString(),
}) => {
  if (!["mark-copied", "requeue"].includes(action)) {
    throw new PromptinatorError(
      `Unsupported Promptinator transition "${String(action)}".`,
    );
  }
  return withPromptinatorLock(workspaceRoot, () => {
    const store = readPromptinatorStore({ workspaceRoot });
    assertExpectedUpdatedAt(store, expectedUpdatedAt);
    const entryIndex = store.entries.findIndex((entry) => entry.id === entryId);
    if (entryIndex < 0) {
      throw new PromptinatorError(
        `Promptinator entry was not found: ${String(entryId)}.`,
        404,
      );
    }
    const entry = store.entries[entryIndex];
    if (action === "mark-copied") {
      if (entry.state === "copied") return store;
      if (entry.state !== "ready") {
        throw new PromptinatorError(
          `${entry.name} cannot be copied from state ${entry.state}.`,
          409,
        );
      }
      if (store.activeTestBatch) {
        const nextBatchEntryId = store.activeTestBatch.entryIds.find(
          (candidateId) =>
            store.entries.some(
              (candidate) =>
                candidate.id === candidateId && candidate.state === "ready",
            ),
        );
        if (entry.id !== nextBatchEntryId) {
          throw new PromptinatorError(
            `Active v2 test batch ${store.activeTestBatch.id} permits manual copy only for its next Ready entry.`,
            409,
          );
        }
      }
    } else {
      if (entry.state === "ready") return store;
      if (!["copied", "claimed"].includes(entry.state)) {
        throw new PromptinatorError(
          `${entry.name} cannot be requeued from state ${entry.state}.`,
          409,
        );
      }
    }
    const at = now();
    const nextEntries = [...store.entries];
    nextEntries[entryIndex] = {
      ...entry,
      state: action === "mark-copied" ? "copied" : "ready",
      copiedAt: action === "mark-copied" ? at : null,
      claim: null,
      completion: null,
      history: [
        ...entry.history,
        { action: action === "mark-copied" ? "copied" : "requeued", at },
      ],
    };
    return writeStore({
      workspaceRoot,
      store: { ...store, updatedAt: at, entries: nextEntries },
    });
  });
};

export const setPromptinatorEntryStyle = ({
  workspaceRoot,
  entryId,
  style,
  expectedUpdatedAt,
  now = () => new Date().toISOString(),
}) => {
  const requestedStyle =
    style?.id === productionStyle.id && style?.version === productionStyle.version
      ? productionStyle
      : style?.id === legacyStyle.id && style?.version === legacyStyle.version
        ? legacyStyle
        : null;
  if (!requestedStyle) {
    throw new PromptinatorError(
      `Unsupported Promptinator style ${String(style?.id)}@${String(style?.version)}.`,
    );
  }

  return withPromptinatorLock(workspaceRoot, () => {
    const store = readPromptinatorStore({ workspaceRoot });
    assertExpectedUpdatedAt(store, expectedUpdatedAt);
    const entryIndex = store.entries.findIndex((entry) => entry.id === entryId);
    if (entryIndex < 0) {
      throw new PromptinatorError(
        `Promptinator entry was not found: ${String(entryId)}.`,
        404,
      );
    }
    const entry = store.entries[entryIndex];
    if (entry.state !== "ready") {
      throw new PromptinatorError(
        `${entry.name} can change style only while it is Ready.`,
        409,
      );
    }
    if (
      store.activeTestBatch?.entryIds.includes(entry.id) &&
      (requestedStyle.id !== productionStyle.id ||
        requestedStyle.version !== productionStyle.version)
    ) {
      throw new PromptinatorError(
        `${entry.name} is locked to v2 by active test batch ${store.activeTestBatch.id}.`,
        409,
      );
    }
    if (
      entry.style.id === requestedStyle.id &&
      entry.style.version === requestedStyle.version
    ) {
      return store;
    }

    const formulaVersion =
      requestedStyle.id === productionStyle.id
        ? "structured-v2"
        : "structured-v1";
    const at = now();
    const nextEntries = [...store.entries];
    nextEntries[entryIndex] = {
      ...entry,
      style: { ...requestedStyle },
      formulaVersion,
      promptText: renderPromptinatorPrompt({
        id: entry.id,
        name: entry.name,
        family: entry.family,
        brief: entry.brief,
        style: requestedStyle,
        formulaVersion,
      }),
      history: [
        ...entry.history,
        { action: "style-selected", at, style: { ...requestedStyle } },
      ],
    };
    return writeStore({
      workspaceRoot,
      store: { ...store, updatedAt: at, entries: nextEntries },
    });
  });
};

export const createPromptinatorV2TestBatch = ({
  workspaceRoot,
  entryIds,
  expectedUpdatedAt,
  now = () => new Date().toISOString(),
  batchIdFactory = () => `v2-test-${randomUUID()}`,
}) => {
  if (
    !Array.isArray(entryIds) ||
    entryIds.length < 2 ||
    entryIds.length > 24 ||
    entryIds.some((entryId) => typeof entryId !== "string") ||
    new Set(entryIds).size !== entryIds.length
  ) {
    throw new PromptinatorError(
      "A v2 test batch requires 2-24 unique Ready entry IDs.",
    );
  }

  return withPromptinatorLock(workspaceRoot, () => {
    const store = readPromptinatorStore({ workspaceRoot });
    assertExpectedUpdatedAt(store, expectedUpdatedAt);
    if (store.activeTestBatch) {
      throw new PromptinatorError(
        `End active test batch ${store.activeTestBatch.id} before starting another.`,
        409,
      );
    }
    const selectedEntries = entryIds.map((entryId) => {
      const entry = store.entries.find((candidate) => candidate.id === entryId);
      if (!entry) {
        throw new PromptinatorError(
          `Promptinator entry was not found: ${entryId}.`,
          404,
        );
      }
      if (entry.state !== "ready") {
        throw new PromptinatorError(
          `${entry.name} can join a v2 test batch only while it is Ready.`,
          409,
        );
      }
      return entry;
    }).sort((left, right) => left.ordinal - right.ordinal);
    const batchId = batchIdFactory();
    if (!testBatchIdPattern.test(batchId)) {
      throw new PromptinatorError(
        "Promptinator produced an invalid v2 test-batch ID.",
        500,
      );
    }
    const at = now();
    const selectedIds = selectedEntries.map((entry) => entry.id);
    const selectedSet = new Set(selectedIds);
    const nextEntries = store.entries.map((entry) => {
      if (!selectedSet.has(entry.id)) return entry;
      return {
        ...entry,
        style: { ...productionStyle },
        formulaVersion: "structured-v2",
        promptText: renderPromptinatorPrompt({
          id: entry.id,
          name: entry.name,
          family: entry.family,
          brief: entry.brief,
          style: productionStyle,
          formulaVersion: "structured-v2",
        }),
        history: [
          ...entry.history,
          {
            action: "v2-test-batch-selected",
            at,
            style: { ...productionStyle },
            batchId,
          },
        ],
      };
    });
    const activeTestBatch = {
      id: batchId,
      style: { ...productionStyle },
      createdAt: at,
      entryIds: selectedIds,
    };
    return writeStore({
      workspaceRoot,
      store: {
        ...store,
        updatedAt: at,
        activeTestBatch,
        entries: nextEntries,
      },
    });
  });
};

export const clearPromptinatorV2TestBatch = ({
  workspaceRoot,
  batchId,
  expectedUpdatedAt,
  now = () => new Date().toISOString(),
}) =>
  withPromptinatorLock(workspaceRoot, () => {
    const store = readPromptinatorStore({ workspaceRoot });
    assertExpectedUpdatedAt(store, expectedUpdatedAt);
    if (!store.activeTestBatch) return store;
    if (store.activeTestBatch.id !== batchId) {
      throw new PromptinatorError(
        "The active v2 test batch changed since this view loaded.",
        409,
      );
    }
    return writeStore({
      workspaceRoot,
      store: {
        ...store,
        updatedAt: now(),
        activeTestBatch: null,
      },
    });
  });

const normalizedPromptText = (value) =>
  String(value ?? "").replace(/\r\n?/g, "\n").trim();
const sameJson = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);

export const promptinatorEntryIdFromRequest = (request) =>
  normalizedPromptText(request).match(promptinatorRequestPattern)?.[1] ?? null;

const reconcileEntriesWithLibrary = ({ entries, libraryEntries }) => {
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const entryByExpectedAssetId = new Map(
    entries.map((entry) => [
      `${entry.category.id}-${slugifyPromptinatorValue(entry.name)}`,
      entry,
    ]),
  );
  const completionById = new Map();
  for (const libraryEntry of libraryEntries) {
    if (libraryEntry.revision.parentRevisionId !== null) continue;
    const requestEntryId = promptinatorEntryIdFromRequest(
      libraryEntry.revision.request,
    );
    const legacyEntry = entryByExpectedAssetId.get(libraryEntry.asset.id);
    const entry = requestEntryId
      ? entryById.get(requestEntryId)
      : ["copied", "completed"].includes(legacyEntry?.state)
        ? legacyEntry
        : null;
    if (!entry) continue;
    const entryId = entry.id;
    if (
      (requestEntryId !== null &&
        normalizedPromptText(libraryEntry.revision.request) !==
          normalizedPromptText(entry.promptText)) ||
      libraryEntry.asset.name !== entry.name ||
      !sameJson(libraryEntry.revision.category, entry.category) ||
      !sameJson(libraryEntry.revision.style, entry.style)
    ) {
      throw new PromptinatorError(
        `Library provenance does not match Promptinator entry ${entryId}.`,
        409,
      );
    }
    const completion = {
      assetId: libraryEntry.asset.id,
      revisionId: libraryEntry.revision.id,
      completedAt: libraryEntry.revision.createdAt,
    };
    const existing = completionById.get(entryId);
    if (existing && !sameJson(existing, completion)) {
      throw new PromptinatorError(
        `More than one Library asset claims Promptinator entry ${entryId}.`,
        409,
      );
    }
    completionById.set(entryId, completion);
  }

  let reconciledCount = 0;
  const nextEntries = entries.map((entry) => {
    const completion = completionById.get(entry.id);
    if (!completion) return entry;
    if (entry.state === "completed") {
      if (!sameJson(entry.completion, completion)) {
        throw new PromptinatorError(
          `Completed Promptinator entry ${entry.id} points at different Library provenance.`,
          409,
        );
      }
      return entry;
    }
    reconciledCount += 1;
    return {
      ...entry,
      state: "completed",
      completion,
      history: [
        ...entry.history,
        {
          action: "completed",
          at: completion.completedAt,
          ...(entry.claim ? { claimId: entry.claim.id } : {}),
          assetId: completion.assetId,
          revisionId: completion.revisionId,
        },
      ],
    };
  });
  return { entries: nextEntries, reconciledCount };
};

export const reconcilePromptinatorWithLibrary = ({
  workspaceRoot,
  libraryEntries,
  now = () => new Date().toISOString(),
}) =>
  withPromptinatorLock(workspaceRoot, () => {
    const store = readPromptinatorStore({ workspaceRoot });
    const reconciled = reconcileEntriesWithLibrary({
      entries: store.entries,
      libraryEntries,
    });
    if (reconciled.reconciledCount === 0) {
      return { store, reconciledCount: 0 };
    }
    const nextStore = writeStore({
      workspaceRoot,
      store: {
        ...store,
        updatedAt: now(),
        entries: reconciled.entries,
      },
    });
    return {
      store: nextStore,
      reconciledCount: reconciled.reconciledCount,
    };
  });

export const claimNextPromptinatorEntry = ({
  workspaceRoot,
  libraryEntries = [],
  claimant = "Antigravity",
  now = () => new Date().toISOString(),
  claimIdFactory = () => `claim-${randomUUID()}`,
}) =>
  withPromptinatorLock(workspaceRoot, () => {
    if (
      typeof claimant !== "string" ||
      claimant.trim().length === 0 ||
      claimant.length > 120
    ) {
      throw new PromptinatorError(
        "Promptinator claimant must be between 1 and 120 characters.",
      );
    }
    const store = readPromptinatorStore({ workspaceRoot });
    const reconciled = reconcileEntriesWithLibrary({
      entries: store.entries,
      libraryEntries,
    });
    const activeBatch = store.activeTestBatch;
    const nextBatchEntryId = activeBatch?.entryIds.find((entryId) =>
      reconciled.entries.some(
        (entry) => entry.id === entryId && entry.state === "ready",
      ),
    );
    if (activeBatch && !nextBatchEntryId) {
      const at = now();
      if (reconciled.reconciledCount > 0) {
        writeStore({
          workspaceRoot,
          store: { ...store, updatedAt: at, entries: reconciled.entries },
        });
      }
      throw new PromptinatorError(
        `Active v2 test batch ${activeBatch.id} has no Ready entries. End it in Promptinator before claiming outside the batch.`,
        409,
      );
    }
    const entryIndex = reconciled.entries.findIndex((entry) =>
      activeBatch
        ? entry.id === nextBatchEntryId
        : entry.state === "ready",
    );
    const at = now();
    if (entryIndex < 0) {
      if (reconciled.reconciledCount > 0) {
        writeStore({
          workspaceRoot,
          store: { ...store, updatedAt: at, entries: reconciled.entries },
        });
      }
      throw new PromptinatorError(
        "Promptinator has no Ready entries to claim.",
        409,
      );
    }
    const claimId = claimIdFactory();
    if (!claimIdPattern.test(claimId)) {
      throw new PromptinatorError("Promptinator produced an invalid claim ID.", 500);
    }
    const entry = reconciled.entries[entryIndex];
    const claim = {
      id: claimId,
      claimedAt: at,
      claimant: claimant.trim(),
      expectedAssetId: `${entry.category.id}-${slugifyPromptinatorValue(entry.name)}`,
    };
    const claimedEntry = {
      ...entry,
      state: "claimed",
      copiedAt: null,
      claim,
      completion: null,
      history: [
        ...entry.history,
        { action: "claimed", at, claimId },
      ],
    };
    const nextEntries = [...reconciled.entries];
    nextEntries[entryIndex] = claimedEntry;
    const nextStore = writeStore({
      workspaceRoot,
      store: { ...store, updatedAt: at, entries: nextEntries },
    });
    return {
      store: nextStore,
      entry: claimedEntry,
      claim,
      testBatch: activeBatch,
      reconciledCount: reconciled.reconciledCount,
    };
  });

export const resolvePromptinatorClaimForSubmission = ({
  workspaceRoot,
  submission,
}) => {
  const entryId = promptinatorEntryIdFromRequest(submission.request);
  if (!entryId) return null;
  const store = readPromptinatorStore({ workspaceRoot });
  const entry = store.entries.find((candidate) => candidate.id === entryId);
  if (!entry) {
    throw new PromptinatorError(
      `Submission references unknown Promptinator entry ${entryId}.`,
      409,
    );
  }
  if (submission.baseRevisionId !== null) {
    throw new PromptinatorError(
      "Promptinator creation claims cannot be used for an existing-asset revision.",
      409,
    );
  }
  if (entry.state !== "claimed" || entry.claim === null) {
    throw new PromptinatorError(
      `Promptinator entry ${entryId} is not actively claimed.`,
      409,
    );
  }
  if (
    normalizedPromptText(submission.request) !==
      normalizedPromptText(entry.promptText) ||
    submission.requestedName !== entry.name ||
    submission.assetId !== entry.claim.expectedAssetId ||
    !sameJson(submission.category, entry.category) ||
    !sameJson(submission.style, entry.style)
  ) {
    throw new PromptinatorError(
      `Submission identity or prompt does not match active Promptinator claim ${entryId}.`,
      409,
    );
  }
  return { entryId, claimId: entry.claim.id };
};

export const completePromptinatorClaim = ({
  workspaceRoot,
  entryId,
  claimId,
  assetId,
  revisionId,
  completedAt,
  now = () => new Date().toISOString(),
}) =>
  withPromptinatorLock(workspaceRoot, () => {
    const store = readPromptinatorStore({ workspaceRoot });
    const entryIndex = store.entries.findIndex((entry) => entry.id === entryId);
    if (entryIndex < 0) {
      throw new PromptinatorError(
        `Promptinator entry was not found: ${entryId}.`,
        404,
      );
    }
    const entry = store.entries[entryIndex];
    const completion = { assetId, revisionId, completedAt };
    if (entry.state === "completed") {
      if (sameJson(entry.completion, completion)) return store;
      throw new PromptinatorError(
        `Promptinator entry ${entryId} is already completed by another revision.`,
        409,
      );
    }
    if (entry.state !== "claimed" || entry.claim?.id !== claimId) {
      throw new PromptinatorError(
        `Promptinator claim ${claimId} is no longer active for ${entryId}.`,
        409,
      );
    }
    const nextEntries = [...store.entries];
    nextEntries[entryIndex] = {
      ...entry,
      state: "completed",
      completion,
      history: [
        ...entry.history,
        {
          action: "completed",
          at: completedAt,
          claimId,
          assetId,
          revisionId,
        },
      ],
    };
    return writeStore({
      workspaceRoot,
      store: { ...store, updatedAt: now(), entries: nextEntries },
    });
  });
