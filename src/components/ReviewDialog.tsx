import { useEffect, useState } from "react";
import type { ReviewNoteDraft } from "../data/library";
import {
  hasRevisionNotePreset,
  revisionNotePresetGroups,
  toggleRevisionNotePreset,
} from "../domain/revision-note-presets";
import type { ViewerAsset } from "../domain/types";

export type ReviewDialogMode =
  | "approve"
  | "send-to-revise"
  | "add-note"
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
  mode === "send-to-revise" ||
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
    case "send-to-revise":
      return {
        eyebrow: "REVISION DECISION",
        title: "Send this candidate to Revise",
        description:
          "Add a practical note for the next creator-agent pass. You can add more notes later from Revise.",
        submit: "Send to Revise",
      };
    case "add-note":
      return {
        eyebrow: "REVISION NOTE",
        title: "Add another revision note",
        description:
          "Keep the note short and visible. Optional targets make animation-specific feedback easier to process later.",
        submit: "Add note",
      };
    case "start-revision":
      return {
        eyebrow: "NEW WORKING REVISION",
        title: "Start a revision from this Library version",
        description:
          "The approved revision stays selected in the Library. This creates a Revise workspace against the same immutable base until Antigravity returns a new candidate.",
        submit: "Start revision",
      };
    case "archive":
      return {
        eyebrow: "REVISION STORAGE",
        title: "Archive this working candidate?",
        description:
          "Archive is recoverable secondary storage. Existing notes and any separately approved Library revision remain untouched.",
        submit: "Archive candidate",
      };
    case "restore":
      return {
        eyebrow: "REVISION STORAGE",
        title: "Restore this candidate to Revise?",
        description:
          "The candidate and its existing notes will return to the Revise queue.",
        submit: "Restore to Revise",
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
            <div className="revision-presets">
              <div className="revision-presets__heading">
                <span>Quick issues</span>
                <small>Choose any that apply, then edit the note freely.</small>
              </div>
              {revisionNotePresetGroups.map((group) => (
                <section key={group.label}>
                  <span>{group.label}</span>
                  <div className="revision-presets__buttons">
                    {group.presets.map((preset) => {
                      const selected = hasRevisionNotePreset(text, preset.text);
                      return (
                        <button
                          type="button"
                          className={selected ? "is-selected" : undefined}
                          aria-pressed={selected}
                          title={preset.text}
                          disabled={busy}
                          onClick={() =>
                            setText((currentText) =>
                              toggleRevisionNotePreset(
                                currentText,
                                preset.text,
                              ),
                            )
                          }
                          key={preset.label}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

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
