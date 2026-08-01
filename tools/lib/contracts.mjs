import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, isAbsolute, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { PNG } from "pngjs";

const libraryDirectory = dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = dirname(dirname(libraryDirectory));
const schemasDirectory = join(repositoryRoot, "schemas");

export const migrateReviewRecord = (record) => {
  if (!record || record.kind !== "review") return record;

  if (
    record.schemaVersion !== "1.0.0" &&
    record.schemaVersion !== "1.1.0"
  ) {
    return record;
  }

  const currentLane = record.candidate?.lane;
  const hasUnresolvedNotes = record.notes?.some(
    (note) => note.resolvedAt === null,
  );
  const projectedLane =
    currentLane === "denied" ||
    (currentLane === "intake" && hasUnresolvedNotes)
      ? "revise"
      : currentLane;

  return {
    ...record,
    schemaVersion: "1.2.0",
    candidate:
      record.candidate === null
        ? null
        : record.candidate
          ? {
              ...record.candidate,
              lane: projectedLane,
            }
          : record.candidate,
  };
};

const readJson = (path) =>
  migrateReviewRecord(JSON.parse(readFileSync(path, "utf8")));

const schemaFiles = [
  "category.schema.json",
  "style-profile.schema.json",
  "asset.schema.json",
  "revision.schema.json",
  "review.schema.json",
  "submission.schema.json",
  "validation.schema.json",
  "completion.schema.json",
  "batch.schema.json",
  "promptinator.schema.json",
];

const schemaForKind = {
  "category-contract": "category.schema.json",
  "style-profile": "style-profile.schema.json",
  asset: "asset.schema.json",
  revision: "revision.schema.json",
  review: "review.schema.json",
  "agent-submission": "submission.schema.json",
  "validation-report": "validation.schema.json",
  "completion-marker": "completion.schema.json",
  batch: "batch.schema.json",
  "promptinator-store": "promptinator.schema.json",
};

export const createContractValidator = () => {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
  });
  addFormats(ajv);

  const commonSchema = readJson(join(schemasDirectory, "common.schema.json"));
  ajv.addSchema(commonSchema);

  for (const schemaFile of schemaFiles) {
    ajv.addSchema(readJson(join(schemasDirectory, schemaFile)));
  }

  return ajv;
};

const describeAjvErrors = (errors = []) =>
  errors.map((error) => {
    const location = error.instancePath || "/";
    return `${location} ${error.message ?? "is invalid"}`;
  });

export const validateRecord = (ajv, record, label) => {
  const schemaFile = schemaForKind[record.kind];
  if (!schemaFile) {
    return [`${label}: unknown record kind "${String(record.kind)}"`];
  }

  const schemaId = `https://prompt-spriter.local/schemas/${schemaFile}`;
  const validate = ajv.getSchema(schemaId);
  if (!validate) {
    return [`${label}: schema was not registered: ${schemaFile}`];
  }

  if (validate(record)) {
    return [];
  }

  return describeAjvErrors(validate.errors).map(
    (message) => `${label}: ${message}`,
  );
};

