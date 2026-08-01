export interface RevisionNotePreset {
  label: string;
  text: string;
}

export interface RevisionNotePresetGroup {
  label: string;
  presets: RevisionNotePreset[];
}

export const revisionNotePresetGroups: RevisionNotePresetGroup[] = [
  {
    label: "Readability & concept",
    presets: [
      {
        label: "Not readable",
        text: "The sprite is not readable at 1x; strengthen the silhouette, focal feature, and major value groups.",
      },
      {
        label: "Doesn't look like anything",
        text: "The sprite does not resemble a recognizable creature or object; rebuild the defining silhouette and focal feature.",
      },
      {
        label: "Doesn't match the brief",
        text: "The result does not match the requested subject or concept; restore the defining anatomy, materials, and signature features from the brief.",
      },
      {
        label: "Silhouette too generic",
        text: "The silhouette is too generic; exaggerate the subject's most distinctive body shape and identifying feature.",
      },
      {
        label: "Key feature missing/hidden",
        text: "The defining feature is missing or hidden in one or more directions; make it visible, attached, and recognizable at 1x.",
      },
      {
        label: "Body too chunky",
        text: "The body is too chunky and its parts merge together; separate the head or core, torso, supports, and defining feature into readable masses.",
      },
    ],
  },
  {
    label: "Direction & anatomy",
    presets: [
      {
        label: "Front/back differ from sides",
        text: "The front and back views do not look like the same creature as the side views; unify the proportions, body plan, and identifying features.",
      },
      {
        label: "Directions don't match",
        text: "The four directions are inconsistent; reconstruct them under one camera, scale, ground plane, and shared anatomy.",
      },
      {
        label: "Body plan changes",
        text: "The body plan changes between directions; preserve the same torso, supports, head placement, and locomotion anatomy in every view.",
      },
      {
        label: "Features don't rotate",
        text: "Directional features do not rotate correctly; move, hide, trail, or layer each feature according to the creature's facing direction.",
      },
      {
        label: "Asymmetry flips sides",
        text: "An asymmetrical feature changes anatomical sides between views; keep it attached to the same side through every direction.",
      },
      {
        label: "Parts look detached",
        text: "Limbs or features look detached from the body; reconnect them with clear overlap, joints, and correct front-to-back layering.",
      },
      {
        label: "Face/eyes misaligned",
        text: "The face or eyes are misaligned between directions; place the focal features consistently on the same head volume as the creature turns.",
      },
    ],
  },
  {
    label: "Pixel art & style",
    presets: [
      {
        label: "Bad outline",
        text: "The outline is too heavy, broken, or noisy; simplify it and use dark pixels only where they clarify the silhouette or separate forms.",
      },
      {
        label: "Weak colors / contrast",
        text: "The palette lacks useful value separation; strengthen contrast between the silhouette, materials, and focal details.",
      },
      {
        label: "Too noisy",
        text: "The sprite has too much low-impact pixel noise; remove scattered details and reinforce larger readable clusters.",
      },
      {
        label: "Style mismatch",
        text: "The sprite does not fit the required style profile; correct the palette, contour treatment, detail density, and shape language.",
      },
    ],
  },
  {
    label: "Animation & action",
    presets: [
      {
        label: "Bad animation",
        text: "The animation does not read as intentional movement; rebuild the key poses, spacing, and recovery while preserving the creature's volume.",
      },
      {
        label: "Too little pose change",
        text: "The frames show too little pose change; redraw meaningful body and limb motion instead of shifting or repeating the same sprite.",
      },
      {
        label: "Attack unclear",
        text: "The attack is not readable; add a clear anticipation, active strike or release, and recovery led by the creature's body.",
      },
      {
        label: "Effects hide the body",
        text: "The effects overpower or hide the creature; reduce them and keep the body pose readable throughout the action.",
      },
    ],
  },
  {
    label: "Scale & framing",
    presets: [
      {
        label: "Too small in the cell",
        text: "The creature is too small in its 32x32 cell; enlarge the useful silhouette while keeping safe transparent margins.",
      },
      {
        label: "Too large / cramped",
        text: "The creature is too large or cramped in the cell; reduce or reposition it so the motion has comfortable breathing room.",
      },
      {
        label: "Touches or clips the edge",
        text: "Opaque pixels touch or clip the cell boundary; shorten or shift the body and effects fully inside the frame.",
      },
    ],
  },
];

export const hasRevisionNotePreset = (
  currentText: string,
  presetText: string,
) =>
  currentText
    .split(/\r?\n/)
    .some((line) => line.trim() === presetText);

export const toggleRevisionNotePreset = (
  currentText: string,
  presetText: string,
) => {
  if (!hasRevisionNotePreset(currentText, presetText)) {
    if (!currentText.trim()) return presetText;
    return `${currentText}${currentText.endsWith("\n") ? "" : "\n"}${presetText}`;
  }

  return currentText
    .split(/\r?\n/)
    .filter((line) => line.trim() !== presetText)
    .join("\n")
    .replace(/^\n+|\n+$/g, "");
};
