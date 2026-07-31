import { useEffect, useMemo, useState } from "react";
import {
  importPromptCatalog,
  previewPromptCatalog,
  setPromptinatorEntryStyle,
  transitionPromptinatorEntry,
  type PromptCatalogPreview,
  type PromptinatorEntry,
  type PromptinatorStore,
} from "../data/promptinator";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const matchesQuery = (entry: PromptinatorEntry, query: string) => {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return true;
  return [
    entry.name,
    entry.id,
    entry.family.name,
    entry.brief.coreConcept,
    entry.brief.signatureFeatures,
    entry.style.id,
    entry.promptText,
  ].some((value) => value.toLocaleLowerCase().includes(normalized));
};

export function PromptinatorView({
  store,
  query,
  loadError,
  onStoreChange,
  onReload,
}: {
  store: PromptinatorStore;
  query: string;
  loadError: string | null;
  onStoreChange: (store: PromptinatorStore) => void;
  onReload: () => Promise<void>;
}) {
  const [lane, setLane] = useState<
    "ready" | "in-progress" | "completed"
  >("ready");
  const [selectedId, setSelectedId] = useState("");
  const [sourceName, setSourceName] = useState("pasted-prompt-catalog.txt");
  const [catalogText, setCatalogText] = useState("");
  const [preview, setPreview] = useState<PromptCatalogPreview | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [pendingEntryId, setPendingEntryId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const ready = useMemo(
    () =>
      store.entries
        .filter(
          (entry) => entry.state === "ready" && matchesQuery(entry, query),
        )
        .sort((left, right) => left.ordinal - right.ordinal),
    [store.entries, query],
  );
  const inProgress = useMemo(
    () =>
      store.entries
        .filter(
          (entry) =>
            ["copied", "claimed"].includes(entry.state) &&
            matchesQuery(entry, query),
        )
        .sort(
          (left, right) =>
            Date.parse(
              right.claim?.claimedAt ?? right.copiedAt ?? right.importedAt,
            ) -
            Date.parse(
              left.claim?.claimedAt ?? left.copiedAt ?? left.importedAt,
            ),
        ),
    [store.entries, query],
  );
  const completed = useMemo(
    () =>
      store.entries
        .filter(
          (entry) =>
            entry.state === "completed" && matchesQuery(entry, query),
        )
        .sort(
          (left, right) =>
            Date.parse(right.completion?.completedAt ?? right.importedAt) -
            Date.parse(left.completion?.completedAt ?? left.importedAt),
        ),
    [store.entries, query],
  );
  const visible =
    lane === "ready"
      ? ready
      : lane === "in-progress"
        ? inProgress
        : completed;
  const selected =
    visible.find((entry) => entry.id === selectedId) ?? visible[0] ?? null;
  const readyCount = store.entries.filter(
    (entry) => entry.state === "ready",
  ).length;
  const inProgressCount = store.entries.filter((entry) =>
    ["copied", "claimed"].includes(entry.state),
  ).length;
  const completedCount = store.entries.filter(
    (entry) => entry.state === "completed",
  ).length;

  useEffect(() => {
    if (!selected) setSelectedId("");
    else if (selected.id !== selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);

  const clearFeedback = () => {
    setError(null);
    setNotice(null);
  };

  const chooseFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    clearFeedback();
    setPreview(null);
    const chosen = [...files];
    setSourceName(chosen.map((file) => file.name).join(" + "));
    setCatalogText(
      (await Promise.all(chosen.map((file) => file.text()))).join("\n\n"),
    );
  };

  const validateImport = async () => {
    clearFeedback();
    setPending(true);
    try {
      const result = await previewPromptCatalog({ sourceName, text: catalogText });
      setPreview(result);
      setNotice(
        `${result.entryCount} entries across ${result.familyCount} collections passed validation.`,
      );
    } catch (caught) {
      setPreview(null);
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setPending(false);
    }
  };

  const commitImport = async () => {
    if (!preview) return;
    clearFeedback();
    setPending(true);
    try {
      const result = await importPromptCatalog({
        sourceName,
        text: catalogText,
        expectedUpdatedAt: store.updatedAt,
      });
      onStoreChange(result.store);
      setNotice(
        result.alreadyImported
          ? "That exact source was already imported; nothing was duplicated."
          : `${result.importedCount} prompts were added to Ready.`,
      );
      setCatalogText("");
      setPreview(null);
      setImportOpen(false);
      setLane("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setPending(false);
    }
  };

  const copyEntry = async (entry: PromptinatorEntry) => {
    clearFeedback();
    setPendingEntryId(entry.id);
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error(
          "Clipboard access is unavailable. The prompt remains in Ready.",
        );
      }
      await navigator.clipboard.writeText(entry.promptText);
      try {
        const updated = await transitionPromptinatorEntry({
          action: "mark-copied",
          entryId: entry.id,
          expectedUpdatedAt: store.updatedAt,
        });
        onStoreChange(updated);
        setNotice(`${entry.name} was copied and moved to In progress.`);
      } catch (caught) {
        throw new Error(
          `The prompt reached the clipboard, but its queue state could not be saved: ${caught instanceof Error ? caught.message : String(caught)}`,
        );
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setPendingEntryId("");
    }
  };

  const requeue = async (entry: PromptinatorEntry) => {
    clearFeedback();
    setPendingEntryId(entry.id);
    try {
      const updated = await transitionPromptinatorEntry({
        action: "requeue",
        entryId: entry.id,
        expectedUpdatedAt: store.updatedAt,
      });
      onStoreChange(updated);
      setNotice(`${entry.name} returned to Ready.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setPendingEntryId("");
    }
  };

  const changeStyle = async (entry: PromptinatorEntry) => {
    clearFeedback();
    setPendingEntryId(entry.id);
    const useProductionV2 = entry.style.id !== "assembler-inspired-v2";
    try {
      const updated = await setPromptinatorEntryStyle({
        entryId: entry.id,
        style: useProductionV2
          ? { id: "assembler-inspired-v2", version: "0.1.0" }
          : { id: "assembler-inspired-v1", version: "0.1.0" },
        expectedUpdatedAt: store.updatedAt,
      });
      onStoreChange(updated);
      setNotice(
        useProductionV2
          ? `${entry.name} now uses the v2 production default.`
          : `${entry.name} now uses the legacy v1 style.`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setPendingEntryId("");
    }
  };

  const reload = async () => {
    clearFeedback();
    setPending(true);
    try {
      await onReload();
      setNotice("Promptinator queue refreshed from local workspace data.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="promptinator">
      <section className="promptinator__queue" aria-label="Prompt queue">
        <header className="promptinator__queue-header">
          <div>
            <p>PROMPT DISPATCH</p>
            <h2>Structured sprite requests</h2>
          </div>
          <div className="promptinator__queue-actions">
            <button
              type="button"
              className="button button--secondary"
              disabled={pending}
              onClick={() => void reload()}
            >
              Refresh queue
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setImportOpen((current) => !current)}
            >
              {importOpen ? "Close import" : "Bulk import"}
            </button>
          </div>
        </header>

        <div className="promptinator__tabs">
          <button
            type="button"
            className={lane === "ready" ? "is-active" : ""}
            onClick={() => setLane("ready")}
          >
            Ready <b>{readyCount}</b>
          </button>
          <button
            type="button"
            className={lane === "in-progress" ? "is-active" : ""}
            onClick={() => setLane("in-progress")}
          >
            In progress <b>{inProgressCount}</b>
          </button>
          <button
            type="button"
            className={lane === "completed" ? "is-active" : ""}
            onClick={() => setLane("completed")}
          >
            Completed <b>{completedCount}</b>
          </button>
        </div>

        {importOpen ? (
          <div className="promptinator__import">
            <label className="promptinator__file">
              <span>Choose one or more catalog TXT files</span>
              <input
                type="file"
                accept=".txt,text/plain"
                multiple
                onChange={(event) => void chooseFiles(event.target.files)}
              />
            </label>
            <label>
              <span>Source name</span>
              <input
                value={sourceName}
                onChange={(event) => {
                  setSourceName(event.target.value);
                  setPreview(null);
                }}
              />
            </label>
            <label>
              <span>Catalog text</span>
              <textarea
                value={catalogText}
                onChange={(event) => {
                  setCatalogText(event.target.value);
                  setPreview(null);
                }}
                placeholder="Paste one or more structured catalogs here."
              />
            </label>
            {preview ? (
              <div className="promptinator__preview">
                <strong>{preview.entryCount} entries validated</strong>
                <span>
                  {preview.familyCount} collections · #{preview.firstOrdinal}–
                  {preview.lastOrdinal}
                </span>
                <small>{preview.sampleNames.join(" · ")}</small>
              </div>
            ) : null}
            <div className="promptinator__import-actions">
              <button
                type="button"
                className="button button--secondary"
                disabled={pending || !catalogText.trim()}
                onClick={() => void validateImport()}
              >
                Validate import
              </button>
              <button
                type="button"
                className="button button--primary"
                disabled={pending || !preview}
                onClick={() => void commitImport()}
              >
                Import to Ready
              </button>
            </div>
          </div>
        ) : null}

        {loadError || error ? (
          <div className="promptinator__feedback promptinator__feedback--error">
            {loadError ?? error}
          </div>
        ) : null}
        {notice ? (
          <div className="promptinator__feedback">{notice}</div>
        ) : null}

        {lane === "ready" && ready.length > 0 ? (
          <button
            type="button"
            className="button button--primary promptinator__copy-next"
            disabled={Boolean(pendingEntryId)}
            onClick={() => void copyEntry(ready[0])}
          >
            Copy next · #{ready[0].ordinal} {ready[0].name}
          </button>
        ) : null}

        <div className="promptinator__entries">
          {visible.map((entry) => (
            <button
              type="button"
              className={selected?.id === entry.id ? "is-selected" : ""}
              onClick={() => setSelectedId(entry.id)}
              key={entry.id}
            >
              <span>#{entry.ordinal} · {entry.family.name}</span>
              <strong>{entry.name}</strong>
              <small>{entry.brief.coreConcept}</small>
              <b>
                {entry.style.id === "assembler-inspired-v2"
                  ? "v2 default"
                  : entry.state === "claimed"
                  ? "claimed"
                  : entry.state === "copied"
                    ? "manual"
                    : entry.state}
              </b>
            </button>
          ))}
          {visible.length === 0 ? (
            <div className="promptinator__empty">
              <strong>{query.trim() ? "No matching prompts" : `${lane} is empty`}</strong>
              <p>
                {lane === "ready"
                  ? "Import a catalog or requeue an in-progress prompt."
                  : lane === "in-progress"
                    ? "Antigravity claims and manually copied prompts remain recoverable here."
                    : "Successful Intake ingestion completes claimed prompts automatically."}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="promptinator__detail" aria-label="Selected prompt">
        {selected ? (
          <>
            <header>
              <div>
                <p>{selected.family.name}</p>
                <h2>{selected.name}</h2>
                <span>{selected.id}</span>
              </div>
              {selected.state === "ready" ? (
                <div className="promptinator__detail-actions">
                  <button
                    type="button"
                    className="button button--secondary"
                    disabled={Boolean(pendingEntryId)}
                    onClick={() => void changeStyle(selected)}
                  >
                    {selected.style.id === "assembler-inspired-v2"
                      ? "Use legacy v1"
                      : "Use v2 default"}
                  </button>
                  <button
                    type="button"
                    className="button button--primary"
                    disabled={Boolean(pendingEntryId)}
                    onClick={() => void copyEntry(selected)}
                  >
                    {pendingEntryId === selected.id
                      ? "Working…"
                      : "Copy & move to In progress"}
                  </button>
                </div>
              ) : ["copied", "claimed"].includes(selected.state) ? (
                <button
                  type="button"
                  className="button button--secondary"
                  disabled={Boolean(pendingEntryId)}
                  onClick={() => void requeue(selected)}
                >
                  Requeue
                </button>
              ) : null}
            </header>

            <div className="promptinator__metadata">
              <div><span>Formula</span><strong>{selected.formulaVersion}</strong></div>
              <div><span>Category</span><strong>{selected.category.id}</strong></div>
              <div><span>Style</span><strong>{selected.style.id}@{selected.style.version}</strong></div>
              <div><span>Imported</span><strong>{formatDate(selected.importedAt)}</strong></div>
              {selected.claim ? (
                <div><span>Claimed</span><strong>{formatDate(selected.claim.claimedAt)}</strong></div>
              ) : null}
              {selected.completion ? (
                <div><span>Completed</span><strong>{formatDate(selected.completion.completedAt)}</strong></div>
              ) : null}
              <div><span>History</span><strong>{selected.history.length} events</strong></div>
            </div>
            {selected.claim ? (
              <div className="promptinator__provenance">
                <span>Active claim</span>
                <strong>{selected.claim.id}</strong>
                <small>{selected.claim.claimant} · expected asset {selected.claim.expectedAssetId}</small>
              </div>
            ) : null}
            {selected.completion ? (
              <div className="promptinator__provenance">
                <span>Completed Intake handoff</span>
                <strong>{selected.completion.assetId}/{selected.completion.revisionId}</strong>
                <small>The original prompt is stored on that immutable sprite revision.</small>
              </div>
            ) : null}
            <div className="promptinator__brief">
              <p>{selected.family.description}</p>
              <dl>
                <div><dt>Silhouette</dt><dd>{selected.brief.bodyAndSilhouette}</dd></div>
                <div><dt>Features</dt><dd>{selected.brief.signatureFeatures}</dd></div>
                <div><dt>Movement</dt><dd>{selected.brief.movementPersonality}</dd></div>
                <div><dt>Attack</dt><dd>{selected.brief.attackConcept}</dd></div>
                <div><dt>Avoid</dt><dd>{selected.brief.avoid}</dd></div>
              </dl>
            </div>
            <pre className="promptinator__prompt">{selected.promptText}</pre>
          </>
        ) : (
          <div className="empty-state">
            <span className="empty-state__glyph">+</span>
            <h2>No prompt selected</h2>
            <p>Import a structured catalog to begin.</p>
          </div>
        )}
      </section>
    </div>
  );
}