export const validateCategorySemantics = (category, label) => {
  const failures = [];

  category.directions.forEach((direction, index) => {
    if (direction.row !== index) {
      failures.push(
        `${label}: direction ${direction.id} row ${direction.row} should be ${index}`,
      );
    }
  });

  let nextColumn = 0;
  for (const animation of category.animations) {
    if (animation.startColumn !== nextColumn) {
      failures.push(
        `${label}: ${animation.id} starts at ${animation.startColumn}; expected ${nextColumn}`,
      );
    }
    nextColumn += animation.frames;
  }

  if (nextColumn !== category.timeline.framesPerDirection) {
    failures.push(
      `${label}: animation columns total ${nextColumn}; timeline declares ${category.timeline.framesPerDirection}`,
    );
  }

  const expectedTotal = nextColumn * category.directions.length;
  if (expectedTotal !== category.timeline.totalFrames) {
    failures.push(
      `${label}: expected ${expectedTotal} total frames; timeline declares ${category.timeline.totalFrames}`,
    );
  }

  if (
    category.sheet.width !== category.sheet.columns * category.sheet.cellWidth ||
    category.sheet.height !== category.sheet.rows * category.sheet.cellHeight
  ) {
    failures.push(`${label}: canonical sheet dimensions do not match its grid`);
  }

  const animationsById = new Map(
    category.animations.map((animation) => [animation.id, animation]),
  );
  const sliceColumns = category.firstVerticalSlice.animations.reduce(
    (total, animationId) => {
      const animation = animationsById.get(animationId);
      if (!animation) {
        failures.push(
          `${label}: first vertical slice references unknown animation ${animationId}`,
        );
        return total;
      }
      return total + animation.frames;
    },
    0,
  );

  if (sliceColumns !== category.firstVerticalSlice.columns) {
    failures.push(
      `${label}: first vertical slice totals ${sliceColumns} columns; declares ${category.firstVerticalSlice.columns}`,
    );
  }

  const slice = category.firstVerticalSlice;
  if (
    slice.sheetWidth !== slice.columns * category.frame.width ||
    slice.sheetHeight !== slice.rows * category.frame.height ||
    slice.totalFrames !== slice.columns * slice.rows
  ) {
    failures.push(`${label}: first vertical slice dimensions are inconsistent`);
  }

  if (
    category.validation.minOccupiedWidth > category.frame.width ||
    category.validation.minOccupiedHeight > category.frame.height
  ) {
    failures.push(`${label}: minimum occupied footprint exceeds the frame size`);
  }
  for (const [animationId, minimum] of Object.entries(
    category.validation.minimumDistinctFramesPerDirection,
  )) {
    const animation = animationsById.get(animationId);
    if (!animation || minimum > animation.frames) {
      failures.push(
        `${label}: ${animationId} distinct-frame minimum exceeds its animation length`,
      );
    }
  }

  const walkFrames = animationsById.get("walk")?.frames ?? 0;
  const anatomyMotion = category.validation.anatomyMotion;
  if (anatomyMotion) {
    if (anatomyMotion.alignmentShiftPx > 4) {
      failures.push(
        `${label}: anatomy-motion alignment shift must stay within 0-4 pixels`,
      );
    }
    if (anatomyMotion.minWalkFramesMeetingResidual > walkFrames) {
      failures.push(
        `${label}: anatomy-motion walk frame requirement exceeds the walk animation length`,
      );
    }
  }
  const groundContact = category.validation.groundContact;
  if (groundContact) {
    if (groundContact.groundedMinBottomRow >= category.frame.height) {
      failures.push(
        `${label}: ground-contact grounded row threshold exceeds the frame height`,
      );
    }
    if (groundContact.minWalkFramesOnBaselineRow > walkFrames) {
      failures.push(
        `${label}: ground-contact walk frame requirement exceeds the walk animation length`,
      );
    }
  }
  const attackReadability = category.validation.attackReadability;
  if (attackReadability) {
    if (attackReadability.alignmentShiftPx > 4) {
      failures.push(
        `${label}: attack-readability alignment shift must stay within 0-4 pixels`,
      );
    }
    const attackFrames = animationsById.get("attack")?.frames ?? 0;
    if (attackReadability.minAttackFramesMeetingResidual > attackFrames) {
      failures.push(
        `${label}: attack-readability frame requirement exceeds the attack animation length`,
      );
    }
  }

  return failures;
};

export const validateStyleSemantics = (style, label) => {
  const failures = [];
  const color = style.color;

  if (
    color.recommendedOpaqueColorsMin > color.recommendedOpaqueColorsMax ||
    color.recommendedOpaqueColorsMax > color.maximumOpaqueColors
  ) {
    failures.push(`${label}: opaque color thresholds are not ordered`);
  }

  if (!style.reviewScales.includes(1)) {
    failures.push(`${label}: native 1x review scale is required`);
  }

  for (const reference of style.references) {
    if (reference.access !== "read-only") {
      failures.push(`${label}: every external style reference must be read-only`);
    }
  }

  return failures;
};

