import type { RevisionRecord } from "./types";

export interface FrameCell {
  column: number;
  row: number;
}

export const getFrameCell = (
  revision: RevisionRecord,
  directionId: string,
  animationId: string,
  frameIndex: number,
): FrameCell => {
  const row = revision.directions.indexOf(directionId);
  if (row < 0) {
    throw new Error(`Unknown direction: ${directionId}`);
  }

  const animation = revision.animations.find(
    (candidate) => candidate.id === animationId,
  );
  if (!animation) {
    throw new Error(`Unknown animation: ${animationId}`);
  }
  if (frameIndex < 0 || frameIndex >= animation.frames) {
    throw new Error(
      `Frame ${frameIndex} is outside ${animationId} (0-${animation.frames - 1})`,
    );
  }

  return {
    column: animation.startColumn + frameIndex,
    row,
  };
};

export const assertContiguousLayout = (revision: RevisionRecord): void => {
  let nextColumn = 0;
  for (const animation of revision.animations) {
    if (animation.startColumn !== nextColumn) {
      throw new Error(
        `${animation.id} starts at column ${animation.startColumn}; expected ${nextColumn}`,
      );
    }
    nextColumn += animation.frames;
  }

  if (nextColumn !== revision.sheet.columns) {
    throw new Error(
      `Animations occupy ${nextColumn} columns; sheet declares ${revision.sheet.columns}`,
    );
  }
};

