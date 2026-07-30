import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const toolsDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = dirname(toolsDirectory);
const outputDirectory = join(
  repositoryRoot,
  "fixtures",
  "library",
  "assets",
  "fixture-ember-slime-001",
  "revisions",
  "r001",
);

const cellSize = 32;
const columns = 10;
const rows = 4;
const sheet = new PNG({
  width: columns * cellSize,
  height: rows * cellSize,
  colorType: 6,
});

const colors = {
  outline: "#3B1E3C",
  dark: "#A93646",
  body: "#E6574F",
  light: "#FF9A55",
  ember: "#FFE08A",
};

const parseColor = (hex) => {
  const value = hex.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
    255,
  ];
};

const rgba = Object.fromEntries(
  Object.entries(colors).map(([name, value]) => [name, parseColor(value)]),
);

const setPixel = (png, x, y, color) => {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) {
    return;
  }
  const index = (png.width * y + x) * 4;
  png.data[index] = color[0];
  png.data[index + 1] = color[1];
  png.data[index + 2] = color[2];
  png.data[index + 3] = color[3];
};

const key = (x, y) => `${x},${y}`;

const buildMask = ({ animation, direction, frame }) => {
  const mask = new Set();
  const idleBobs = [0, -1];
  const walkBobs = [0, -1, 0, -1];
  const attackBobs = [0, 1, -1, 0];
  const bob =
    animation === "idle"
      ? idleBobs[frame]
      : animation === "walk"
        ? walkBobs[frame]
        : attackBobs[frame];

  let centerX = 16;
  let bottomY = 25 + bob;
  let radiusX = animation === "attack" && frame === 1 ? 8 : 9;
  let height = animation === "attack" && frame === 1 ? 10 : 12;

  if (animation === "walk") {
    centerX += [-1, 0, 1, 0][frame];
  }

  if (animation === "attack" && frame === 2) {
    if (direction === "left") centerX -= 3;
    if (direction === "right") centerX += 3;
    if (direction === "down") bottomY += 2;
    if (direction === "up") bottomY -= 3;
    radiusX = direction === "left" || direction === "right" ? 11 : 9;
    height = direction === "up" || direction === "down" ? 15 : 11;
  }

  const topY = bottomY - height;
  for (let y = topY; y <= bottomY; y += 1) {
    const normalizedY = (y - (topY + height * 0.55)) / (height * 0.56);
    const rowRadius = Math.floor(
      radiusX * Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY)),
    );
    for (let x = centerX - rowRadius; x <= centerX + rowRadius; x += 1) {
      mask.add(key(x, y));
    }
  }

  for (let x = centerX - radiusX + 2; x <= centerX + radiusX - 2; x += 1) {
    mask.add(key(x, bottomY));
  }

  if (animation === "walk") {
    const footOffset = frame % 2 === 0 ? -5 : 4;
    mask.add(key(centerX + footOffset, bottomY + 1));
    mask.add(key(centerX + footOffset + 1, bottomY + 1));
  }

  return {
    mask,
    centerX,
    topY,
    bottomY,
  };
};

const drawFrame = (column, row, animation, direction, frame) => {
  const originX = column * cellSize;
  const originY = row * cellSize;
  const { mask, centerX, topY, bottomY } = buildMask({
    animation,
    direction,
    frame,
  });

  const outline = new Set();
  for (const pixel of mask) {
    const [x, y] = pixel.split(",").map(Number);
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const neighbor = key(x + dx, y + dy);
        if (!mask.has(neighbor)) outline.add(neighbor);
      }
    }
  }

  for (const pixel of outline) {
    const [x, y] = pixel.split(",").map(Number);
    setPixel(sheet, originX + x, originY + y, rgba.outline);
  }

  for (const pixel of mask) {
    const [x, y] = pixel.split(",").map(Number);
    const color = y >= bottomY - 2 ? rgba.dark : rgba.body;
    setPixel(sheet, originX + x, originY + y, color);
  }

  for (let y = topY + 2; y <= topY + 4; y += 1) {
    for (let x = centerX - 4; x <= centerX - 1; x += 1) {
      if (mask.has(key(x, y))) {
        setPixel(sheet, originX + x, originY + y, rgba.light);
      }
    }
  }

  const eyeY = topY + 5;
  const eyePositions =
    direction === "down"
      ? [centerX - 3, centerX + 3]
      : direction === "left"
        ? [centerX - 4]
        : direction === "right"
          ? [centerX + 4]
          : [];

  for (const eyeX of eyePositions) {
    setPixel(sheet, originX + eyeX, originY + eyeY, rgba.ember);
    setPixel(sheet, originX + eyeX, originY + eyeY + 1, rgba.outline);
  }

  if (direction === "up") {
    setPixel(sheet, originX + centerX - 4, originY + topY + 3, rgba.light);
    setPixel(sheet, originX + centerX - 3, originY + topY + 3, rgba.light);
  }
};

const directions = ["down", "left", "right", "up"];
const sequences = [
  {
    id: "idle",
    start: 0,
    frames: 2,
  },
  {
    id: "walk",
    start: 2,
    frames: 4,
  },
  {
    id: "attack",
    start: 6,
    frames: 4,
  },
];

for (let row = 0; row < directions.length; row += 1) {
  for (const sequence of sequences) {
    for (let frame = 0; frame < sequence.frames; frame += 1) {
      drawFrame(
        sequence.start + frame,
        row,
        sequence.id,
        directions[row],
        frame,
      );
    }
  }
}

const thumbnail = new PNG({
  width: cellSize,
  height: cellSize,
  colorType: 6,
});

for (let y = 0; y < cellSize; y += 1) {
  for (let x = 0; x < cellSize; x += 1) {
    const sourceIndex = (sheet.width * y + x) * 4;
    const targetIndex = (thumbnail.width * y + x) * 4;
    for (let channel = 0; channel < 4; channel += 1) {
      thumbnail.data[targetIndex + channel] = sheet.data[sourceIndex + channel];
    }
  }
}

mkdirSync(outputDirectory, {
  recursive: true,
});
writeFileSync(join(outputDirectory, "sheet.png"), PNG.sync.write(sheet));
writeFileSync(
  join(outputDirectory, "thumbnail.png"),
  PNG.sync.write(thumbnail),
);

console.log(
  `Generated deterministic fixture sheet (${sheet.width}x${sheet.height}) and thumbnail.`,
);