export const readStyleProfiles = (
  stylesRoot = join(repositoryRoot, "styles"),
) =>
  readdirSync(stylesRoot, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(join(stylesRoot, entry.name, "style.json")),
    )
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => readJson(join(stylesRoot, entry.name, "style.json")));

export const isSafeRelativePath = (value) => {
  if (typeof value !== "string" || value.length === 0 || isAbsolute(value)) {
    return false;
  }

  const normalized = normalize(value);
  return (
    normalized !== ".." &&
    !normalized.startsWith(`..\\`) &&
    !normalized.startsWith("../")
  );
};

const assertPathInside = (root, path) => {
  const resolvedRoot = resolve(root);
  const resolvedPath = resolve(root, path);
  const pathFromRoot = relative(resolvedRoot, resolvedPath);
  return (
    pathFromRoot !== ".." &&
    !pathFromRoot.startsWith(`..\\`) &&
    !pathFromRoot.startsWith("../") &&
    !isAbsolute(pathFromRoot)
  );
};

const bestShiftResidual = (reference, candidate, width, height, maxShift) => {
  let best = Infinity;
  for (let dy = -maxShift; dy <= maxShift && best > 0; dy += 1) {
    for (let dx = -maxShift; dx <= maxShift && best > 0; dx += 1) {
      let differing = 0;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const targetIndex = (y * width + x) * 4;
          const sourceX = x - dx;
          const sourceY = y - dy;
          const inside =
            sourceX >= 0 && sourceX < width && sourceY >= 0 && sourceY < height;
          const sourceIndex = (sourceY * width + sourceX) * 4;
          for (let channel = 0; channel < 4; channel += 1) {
            const sourceValue = inside ? reference[sourceIndex + channel] : 0;
            if (sourceValue !== candidate[targetIndex + channel]) {
              differing += 1;
              break;
            }
          }
        }
      }
      if (differing < best) best = differing;
    }
  }
  return best;
};

const opaqueComponents = (cell, width, height) => {
  const total = width * height;
  const visited = new Uint8Array(total);
  const components = [];
  for (let start = 0; start < total; start += 1) {
    if (visited[start] || cell[start * 4 + 3] === 0) continue;
    const queue = [start];
    visited[start] = 1;
    const pixels = [];
    while (queue.length > 0) {
      const index = queue.pop();
      pixels.push(index);
      const x = index % width;
      const y = (index / width) | 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const neighbor = ny * width + nx;
          if (visited[neighbor] || cell[neighbor * 4 + 3] === 0) continue;
          visited[neighbor] = 1;
          queue.push(neighbor);
        }
      }
    }
    components.push(pixels);
  }
  return components;
};

