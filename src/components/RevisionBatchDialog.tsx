import { useMemo, useState, type FormEvent } from "react";
import type {
  RevisionBatchEntry,
} from "../data/library";
import type { ViewerAsset } from "../domain/types";

const suggestedBatchId = () => {
  const date = new Date();
  const part = (value: number) => String(value).padStart(2, "0");
  return `revision-batch-${date.getFullYear()}${part(
    date.getMonth() + 1,
  )}${part(date.getDate())}-${part(date.getHours())}${part(
    date.getMinutes(),
  )}`;
};

interface RevisionBatchDialogProps {
  items: ViewerAsset[];
  created: RevisionBatchEntry | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (batchId: string) => void;
}

export function RevisionBatchDialog({
  items,
  created,
  busy,
  error,
  onClose,
  onSubmit,
}: RevisionBatchDialogProps) {
  const [batchId, setBatchId] = useState(suggestedBatchId);
  const [copied, setCopied] = useState(false);
  const sortedItems = useMemo(
    () =>
      [...items].sort((left, right) =>
        left.asset.id.localeCompare(right.asset.id),
      ),
    [items],
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(batchId.trim());
  };

  const copyBrief = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(created.brief);
    setCopied(true);
  };

  return (
    <div className="dialog-backdrop">
      <form
        className="review-dialog batch-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-dialog-title"
        onSubmit={submit}
      >
        <div className="review-dialog__header">
          <div>
            <p>REVISION DISPATCH</p>
            <h2 id="batch-dialog-title">
              {created ? "Revision batch ready" : "Create revision batch"}
            </h2>
          </div>
          <button
            type="button"
            className="dialog-close"
            aria-label="Close batch dialog"
            onClick={onClose}
            disabled={busy}
          >
            ×
          </button>
        </div>

        {created ? (
          <>
            <div className="batch-created">
              <strong>{created.batch.id}</strong>
              <span>{created.relativeDirectory}</span>
              <p>
                The batch snapshots {created.batch.items.length} exact Revise
                candidate{created.batch.items.length === 1 ? "" : "s"}. Their
                review state has not changed.
              </p>
            </div>
            <label className="batch-brief-preview">
              <span>Antigravity brief</span>
              <textarea value={created.brief} readOnly />
            </label>
          </>
        ) : (
          <>
            <p className="review-dialog__description">
              This creates durable batch metadata and one copy-ready
              Antigravity brief. It does not move, archive, approve, or resolve
              any selected item.
            </p>
            <label className="batch-id-field">
              <span>Batch ID</span>
              <input
                autoFocus
                value={batchId}
                onChange={(event) => setBatchId(event.target.value)}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                maxLength={100}
                required
              />
            </label>
            <div className="batch-dialog__items">
              <span>Selected Revise candidates</span>
              {sortedItems.map((item) => (
                <article key={`${item.asset.id}-${item.revision.id}`}>
                  <div>
                    <strong>{item.asset.name}</strong>
                    <small>{item.asset.id}</small>
                  </div>
                  <b>{item.revision.id}</b>
                  <span>
                    {
                      item.review.notes.filter(
                        (note) => note.resolvedAt === null,
                      ).length
                    }{" "}
                    open note
                    {item.review.notes.filter(
                      (note) => note.resolvedAt === null,
                    ).length === 1
                      ? ""
                      : "s"}
                  </span>
                </article>
              ))}
            </div>
          </>
        )}

        {error ? (
          <p className="dialog-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="review-dialog__actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={onClose}
            disabled={busy}
          >
            {created ? "Close" : "Cancel"}
          </button>
          {created ? (
            <button
              type="button"
              className="button button--primary"
              onClick={() => void copyBrief()}
            >
              {copied ? "Copied" : "Copy brief"}
            </button>
          ) : (
            <button
              type="submit"
              className="button button--primary"
              disabled={busy || items.length === 0}
            >
              {busy ? "Creating…" : "Create batch"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
