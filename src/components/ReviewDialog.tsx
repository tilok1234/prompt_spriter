import { useEffect, useState } from "react";
import type { ReviewNoteDraft } from "../data/library";
import type { ViewerAsset } from "../domain/types";

export type ReviewDialogMode =
  | "approve"
  | "add-note"
  | "deny"
  | "reopen"
  | "start-revision"
  | "archive"
  | "restore";

interface ReviewDialogProps {
  mode: ReviewDialogMode;
  item: ViewerAsset;
  currentDirection: string;
  currentAnimation: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (note?: ReviewNoteDraft) => void;
}

const needsNote = (mode: ReviewDialogMode) =>
  mode === "add-note" ||
  mode === "start-revision";

const dialogCopy = (mode: ReviewDialogMode) => {
  switch (mode) {
    case "approve":
      return {
        eyebrow: "LIBRARY DECISION",
        title: "Approve this exact revision?",
        description:
          "This selects the revision for the Library and clears it from Intake. Its immutable files will not move or change.",
        submit: "Approve revision",
      };
    case "add-note":
      return {
        eyebrow: "REVISION NOTE",
        title: "Request a revision",
        description:
          "The candidate stays in Intake but cannot be approved while this note is unresolved. Optional targets make feedback easier to process.",
        submit: "Add revision note",
      };
    case "deny":
      return {
        eyebrow: "CANDIDATE DECISION",
        title: "Move this candidate to Denied?",
        description:
          "Denied is a dormant, recoverable lane. You can return the candidate to Intake or move it to Archive later.",
        submit: "Deny candidate",
      };
    case "reopen":
      return {
        eyebrow: "CANDIDATE RECOVERY",
        title: "Return this candidate to Intake?",
        description:
          "The candidate and all its notes will become active again. Unresolved notes will continue to block approval.",
        submit: "Return to Intake",
      };
    case "start-revision":
      return {
        eyebrow: "NEW WORKING REVISION",
        title: "Start a revision from this Library version",
        description:
          "The approved revision stays selected in the Library. This creates an Intake candidate with an unresolved note against the same immutable base until Antigravity returns a new candidate.",
        submit: "Start revision",
      };
    case "archive":
      return {
        eyebrow: "REVISION STORAGE",
        title: "Archive this denied candidate?",
        description:
          "Archive is recoverable cold storage. Existing notes and any separately approved Library revision remain untouched.",
        submit: "Archive candidate",
      };
    case "restore":
      return {
        eyebrow: "REVISION STORAGE",
        title: "Restore this candidate to Denied?",
        description:
          "The candidate and its existing notes will return to Denied, where you can reopen it into Intake if wanted.",
        submit: "Restore to Denied",
      };
  }
};

const parseFrames = (value: string, maximum: number) => {
  const normalized = value.trim();
  if (!normalized) return [];
  const frames = normalized.split(",").map((token) => Number(token.trim()));
  if (
    frames.some(
      (frame) =>
        !Number.isInteger(frame) || frame < 1 || frame > maximum,
    )
  ) {
    throw new Error(`Frames must be comma-separated numbers from 1 to ${maximum}.`);
  }
  return [...new Set(frames)].sort((left, right) => left - right);
};

export function ReviewDialog({
  mode,
  item,
  currentDirection,
  currentAnimation,
  busy,
  error,
  onClose,
  onSubmit,
}: ReviewDialogProps) {
  const copy = dialogCopy(mode);
  const [text, setText] = useState("");
  const [direction, setDirection] = useState("");
  const [animation, setAnimation] = useState("");
  const [frames, setFrames] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const selectedAnimation = item.revision.animations.find(
    (candidate) => candidate.id === animation,
  );

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [busy, onClose]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    if (!needsNote(mode)) {
      onSubmit();
      return;
    }

    const trimmedText = text.trim();
    if (!trimmedText) {
      setLocalError("Write the change you want before continuing.");
      return;
    }

    try {
      if (frames.trim() && !selectedAnimation) {
        throw new Error("Select an animation before targeting frames.");
      }
      const parsedFrames = selectedAnimation
        ? parseFrames(frames, selectedAnimation.frames)
        : [];
      onSubmit({
        text: trimmedText,
        target: {
          ...(direction ? { direction } : {}),
          ...(animation ? { animation } : {}),
          ...(parsedFrames.length > 0 ? { frames: parsedFrames } : {}),
        },
      });
    } catch (submissionError) {
      setLocalError(
        submissionError instanceof Error
          ? submissionError.message
          : String(submissionError),
      );
    }
  };

  return (
    <div className="dialog-backdrop">
      <form
        className="review-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-dialog-title"
        onSubmit={submit}
      >
        <div className="review-dialog__header">
          <div>
            <p>{copy.eyebrow}</p>
            <h2 id="review-dialog-title">{copy.title}</h2>
          </div>
          <button
            type="button"
            className="dialog-close"
            aria-label="Close review dialog"
            onClick={onClose}
            disabled={busy}
          >
            ×
          </button>
        </div>

        <div className="decision-target">
          <div>
            <span>{item.asset.name}</span>
            <strong>{item.asset.id}</strong>
          </div>
          <b>{item.revision.id}</b>
        </div>
        <p className="review-dialog__description">{copy.description}</p>

        {needsNote(mode) ? (
          <div className="note-fields">
            <label>
              <span>What should change?</span>
              <textarea
                autoFocus
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Example: Make the mane larger in every direction and give the walk more body weight."
                maxLength={4000}
              />
            </label>

            <div className="note-fields__heading">
              <span>Optional target</span>
              <button
                type="button"
                onClick={() => {
                  setDirection(currentDirection);
                  setAnimation(currentAnimation);
                  setFrames("");
                }}
              >
                Use current view
              </button>
            </div>
            <div className="note-target-grid">
              <label>
                <span>Direction</span>
                <select
                  value={direction}
                  onChange={(event) => setDirection(event.target.value)}
                >
                  <option value="">All directions</option>
                  {item.revision.directions.map((candidate) => (
                    <option value={candidate} key={candidate}>
                      {candidate}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Animation</span>
                <select
                  value={animation}
                  onChange={(event) => {
                    setAnimation(event.target.value);
                    setFrames("");
                  }}
                >
                  <option value="">All animations</option>
                  {item.revision.animations.map((candidate) => (
                    <option value={candidate.id} key={candidate.id}>
                      {candidate.id}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Frames</span>
                <input
                  value={frames}
                  onChange={(event) => setFrames(event.target.value)}
                  placeholder={selectedAnimation ? "1, 3" : "Select animation"}
                  disabled={!selectedAnimation}
                />
              </label>
            </div>
          </div>
        ) : null}

        {mode === "approve" ? (
          <div className="decision-facts">
            <span>Validation</span>
            <strong>{item.validation.status}</strong>
            <span>Exact revision</span>
            <strong>{item.revision.id}</strong>
          </div>
        ) : null}

        {localError || error ? (
          <p className="dialog-error" role="alert">
            {localError || error}
          </p>
        ) : null}

        <div className="review-dialog__actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="button button--primary"
            disabled={busy}
          >
            {busy ? "Saving…" : copy.submit}
          </button>
        </div>
      </form>
    </div>
  );
}