export const inspectSpriteSheet = (path, revision) => {
  const failures = [];
  const warnings = [];
  const png = PNG.sync.read(readFileSync(path));

  if (png.width !== revision.sheet.width || png.height !== revision.sheet.height) {
    failures.push(
      `${path}: PNG is ${png.width}x${png.height}; revision declares ${revision.sheet.width}x${revision.sheet.height}`,
    );
  }

  const colors = new Set();
  let intermediateAlpha = 0;
  for (let index = 0; index < png.data.length; index += 4) {
    const alpha = png.data[index + 3];
    if (alpha > 0 && alpha < 255) {
      intermediateAlpha += 1;
    }
    if (alpha === 255) {
      colors.add(
        `${png.data[index]},${png.data[index + 1]},${png.data[index + 2]}`,
      );
    }
  }

  if (intermediateAlpha > 0) {
    failures.push(`${path}: found ${intermediateAlpha} intermediate-alpha pixels`);
  }

  const frameHashes = new Map();
  const cellHashes = Array.from(
    { length: revision.sheet.rows },
    () => Array(revision.sheet.columns).fill(null),
  );
  const quality = revision.validation ?? null;
  const motionCells = Array.from(
    { length: revision.sheet.rows },
    () => Array(revision.sheet.columns).fill(null),
  );
  const bottomRows = Array.from(
    { length: revision.sheet.rows },
    () => Array(revision.sheet.columns).fill(-1),
  );
  const directionName = (row) => {
    const directionValue = revision.directions?.[row];
    return typeof directionValue === "string"
      ? directionValue
      : directionValue?.id ?? `row ${row + 1}`;
  };
  const describeFrame = (row, column) => {
    const direction = directionName(row);
    const animation = revision.animations?.find(
      (candidate) =>
        column >= candidate.startColumn &&
        column < candidate.startColumn + candidate.frames,
    );
    return animation
      ? `${direction} ${animation.id} frame ${column - animation.startColumn + 1}`
      : `frame row ${row + 1}, column ${column + 1}`;
  };
  for (let row = 0; row < revision.sheet.rows; row += 1) {
    for (let column = 0; column < revision.sheet.columns; column += 1) {
      let opaquePixels = 0;
      let boundaryPixels = 0;
      let minX = revision.sheet.cellWidth;
      let minY = revision.sheet.cellHeight;
      let maxX = -1;
      let maxY = -1;
      const frameColors = new Set();
      const bytes = [];
      const motionPixels = new Uint8Array(
        revision.sheet.cellWidth * revision.sheet.cellHeight * 4,
      );
      for (let y = 0; y < revision.sheet.cellHeight; y += 1) {
        for (let x = 0; x < revision.sheet.cellWidth; x += 1) {
          const pixelX = column * revision.sheet.cellWidth + x;
          const pixelY = row * revision.sheet.cellHeight + y;
          const index = (png.width * pixelY + pixelX) * 4;
          const alpha = png.data[index + 3];
          if (alpha === 255) {
            opaquePixels += 1;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            frameColors.add(
              `${png.data[index]},${png.data[index + 1]},${png.data[index + 2]}`,
            );
            const motionIndex = (y * revision.sheet.cellWidth + x) * 4;
            motionPixels[motionIndex] = png.data[index];
            motionPixels[motionIndex + 1] = png.data[index + 1];
            motionPixels[motionIndex + 2] = png.data[index + 2];
            motionPixels[motionIndex + 3] = alpha;
          }
          if (alpha > 0) {
            if (
              x === 0 ||
              y === 0 ||
              x === revision.sheet.cellWidth - 1 ||
              y === revision.sheet.cellHeight - 1
            ) {
              boundaryPixels += 1;
            }
          }
          bytes.push(
            png.data[index],
            png.data[index + 1],
            png.data[index + 2],
            alpha,
          );
        }
      }

      if (opaquePixels === 0) {
        failures.push(
          `${path}: frame at row ${row + 1}, column ${column + 1} is empty`,
        );
      } else if (quality) {
        const frameLabel = describeFrame(row, column);
        if (opaquePixels < quality.minOpaquePixelsPerFrame) {
          failures.push(
            `${path}: ${frameLabel} has ${opaquePixels} opaque pixels; minimum is ${quality.minOpaquePixelsPerFrame}`,
          );
        }
        const occupiedWidth = maxX - minX + 1;
        const occupiedHeight = maxY - minY + 1;
        if (
          occupiedWidth < quality.minOccupiedWidth ||
          occupiedHeight < quality.minOccupiedHeight
        ) {
          failures.push(
            `${path}: ${frameLabel} occupies ${occupiedWidth}x${occupiedHeight}; minimum is ${quality.minOccupiedWidth}x${quality.minOccupiedHeight}`,
          );
        }
        if (frameColors.size < quality.minVisibleColorsPerFrame) {
          failures.push(
            `${path}: ${frameLabel} uses ${frameColors.size} visible opaque color${frameColors.size === 1 ? "" : "s"}; minimum is ${quality.minVisibleColorsPerFrame}`,
          );
        }
      }
      if (boundaryPixels > 0) {
        warnings.push(
          `${path}: frame row ${row + 1}, column ${column + 1} has ${boundaryPixels} opaque boundary pixel${boundaryPixels === 1 ? "" : "s"}`,
        );
      }

      motionCells[row][column] = motionPixels;
      bottomRows[row][column] = maxY;

      const hash = Buffer.from(bytes).toString("base64");
      cellHashes[row][column] = hash;
      const prior = frameHashes.get(hash);
      if (prior) {
        warnings.push(
          `${path}: frame row ${row + 1}, column ${column + 1} duplicates ${prior}`,
        );
      } else {
        frameHashes.set(hash, `row ${row + 1}, column ${column + 1}`);
      }
    }
  }

  if (quality) {
    for (const animation of revision.animations ?? []) {
      const minimum =
        quality.minimumDistinctFramesPerDirection?.[animation.id];
      if (!minimum) continue;
      for (let row = 0; row < revision.sheet.rows; row += 1) {
        const hashes = cellHashes[row].slice(
          animation.startColumn,
          animation.startColumn + animation.frames,
        );
        const distinct = new Set(hashes.filter(Boolean)).size;
        if (distinct < minimum) {
          failures.push(
            `${path}: ${directionName(row)} ${animation.id} has ${distinct} distinct frame${distinct === 1 ? "" : "s"}; minimum is ${minimum}`,
          );
        }
      }
    }
  }

  const reportCheck = (severity, message) => {
    if (severity === "error") failures.push(message);
    else warnings.push(message);
  };
  const idleAnimation = revision.animations?.find(
    (animation) => animation.id === "idle",
  );
  const walkAnimation = revision.animations?.find(
    (animation) => animation.id === "walk",
  );

  const anatomyMotion = quality?.anatomyMotion;
  if (anatomyMotion && idleAnimation) {
    const shift = anatomyMotion.alignmentShiftPx;
    for (let row = 0; row < revision.sheet.rows; row += 1) {
      const idleReference = motionCells[row][idleAnimation.startColumn];
      if (!idleReference) continue;

      if (idleAnimation.frames >= 2) {
        const idleSecond = motionCells[row][idleAnimation.startColumn + 1];
        if (idleSecond) {
          const residual = bestShiftResidual(
            idleReference,
            idleSecond,
            revision.sheet.cellWidth,
            revision.sheet.cellHeight,
            shift,
          );
          if (residual < anatomyMotion.minIdleResidualPixels) {
            reportCheck(
              anatomyMotion.translationOnly,
              `${path}: ${directionName(row)} idle changes ${residual} pixel${residual === 1 ? "" : "s"} beyond its best +/-${shift}px translation; minimum is ${anatomyMotion.minIdleResidualPixels}`,
            );
          }
        }
      }

      if (walkAnimation) {
        let meetingFrames = 0;
        for (let frame = 0; frame < walkAnimation.frames; frame += 1) {
          const walkFrame = motionCells[row][walkAnimation.startColumn + frame];
          if (!walkFrame) continue;
          const residual = bestShiftResidual(
            idleReference,
            walkFrame,
            revision.sheet.cellWidth,
            revision.sheet.cellHeight,
            shift,
          );
          if (residual >= anatomyMotion.minWalkResidualPixels) {
            meetingFrames += 1;
          }
        }
        if (meetingFrames < anatomyMotion.minWalkFramesMeetingResidual) {
          reportCheck(
            anatomyMotion.translationOnly,
            `${path}: ${directionName(row)} walk has ${meetingFrames} frame${meetingFrames === 1 ? "" : "s"} moving at least ${anatomyMotion.minWalkResidualPixels} pixels beyond the translated idle pose; minimum is ${anatomyMotion.minWalkFramesMeetingResidual}`,
          );
        }
      }
    }
  }

  const groundContact = quality?.groundContact;
  if (groundContact && idleAnimation) {
    for (let row = 0; row < revision.sheet.rows; row += 1) {
      const baseline = bottomRows[row][idleAnimation.startColumn];
      if (baseline < groundContact.groundedMinBottomRow) continue;

      for (let frame = 1; frame < idleAnimation.frames; frame += 1) {
        const bottom = bottomRows[row][idleAnimation.startColumn + frame];
        if (bottom >= 0 && bottom !== baseline) {
          reportCheck(
            groundContact.unstableContact,
            `${path}: ${directionName(row)} idle bottom contact moves from pixel row ${baseline} to ${bottom}; ground contact must stay fixed`,
          );
          break;
        }
      }

      if (walkAnimation) {
        let onBaseline = 0;
        for (let frame = 0; frame < walkAnimation.frames; frame += 1) {
          if (bottomRows[row][walkAnimation.startColumn + frame] === baseline) {
            onBaseline += 1;
          }
        }
        if (onBaseline < groundContact.minWalkFramesOnBaselineRow) {
          reportCheck(
            groundContact.unstableContact,
            `${path}: ${directionName(row)} walk keeps ${onBaseline} frame${onBaseline === 1 ? "" : "s"} on ground row ${baseline}; minimum is ${groundContact.minWalkFramesOnBaselineRow}`,
          );
        }
      }
    }
  }

  const attackReadability = quality?.attackReadability;
  const attackAnimation = revision.animations?.find(
    (animation) => animation.id === "attack",
  );
  if (attackReadability && idleAnimation && attackAnimation) {
    const cellWidth = revision.sheet.cellWidth;
    const cellHeight = revision.sheet.cellHeight;
    const facingVectors = {
      down: [0, 1],
      up: [0, -1],
      left: [-1, 0],
      right: [1, 0],
    };
    for (let row = 0; row < revision.sheet.rows; row += 1) {
      const idleReference = motionCells[row][idleAnimation.startColumn];
      if (!idleReference) continue;

      const idleDilated = new Uint8Array(cellWidth * cellHeight);
      for (let y = 0; y < cellHeight; y += 1) {
        for (let x = 0; x < cellWidth; x += 1) {
          if (idleReference[(y * cellWidth + x) * 4 + 3] === 0) continue;
          for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < cellWidth && ny >= 0 && ny < cellHeight) {
                idleDilated[ny * cellWidth + nx] = 1;
              }
            }
          }
        }
      }

      let framesWithBodyMotion = 0;
      const effectCentroids = [];
      let effectsNearEdge = false;
      for (let frame = 0; frame < attackAnimation.frames; frame += 1) {
        const attackCell = motionCells[row][attackAnimation.startColumn + frame];
        if (!attackCell) continue;
        const components = opaqueComponents(attackCell, cellWidth, cellHeight);
        if (components.length === 0) continue;
        let bodyIndex = 0;
        for (let index = 1; index < components.length; index += 1) {
          if (components[index].length > components[bodyIndex].length) {
            bodyIndex = index;
          }
        }
        const transientPixels = [];
        components.forEach((pixels, index) => {
          if (index === bodyIndex) return;
          const persistentOverlap = pixels.filter(
            (pixel) => idleDilated[pixel] === 1,
          ).length;
          if (persistentOverlap * 2 >= pixels.length) return;
          transientPixels.push(...pixels);
        });

        const bodyOnly = Uint8Array.from(attackCell);
        for (const pixel of transientPixels) {
          bodyOnly[pixel * 4] = 0;
          bodyOnly[pixel * 4 + 1] = 0;
          bodyOnly[pixel * 4 + 2] = 0;
          bodyOnly[pixel * 4 + 3] = 0;
        }
        const residual = bestShiftResidual(
          idleReference,
          bodyOnly,
          cellWidth,
          cellHeight,
          attackReadability.alignmentShiftPx,
        );
        if (residual >= attackReadability.minBodyResidualPixels) {
          framesWithBodyMotion += 1;
        }

        if (transientPixels.length > 0) {
          let sumX = 0;
          let sumY = 0;
          for (const pixel of transientPixels) {
            sumX += pixel % cellWidth;
            sumY += (pixel / cellWidth) | 0;
          }
          let bodySumX = 0;
          let bodySumY = 0;
          for (const pixel of components[bodyIndex]) {
            bodySumX += pixel % cellWidth;
            bodySumY += (pixel / cellWidth) | 0;
          }
          effectCentroids.push({
            x: sumX / transientPixels.length,
            y: sumY / transientPixels.length,
            bodyX: bodySumX / components[bodyIndex].length,
            bodyY: bodySumY / components[bodyIndex].length,
          });
          const margin = attackReadability.minEffectsEdgeMarginPx;
          if (
            !effectsNearEdge &&
            transientPixels.some((pixel) => {
              const x = pixel % cellWidth;
              const y = (pixel / cellWidth) | 0;
              return (
                x < margin ||
                y < margin ||
                x >= cellWidth - margin ||
                y >= cellHeight - margin
              );
            })
          ) {
            effectsNearEdge = true;
          }
        }
      }

      if (framesWithBodyMotion < attackReadability.minAttackFramesMeetingResidual) {
        reportCheck(
          attackReadability.effectsOnly,
          `${path}: ${directionName(row)} attack has ${framesWithBodyMotion} frame${framesWithBodyMotion === 1 ? "" : "s"} with body motion of at least ${attackReadability.minBodyResidualPixels} pixels beyond the idle pose; minimum is ${attackReadability.minAttackFramesMeetingResidual}`,
        );
      }
      if (effectsNearEdge) {
        reportCheck(
          attackReadability.effectsEdgeContact,
          `${path}: ${directionName(row)} attack effects come closer than ${attackReadability.minEffectsEdgeMarginPx}px to the cell edge`,
        );
      }
      const facing = facingVectors[directionName(row)];
      if (facing && effectCentroids.length >= 1) {
        const last = effectCentroids[effectCentroids.length - 1];
        const bearingX = last.x - last.bodyX;
        const bearingY = last.y - last.bodyY;
        const bearing = Math.hypot(bearingX, bearingY);
        if (bearing >= attackReadability.minEffectsTravelPx) {
          const cosAngle =
            (bearingX * facing[0] + bearingY * facing[1]) / bearing;
          const limit = Math.cos(
            (attackReadability.maxEffectsAngleFromFacingDeg * Math.PI) / 180,
          );
          if (cosAngle < limit) {
            reportCheck(
              attackReadability.misaimedEffects,
              `${path}: ${directionName(row)} attack effects end at (${Math.round(bearingX)}, ${Math.round(bearingY)}) relative to the body, outside ${attackReadability.maxEffectsAngleFromFacingDeg} degrees of the ${directionName(row)} facing`,
            );
          }
        }
      }
    }
  }

  return {
    failures,
    warnings,
    opaqueColors: colors.size,
  };
};

