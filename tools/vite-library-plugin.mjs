import { createReadStream } from "node:fs";
import { dirname, resolve } from "node:path";
import { repositoryRoot } from "./lib/contracts.mjs";
import { readViewerLibrary } from "./lib/library-view.mjs";
import {
  createRevisionBatch,
  readRevisionBatches,
  RevisionBatchError,
} from "./lib/revision-batches.mjs";
import {
  applyReviewAction,
  ReviewActionError,
} from "./lib/review-actions.mjs";
import {
  importPromptCatalog,
  parsePromptCatalog,
  PromptinatorError,
  readPromptinatorStore,
  setPromptinatorEntryStyle,
  transitionPromptinatorEntry,
} from "./lib/promptinator.mjs";

const libraryRoot = process.env.PROMPT_SPRITER_LIBRARY_ROOT
  ? resolve(repositoryRoot, process.env.PROMPT_SPRITER_LIBRARY_ROOT)
  : resolve(repositoryRoot, "workspace", "library");
const workspaceRoot = dirname(libraryRoot);
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const revisionPattern = /^r[0-9]{3,}$/;

const sendJson = (response, statusCode, value) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(value));
};

const artifactUrl = (entry, kind) =>
  `/__prompt-spriter/artifact/${encodeURIComponent(entry.asset.id)}/${encodeURIComponent(entry.revision.id)}/${kind}`;

const viewerItems = (entries) =>
  entries.map((entry) => ({
    asset: entry.asset,
    review: entry.review,
    revision: entry.revision,
    validation: entry.validation,
    sheetUrl: artifactUrl(entry, "sheet"),
    thumbnailUrl: artifactUrl(entry, "thumbnail"),
    origin: entry.origin,
  }));

const viewerBatches = (entries) =>
  entries.map((entry) => ({
    batch: entry.batch,
    brief: entry.brief,
    relativeDirectory: entry.relativeDirectory,
  }));

const readJsonRequest = async (request) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024) {
      throw new ReviewActionError("Review request is too large.", 413);
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    throw new ReviewActionError("Review request body is required.");
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ReviewActionError("Review request must contain valid JSON.");
  }
};

const readPromptinatorJsonRequest = async (request) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) {
      throw new PromptinatorError("Promptinator request is too large.", 413);
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    throw new PromptinatorError("Promptinator request body is required.");
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new PromptinatorError(
      "Promptinator request must contain valid JSON.",
    );
  }
};

const handleBatchRequest = async (request, response) => {
  if (request.method === "GET") {
    const result = readRevisionBatches({ workspaceRoot });
    sendJson(response, result.errors.length > 0 ? 500 : 200, {
      items: viewerBatches(result.entries),
      errors: result.errors,
    });
    return;
  }
  if (request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    sendJson(response, 405, {
      error: "Batch requests require GET or POST.",
    });
    return;
  }
  if (!requestIsSameOrigin(request)) {
    sendJson(response, 403, { error: "Cross-origin batch request refused." });
    return;
  }
  if (
    !String(request.headers["content-type"] ?? "")
      .toLowerCase()
      .startsWith("application/json")
  ) {
    sendJson(response, 415, {
      error: "Batch creation requires application/json.",
    });
    return;
  }

  try {
    const payload = await readJsonRequest(request);
    const allowedKeys = new Set(["batchId", "selections"]);
    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload) ||
      Object.keys(payload).some((key) => !allowedKeys.has(key))
    ) {
      throw new RevisionBatchError(
        "Batch request contains unsupported fields.",
      );
    }

    const created = createRevisionBatch({
      workspaceRoot,
      batchId: payload.batchId,
      selections: payload.selections,
    });
    const batches = readRevisionBatches({ workspaceRoot });
    if (batches.errors.length > 0) {
      sendJson(response, 500, {
        error: "Batch saved, but batch history could not be reloaded.",
        created: {
          batch: created.batch,
          brief: created.brief,
          relativeDirectory: created.relativeDirectory,
        },
        errors: batches.errors,
      });
      return;
    }
    sendJson(response, 201, {
      created: {
        batch: created.batch,
        brief: created.brief,
        relativeDirectory: created.relativeDirectory,
      },
      items: viewerBatches(batches.entries),
      errors: [],
    });
  } catch (error) {
    sendJson(
      response,
      error instanceof RevisionBatchError ? error.statusCode : 500,
      {
        error:
          error instanceof Error
            ? error.message
            : "The revision batch could not be created.",
      },
    );
  }
};

