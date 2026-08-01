interface IconProps {
  name:
    | "archive"
    | "batch"
    | "category"
    | "chevron"
    | "grid"
    | "intake"
    | "library"
    | "pause"
    | "play"
    | "prompt"
    | "revise"
    | "search"
    | "step";
}

const paths: Record<IconProps["name"], string> = {
  intake: "M4 5h16v14H4z M8 9h8 M8 13h5",
  revise: "M5 18l2-4L17 4l3 3L10 17z M13 6l3 3",
  library: "M5 4h14v16H5z M8 4v16 M11 8h5 M11 12h5",
  archive: "M4 7h16v13H4z M3 4h18v4H3z M9 11h6",
  category: "M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z",
  batch: "M6 5h14v14H6z M3 8v12h14",
  prompt: "M5 4h14v16H5z M8 8h8 M8 12h8 M8 16h5",
  search: "M10.5 4a6.5 6.5 0 110 13 6.5 6.5 0 010-13z M15 15l5 5",
  play: "M8 5l11 7-11 7z",
  pause: "M7 5h4v14H7z M14 5h4v14h-4z",
  step: "M6 5l9 7-9 7z M17 5h2v14h-2z",
  grid: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  chevron: "M9 5l7 7-7 7",
};

export function Icon({ name }: IconProps) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      <path d={paths[name]} />
    </svg>
  );
}

