import { describe, expect, it } from "vitest";
import {
  hasRevisionNotePreset,
  revisionNotePresetGroups,
  toggleRevisionNotePreset,
} from "../src/domain/revision-note-presets";

const presets = revisionNotePresetGroups.flatMap((group) => group.presets);

describe("revision note presets", () => {
  it("includes the common issues requested for revision feedback", () => {
    expect(presets.map((preset) => preset.label)).toEqual(
      expect.arrayContaining([
        "Not readable",
        "Doesn't look like anything",
        "Bad outline",
        "Bad animation",
        "Front/back differ from sides",
        "Key feature missing/hidden",
        "Body too chunky",
        "Face/eyes misaligned",
      ]),
    );
  });

  it("adds multiple presets as normal editable note lines", () => {
    const first = presets[0].text;
    const second = presets[1].text;
    const combined = toggleRevisionNotePreset(
      toggleRevisionNotePreset("", first),
      second,
    );

    expect(combined).toBe(`${first}\n${second}`);
    expect(hasRevisionNotePreset(combined, first)).toBe(true);
    expect(hasRevisionNotePreset(combined, second)).toBe(true);
  });

  it("toggles one preset off without removing free-form feedback", () => {
    const preset = presets[0].text;
    const note = `Keep the horns asymmetrical.\n${preset}`;

    expect(toggleRevisionNotePreset(note, preset)).toBe(
      "Keep the horns asymmetrical.",
    );
  });

  it("does not mark an edited preset sentence as selected", () => {
    const preset = presets[0].text;
    const edited = preset.replace("at 1x", "in the walk animation at 1x");

    expect(hasRevisionNotePreset(edited, preset)).toBe(false);
  });
});