const getRevisionDirectories = (assetDirectory) => {
  const revisionsRoot = join(assetDirectory, "revisions");
  if (!existsSync(revisionsRoot)) return [];
  return readdirSync(revisionsRoot, {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(revisionsRoot, entry.name));
};

export const validateLibraryRoot = ({
  ajv,
  libraryRoot,
  category,
  style,
  styles,
  enforceQuality = true,
}) => {
  const failures = [];
  const warnings = [];
  const assetsRoot = join(libraryRoot, "assets");
  let assets = 0;
  let revisions = 0;
  const lanes = {
    intake: 0,
    revise: 0,
    archive: 0,
    library: 0,
  };
  const availableStyles = Array.isArray(styles)
    ? styles
    : style
      ? [style]
      : [];

  if (!existsSync(assetsRoot)) {
    return {
      failures: [`Library assets directory does not exist: ${assetsRoot}`],
      warnings,
      assets,
      revisions,
      lanes,
    };
  }

  for (const entry of readdirSync(assetsRoot, {
    withFileTypes: true,
  })) {
    if (!entry.isDirectory()) continue;
    assets += 1;
    const assetDirectory = join(assetsRoot, entry.name);
    const assetPath = join(assetDirectory, "asset.json");
    const reviewPath = join(assetDirectory, "review.json");

    if (!existsSync(assetPath) || !existsSync(reviewPath)) {
      failures.push(`${assetDirectory}: missing asset.json or review.json`);
      continue;
    }

    const asset = readJson(assetPath);
    const review = readJson(reviewPath);
    failures.push(...validateRecord(ajv, asset, assetPath));
    failures.push(...validateRecord(ajv, review, reviewPath));

    if (asset.id !== entry.name || review.assetId !== asset.id) {
      failures.push(`${assetDirectory}: asset identity does not match its folder`);
    }

    if (
      asset.category.id !== category.id ||
      asset.category.version !== category.version
    ) {
      failures.push(`${assetPath}: category reference is not available`);
    }
    const assetStyle = availableStyles.find(
      (candidate) =>
        asset.style.id === candidate.id &&
        asset.style.version === candidate.version,
    );
    if (!assetStyle) {
      failures.push(`${assetPath}: style reference is not available`);
    }

    if (review.candidate) {
      lanes[review.candidate.lane] += 1;
    }
    if (review.approvedRevisionId) {
      lanes.library += 1;
    }

    const revisionIds = new Set();
    for (const revisionDirectory of getRevisionDirectories(assetDirectory)) {
      revisions += 1;
      const revisionPath = join(revisionDirectory, "revision.json");
      if (!existsSync(revisionPath)) {
        failures.push(`${revisionDirectory}: missing revision.json`);
        continue;
      }

      const revision = readJson(revisionPath);
      revisionIds.add(revision.id);
      failures.push(...validateRecord(ajv, revision, revisionPath));

      if (revision.assetId !== asset.id) {
        failures.push(`${revisionPath}: revision asset ID does not match`);
      }
      if (
        revision.style.id !== asset.style.id ||
        revision.style.version !== asset.style.version
      ) {
        failures.push(`${revisionPath}: revision style does not match asset`);
      }

      let nextColumn = 0;
      for (const animation of revision.animations) {
        if (animation.startColumn !== nextColumn) {
          failures.push(
            `${revisionPath}: ${animation.id} starts at ${animation.startColumn}; expected ${nextColumn}`,
          );
        }
        nextColumn += animation.frames;
      }
      if (nextColumn !== revision.sheet.columns) {
        failures.push(`${revisionPath}: animation columns do not fill the sheet`);
      }

      for (const artifact of Object.values(revision.artifacts)) {
        if (!artifact) continue;
        if (
          !isSafeRelativePath(artifact.path) ||
          !assertPathInside(assetDirectory, artifact.path)
        ) {
          failures.push(`${revisionPath}: unsafe artifact path ${artifact.path}`);
          continue;
        }
        const artifactPath = join(assetDirectory, artifact.path);
        if (!existsSync(artifactPath)) {
          failures.push(`${revisionPath}: missing artifact ${artifact.path}`);
        }
      }

      const validationPath = join(
        assetDirectory,
        revision.validationReportPath,
      );
      if (!existsSync(validationPath)) {
        failures.push(
          `${revisionPath}: missing validation report ${revision.validationReportPath}`,
        );
      } else {
        failures.push(
          ...validateRecord(ajv, readJson(validationPath), validationPath),
        );
      }

      const sheetPath = join(assetDirectory, revision.artifacts.sheet.path);
      if (existsSync(sheetPath)) {
        const pngInspection = inspectSpriteSheet(sheetPath, {
          ...revision,
          ...(enforceQuality ? { validation: category.validation } : {}),
        });
        failures.push(...pngInspection.failures);
        warnings.push(...pngInspection.warnings);
        if (
          assetStyle &&
          pngInspection.opaqueColors > assetStyle.color.maximumOpaqueColors
        ) {
          failures.push(
            `${sheetPath}: uses ${pngInspection.opaqueColors} opaque colors; style maximum is ${assetStyle.color.maximumOpaqueColors}`,
          );
        }
      }
    }

    if (
      review.candidate &&
      !revisionIds.has(review.candidate.revisionId)
    ) {
      failures.push(`${reviewPath}: candidate revision does not exist`);
    }
    if (
      review.approvedRevisionId &&
      !revisionIds.has(review.approvedRevisionId)
    ) {
      failures.push(`${reviewPath}: approved revision does not exist`);
    }
  }

  return {
    failures,
    warnings,
    assets,
    revisions,
    lanes,
  };
};

export { readJson };
