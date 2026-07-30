import { useEffect, useState } from "react";
import type { RevisionBatchEntry } from "../data/library";

const formatCreatedAt = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export function RevisionBatchesView({
  batches,
}: {
  batches: RevisionBatchEntry[];
}) {
  const [selectedId, setSelectedId] = useState(batches[0]?.batch.id ?? "");
  const [copied, setCopied] = useState(false);
  const selected =
    batches.find((entry) => entry.batch.id === selectedId) ??
    batches[0] ??
    null;

  useEffect(() => {
    if (batches.length === 0) {
      setSelectedId("");
    } else if (!batches.some((entry) => entry.batch.id === selectedId)) {
      setSelectedId(batches[0].batch.id);
    }
  }, [batches, selectedId]);

  useEffect(() => {
    setCopied(false);
  }, [selectedId]);

  if (!selected) {
    return (
      <div className="empty-state">
        <span className="empty-state__glyph">+</span>
        <h2>No revision batches yet</h2>
        <p>Select one or more candidates in Revise to generate the first brief.</p>
      </div>
    );
  }

  const copyBrief = async () => {
    await navigator.clipboard.writeText(selected.brief);
    setCopied(true);
  };

  return (
    <div className="batches-layout">
      <section className="batch-list" aria-label="Revision batches">
        <div className="column-heading">
          <div>
            <span className="column-heading__bar" />
            <strong>NEWEST FIRST</strong>
          </div>
          <b>{batches.length}</b>
        </div>
        {batches.map((entry) => (
          <button
            type="button"
            className={
              entry.batch.id === selected.batch.id ? "is-selected" : ""
            }
            onClick={() => setSelectedId(entry.batch.id)}
            key={entry.batch.id}
          >
            <span>REVISION</span>
            <strong>{entry.batch.id}</strong>
            <small>{formatCreatedAt(entry.batch.createdAt)}</small>
            <b>
              {entry.batch.items.length} item
              {entry.batch.items.length === 1 ? "" : "s"}
            </b>
          </button>
        ))}
      </section>

      <section className="batch-detail" aria-label="Selected batch brief">
        <header>
          <div>
            <p>REVISION BATCH</p>
            <h2>{selected.batch.id}</h2>
            <span>{selected.relativeDirectory}</span>
          </div>
          <button
            type="button"
            className="button button--primary"
            onClick={() => void copyBrief()}
          >
            {copied ? "Copied" : "Copy Antigravity brief"}
          </button>
        </header>

        <div className="batch-summary">
          <div>
            <span>Created</span>
            <strong>{formatCreatedAt(selected.batch.createdAt)}</strong>
          </div>
          <div>
            <span>Items</span>
            <strong>{selected.batch.items.length}</strong>
          </div>
          <div>
            <span>Type</span>
            <strong>Revision</strong>
          </div>
        </div>

        <div className="batch-item-list">
          {selected.batch.items.map((item) => (
            <article key={`${item.assetId}-${item.baseRevisionId}`}>
              <div>
                <strong>{item.assetId}</strong>
                <small>{item.notes.length} note{item.notes.length === 1 ? "" : "s"}</small>
              </div>
              <b>{item.baseRevisionId}</b>
            </article>
          ))}
        </div>

        <pre className="batch-brief">{selected.brief}</pre>
      </section>
    </div>
  );
}