const requestIsSameOrigin = (request) => {
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
};

const handleReviewAction = async (request, response) => {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Review actions require POST." });
    return;
  }
  if (!requestIsSameOrigin(request)) {
    sendJson(response, 403, { error: "Cross-origin review action refused." });
    return;
  }
  if (
    !String(request.headers["content-type"] ?? "")
      .toLowerCase()
      .startsWith("application/json")
  ) {
    sendJson(response, 415, {
      error: "Review actions require application/json.",
    });
    return;
  }

  try {
    const payload = await readJsonRequest(request);
    const allowedKeys = new Set([
      "action",
      "assetId",
      "revisionId",
      "expectedUpdatedAt",
      "note",
    ]);
    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload) ||
      Object.keys(payload).some((key) => !allowedKeys.has(key))
    ) {
      throw new ReviewActionError(
        "Review request contains unsupported fields.",
      );
    }

    const result = applyReviewAction({
      libraryRoot,
      action: payload.action,
      assetId: payload.assetId,
      revisionId: payload.revisionId,
      expectedUpdatedAt: payload.expectedUpdatedAt,
      note: payload.note,
    });
    const library = readViewerLibrary(libraryRoot);
    if (library.errors.length > 0) {
      sendJson(response, 500, {
        error: "Review saved, but the local library could not be reloaded.",
        review: result.review,
        errors: library.errors,
      });
      return;
    }
    sendJson(response, 200, {
      review: result.review,
      items: viewerItems(library.entries),
      errors: [],
    });
  } catch (error) {
    sendJson(
      response,
      error instanceof ReviewActionError ? error.statusCode : 500,
      {
        error:
          error instanceof Error
            ? error.message
            : "The review action failed.",
      },
    );
  }
};

