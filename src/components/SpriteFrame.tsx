import { getFrameCell } from "../domain/sprite-layout";
import type { RevisionRecord } from "../domain/types";

interface SpriteFrameProps {
  revision: RevisionRecord;
  sheetUrl: string;
  direction: string;
  animation: string;
  frameIndex: number;
  scale: number;
  className?: string;
  label?: string;
}

export function SpriteFrame({
  revision,
  sheetUrl,
  direction,
  animation,
  frameIndex,
  scale,
  className = "",
  label,
}: SpriteFrameProps) {
  const cell = getFrameCell(
    revision,
    direction,
    animation,
    frameIndex,
  );
  const width = revision.sheet.cellWidth * scale;
  const height = revision.sheet.cellHeight * scale;

  return (
    <div
      className={`sprite-frame ${className}`}
      role="img"
      aria-label={
        label ??
        `${direction} ${animation}, frame ${frameIndex + 1}`
      }
      data-direction={direction}
      data-animation={animation}
      data-frame={frameIndex}
      style={{
        width,
        height,
        backgroundImage: `url("${sheetUrl}")`,
        backgroundSize: `${revision.sheet.width * scale}px ${
          revision.sheet.height * scale
        }px`,
        backgroundPosition: `${-cell.column * width}px ${-cell.row * height}px`,
      }}
    />
  );
}