const handlePromptinatorRequest = async (request, response) => {
  if (request.method === "GET") {
    try {
      sendJson(response, 200, {
        store: readPromptinatorStore({ workspaceRoot }),
      });
    } catch (error) {
      sendJson(
        response,
        error instanceof PromptinatorError ? error.statusCode : 500,
        {
          error:
            error instanceof Error
              ? error.message
              : "Promptinator could not be read.",
        },
      );
    }
    return;
  }
  if (request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    sendJson(response, 405, {
      error: "Promptinator requests require GET or POST.",
    });
    return;
  }
  if (!requestIsSameOrigin(request)) {
    sendJson(response, 403, {
      error: "Cross-origin Promptinator request refused.",
    });
    return;
  }
  if (
    !String(request.headers["content-type"] ?? "")
      .toLowerCase()
      .startsWith("application/json")
  ) {
    sendJson(response, 415, {
      error: "Promptinator requests require application/json.",
    });
    return;
  }

  try {
    const payload = await readPromptinatorJsonRequest(request);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new PromptinatorError(
        "Promptinator request must be a JSON object.",
      );
    }
    if (payload.action === "preview-import") {
      const allowed = new Set(["action", "sourceName", "text"]);
      if (Object.keys(payload).some((key) => !allowed.has(key))) {
        throw new PromptinatorError(
          "Promptinator preview contains unsupported fields.",
        );
      }
      const preview = parsePromptCatalog({
        text: payload.text,
        sourceName: payload.sourceName,
      });
      sendJson(response, 200, {
        preview: {
          sourceName: preview.sourceName,
          sourceSha256: preview.sourceSha256,
          entryCount: preview.entries.length,
          familyCount: preview.families.length,
          firstOrdinal: Math.min(
            ...preview.entries.map((entry) => entry.ordinal),
          ),
          lastOrdinal: Math.max(
            ...preview.entries.map((entry) => entry.ordinal),
          ),
          sampleNames: preview.entries.slice(0, 3).map((entry) => entry.name),
        },
      });
      return;
    }
    if (payload.action === "import") {
      const allowed = new Set([
        "action",
        "sourceName",
        "text",
        "expectedUpdatedAt",
      ]);
      if (Object.keys(payload).some((key) => !allowed.has(key))) {
        throw new PromptinatorError(
          "Promptinator import contains unsupported fields.",
        );
      }
      const result = importPromptCatalog({
        workspaceRoot,
        text: payload.text,
        sourceName: payload.sourceName,
        expectedUpdatedAt: payload.expectedUpdatedAt,
      });
      sendJson(response, result.alreadyImported ? 200 : 201, result);
      return;
    }
    if (["mark-copied", "requeue"].includes(payload.action)) {
      const allowed = new Set([
        "action",
        "entryId",
        "expectedUpdatedAt",
      ]);
      if (Object.keys(payload).some((key) => !allowed.has(key))) {
        throw new PromptinatorError(
          "Promptinator transition contains unsupported fields.",
        );
      }
      const store = transitionPromptinatorEntry({
        workspaceRoot,
        entryId: payload.entryId,
        action: payload.action,
        expectedUpdatedAt: payload.expectedUpdatedAt,
      });
      sendJson(response, 200, { store });
      return;
    }
    if (payload.action === "set-style") {
      const allowed = new Set([
        "action",
        "entryId",
        "style",
        "expectedUpdatedAt",
      ]);
      if (Object.keys(payload).some((key) => !allowed.has(key))) {
        throw new PromptinatorError(
          "Promptinator style selection contains unsupported fields.",
        );
      }
      const store = setPromptinatorEntryStyle({
        workspaceRoot,
        entryId: payload.entryId,
        style: payload.style,
        expectedUpdatedAt: payload.expectedUpdatedAt,
      });
      sendJson(response, 200, { store });
      return;
    }
    throw new PromptinatorError(
      `Unsupported Promptinator action "${String(payload.action)}".`,
    );
  } catch (error) {
    sendJson(
      response,
      error instanceof PromptinatorError ? error.statusCode : 500,
      {
        error:
          error instanceof Error
            ? error.message
            : "Promptinator request failed.",
      },
    );
  }
};

export const promptSpriterLibrary = () => ({
  name: "prompt-spriter-local-library",
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (url.pathname === "/__prompt-spriter/library") {
        const result = readViewerLibrary(libraryRoot);
        sendJson(response, result.errors.length > 0 ? 500 : 200, {
          items: viewerItems(result.entries),
          errors: result.errors,
        });
        return;
      }

      if (url.pathname === "/__prompt-spriter/review") {
        void handleReviewAction(request, response);
        return;
      }

      if (url.pathname === "/__prompt-spriter/batches") {
        void handleBatchRequest(request, response);
        return;
      }

      if (url.pathname === "/__prompt-spriter/promptinator") {
        void handlePromptinatorRequest(request, response);
        return;
      }

      const match = url.pathname.match(
        /^\/__prompt-spriter\/artifact\/([^/]+)\/([^/]+)\/(sheet|thumbnail)$/,
      );
      if (!match) {
        next();
        return;
      }

      const assetId = decodeURIComponent(match[1]);
      const revisionId = decodeURIComponent(match[2]);
      const kind = match[3];
      if (!idPattern.test(assetId) || !revisionPattern.test(revisionId)) {
        sendJson(response, 400, { error: "Invalid artifact identity." });
        return;
      }

      const result = readViewerLibrary(libraryRoot);
      const entry = result.entries.find(
        (candidate) =>
          candidate.asset.id === assetId &&
          candidate.revision.id === revisionId,
      );
      if (!entry) {
        sendJson(response, 404, { error: "Artifact was not found." });
        return;
      }

      response.statusCode = 200;
      response.setHeader("Content-Type", "image/png");
      response.setHeader("Cache-Control", "no-store");
      createReadStream(
        kind === "sheet" ? entry.sheetFile : entry.thumbnailFile,
      ).pipe(response);
    });
  },
});
