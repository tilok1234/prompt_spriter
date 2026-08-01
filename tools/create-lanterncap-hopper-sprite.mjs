import { writeFileSync, mkdirSync } from "fs";

const stagingDir = "C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-lanterncap-hopper";
mkdirSync(stagingDir, { recursive: true });

const luaScript = `
local spr = Sprite(32, 32, ColorMode.RGB)
spr.filename = "${stagingDir}/source.aseprite"

-- Setup palette
local pal = spr.palettes[1]
pal:resize(14)

local colors = {
  Color{ r=0, g=0, b=0, a=0 },         -- 0: trans
  Color{ r=28, g=38, b=22, a=255 },    -- 1: outline
  Color{ r=41, g=64, b=37, a=255 },    -- 2: body_dark
  Color{ r=74, g=110, b=61, a=255 },   -- 3: body_mid
  Color{ r=120, g=163, b=89, a=255 },  -- 4: body_light
  Color{ r=107, g=29, b=29, a=255 },   -- 5: cap_dark
  Color{ r=166, g=48, b=48, a=255 },   -- 6: cap_mid
  Color{ r=212, g=74, b=74, a=255 },   -- 7: cap_light
  Color{ r=168, g=155, b=125, a=255 },-- 8: cream_dark
  Color{ r=219, g=204, b=169, a=255 },-- 9: cream_mid
  Color{ r=245, g=235, b=211, a=255 },-- 10: cream_light
  Color{ r=191, g=162, b=48, a=255 }, -- 11: spore_dark
  Color{ r=247, g=227, b=84, a=255 }  -- 12: spore_light
}

for i=1,#colors do
  pal:setColor(i-1, colors[i])
end

-- Layers bottom to top: outline, body, details, effects, guides
local layerOutline = spr.layers[1]
layerOutline.name = "outline"

local layerBody = spr:newLayer()
layerBody.name = "body"

local layerDetails = spr:newLayer()
layerDetails.name = "details"

local layerEffects = spr:newLayer()
layerEffects.name = "effects"

local layerGuides = spr:newLayer()
layerGuides.name = "guides"
layerGuides.isVisible = false

-- Add 39 frames to reach 40 total
for f = 2, 40 do
  spr:newFrame()
end

-- Frame durations (ms)
local defaultDurations = {
  [1]=0.40, [2]=0.40,
  [3]=0.15, [4]=0.15, [5]=0.15, [6]=0.15,
  [7]=0.12, [8]=0.12, [9]=0.12, [10]=0.12,
  [11]=0.40, [12]=0.40,
  [13]=0.15, [14]=0.15, [15]=0.15, [16]=0.15,
  [17]=0.12, [18]=0.12, [19]=0.12, [20]=0.12,
  [21]=0.40, [22]=0.40,
  [23]=0.15, [24]=0.15, [25]=0.15, [26]=0.15,
  [27]=0.12, [28]=0.12, [29]=0.12, [30]=0.12,
  [31]=0.40, [32]=0.40,
  [33]=0.15, [34]=0.15, [35]=0.15, [36]=0.15,
  [37]=0.12, [38]=0.12, [39]=0.12, [40]=0.12
}

for f = 1, 40 do
  spr.frames[f].duration = defaultDurations[f]
end

-- Create tags
local function addTag(fromF, toF, tagName)
  local tag = spr:newTag(fromF, toF)
  tag.name = tagName
end

addTag(1, 2, "down_idle")
addTag(3, 6, "down_walk")
addTag(7, 10, "down_attack")

addTag(11, 12, "left_idle")
addTag(13, 16, "left_walk")
addTag(17, 20, "left_attack")

addTag(21, 22, "right_idle")
addTag(23, 26, "right_walk")
addTag(27, 30, "right_attack")

addTag(31, 32, "up_idle")
addTag(33, 36, "up_walk")
addTag(37, 40, "up_attack")

local c_out = colors[2]
local c_bd  = colors[3]
local c_bm  = colors[4]
local c_bl  = colors[5]
local c_cd  = colors[6]
local c_cm  = colors[7]
local c_cl  = colors[8]
local c_crd = colors[9]
local c_crm = colors[10]
local c_crl = colors[11]
local c_spd = colors[12]
local c_spl = colors[13]

local function put(img, x, y, col)
  if x >= 0 and x < 32 and y >= 0 and y < 32 then
    img:drawPixel(x, y, col)
  end
end

local function drawOval(img, cx, cy, rx, ry, col)
  for y = math.max(0, cy - ry), math.min(31, cy + ry) do
    for x = math.max(0, cx - rx), math.min(31, cx + rx) do
      local dx = (x - cx) / rx
      local dy = (y - cy) / ry
      if dx*dx + dy*dy <= 1.0 then
        img:drawPixel(x, y, col)
      end
    end
  end
end

for f = 1, 40 do
  local dir, anim, animFrame
  if f >= 1 and f <= 10 then
    dir = "down"
    if f <= 2 then anim, animFrame = "idle", f
    elseif f <= 6 then anim, animFrame = "walk", f - 2
    else anim, animFrame = "attack", f - 6 end
  elseif f >= 11 and f <= 20 then
    dir = "left"
    if f <= 12 then anim, animFrame = "idle", f - 10
    elseif f <= 16 then anim, animFrame = "walk", f - 12
    else anim, animFrame = "attack", f - 16 end
  elseif f >= 21 and f <= 30 then
    dir = "right"
    if f <= 22 then anim, animFrame = "idle", f - 20
    elseif f <= 26 then anim, animFrame = "walk", f - 22
    else anim, animFrame = "attack", f - 26 end
  else
    dir = "up"
    if f <= 32 then anim, animFrame = "idle", f - 30
    elseif f <= 36 then anim, animFrame = "walk", f - 32
    else anim, animFrame = "attack", f - 36 end
  end

  local imgBody    = Image(32, 32, ColorMode.RGB)
  local imgDetails = Image(32, 32, ColorMode.RGB)
  local imgOutline = Image(32, 32, ColorMode.RGB)
  local imgEffects = Image(32, 32, ColorMode.RGB)

  local offsetY = 0
  local offsetX = 0
  local pouchPuff = 0

  if anim == "idle" then
    if animFrame == 2 then offsetY = -1; pouchPuff = 1 end
  elseif anim == "walk" then
    if animFrame == 1 then offsetY = 1
    elseif animFrame == 2 then offsetY = -3; pouchPuff = -1
    elseif animFrame == 3 then offsetY = -2
    elseif animFrame == 4 then offsetY = 1 end
  elseif anim == "attack" then
    if animFrame == 1 then offsetY = 2; pouchPuff = 2
    elseif animFrame == 2 then offsetY = -5
    elseif animFrame == 3 then offsetY = 2; pouchPuff = 1
    elseif animFrame == 4 then offsetY = 0 end
  end

  local cx = 16 + offsetX
  local cy = 18 + offsetY

  ----------------------------------
  -- OUTLINE
  ----------------------------------
  drawOval(imgOutline, cx, cy+1, 9, 6, c_out)    -- Body base outline
  drawOval(imgOutline, cx, cy-7, 9, 6, c_out)    -- Mushroom cap outline

  ----------------------------------
  -- BODY (Frog torso, rear legs, cap stem/body)
  ----------------------------------
  if dir == "down" then
    -- Rear legs folded at sides
    drawOval(imgBody, cx-7, cy+3, 3, 4, c_bd)
    drawOval(imgBody, cx+7, cy+3, 3, 4, c_bd)
    -- Main frog body
    drawOval(imgBody, cx, cy+1, 7, 5, c_bm)
    -- Throat pouch
    drawOval(imgBody, cx, cy+2, 4 + pouchPuff, 3 + pouchPuff, c_crm)

    -- Mushroom cap
    drawOval(imgBody, cx, cy-6, 8, 5, c_cm)
    drawOval(imgBody, cx, cy-8, 6, 3, c_cl)

  elseif dir == "left" then
    -- Rear leg left side
    drawOval(imgBody, cx+5, cy+3, 4, 4, c_bd)
    -- Main body
    drawOval(imgBody, cx-1, cy+1, 6, 5, c_bm)
    -- Throat pouch pointing left
    drawOval(imgBody, cx-4, cy+2, 4 + pouchPuff, 3 + pouchPuff, c_crm)

    -- Mushroom cap tilted left
    drawOval(imgBody, cx-1, cy-6, 8, 5, c_cm)
    drawOval(imgBody, cx-2, cy-8, 6, 3, c_cl)

  elseif dir == "right" then
    -- Rear leg right side
    drawOval(imgBody, cx-5, cy+3, 4, 4, c_bd)
    -- Main body
    drawOval(imgBody, cx+1, cy+1, 6, 5, c_bm)
    -- Throat pouch pointing right
    drawOval(imgBody, cx+4, cy+2, 4 + pouchPuff, 3 + pouchPuff, c_crm)

    -- Mushroom cap tilted right
    drawOval(imgBody, cx+1, cy-6, 8, 5, c_cm)
    drawOval(imgBody, cx+2, cy-8, 6, 3, c_cl)

  elseif dir == "up" then
    -- Folded legs back
    drawOval(imgBody, cx-7, cy+3, 3, 4, c_bd)
    drawOval(imgBody, cx+7, cy+3, 3, 4, c_bd)
    -- Back body
    drawOval(imgBody, cx, cy+1, 7, 5, c_bm)

    -- Mushroom cap back
    drawOval(imgBody, cx, cy-6, 8, 5, c_cm)
    drawOval(imgBody, cx, cy-8, 6, 3, c_cl)
  end

  ----------------------------------
  -- DETAILS (Pouch highlights, tendrils, 3 cap spots with largest on creature's LEFT)
  ----------------------------------
  -- Cream pouch highlight
  if dir == "down" or dir == "left" or dir == "right" then
    put(imgDetails, cx, cy+2, c_crl)
  end

  -- Dangling fungal tendrils under cap
  put(imgDetails, cx-4, cy-2, c_crd); put(imgDetails, cx-4, cy-1, c_crm)
  put(imgDetails, cx+4, cy-2, c_crd); put(imgDetails, cx+4, cy-1, c_crm)

  -- CAP SPOTS (3 spots in triangle, largest on creature's anatomical LEFT)
  if dir == "down" then
    -- Creature facing down -> Left is screen RIGHT
    -- Spot 1 (Largest, creature's left): screen right
    drawOval(imgDetails, cx+4, cy-6, 2, 2, c_spl)
    put(imgDetails, cx+4, cy-6, c_spd)
    -- Spot 2 (Top center)
    put(imgDetails, cx, cy-9, c_spl)
    -- Spot 3 (Small, creature's right): screen left
    put(imgDetails, cx-4, cy-6, c_spl)

  elseif dir == "left" then
    -- Creature facing left -> Left is FOREGROUND (facing viewer)
    -- Spot 1 (Largest, foreground/center)
    drawOval(imgDetails, cx-1, cy-6, 2, 2, c_spl)
    put(imgDetails, cx-1, cy-6, c_spd)
    -- Spot 2 (Top)
    put(imgDetails, cx+2, cy-9, c_spl)
    -- Spot 3 (Small, background right rim)
    put(imgDetails, cx+5, cy-5, c_spl)

  elseif dir == "right" then
    -- Creature facing right -> Left is BACKGROUND (far rim)
    -- Spot 1 (Largest, background far rim)
    drawOval(imgDetails, cx-5, cy-6, 2, 2, c_spl)
    put(imgDetails, cx-5, cy-6, c_spd)
    -- Spot 2 (Top)
    put(imgDetails, cx-2, cy-9, c_spl)
    -- Spot 3 (Small, foreground right)
    put(imgDetails, cx+2, cy-5, c_spl)

  elseif dir == "up" then
    -- Creature facing up -> Left is screen LEFT
    -- Spot 1 (Largest, creature's left): screen left
    drawOval(imgDetails, cx-4, cy-6, 2, 2, c_spl)
    put(imgDetails, cx-4, cy-6, c_spd)
    -- Spot 2 (Top center)
    put(imgDetails, cx, cy-9, c_spl)
    -- Spot 3 (Small, creature's right): screen right
    put(imgDetails, cx+4, cy-6, c_spl)
  end

  ----------------------------------
  -- EFFECTS (Expanding spore projectile ring during landing/recovery)
  ----------------------------------
  if anim == "attack" then
    if animFrame == 2 then
      -- Jump charge / spore glimmers
      put(imgEffects, cx-6, cy+4, c_spl)
      put(imgEffects, cx+6, cy+4, c_spl)
    elseif animFrame == 3 or animFrame == 4 then
      -- Landing impact ring of spores
      local dist = (animFrame == 3) and 8 or 13
      local ringDirs = {
        {0, -dist}, {dist, -dist}, {dist, 0}, {dist, dist},
        {0, dist}, {-dist, dist}, {-dist, 0}, {-dist, -dist}
      }
      for _, d in ipairs(ringDirs) do
        local px, py = cx + d[1], cy + d[2]
        put(imgEffects, px, py, c_spl)
        put(imgEffects, px+1, py, c_spd)
        put(imgEffects, px, py+1, c_out)
      end
    end
  end

  spr:newCel(layerOutline, f, imgOutline)
  spr:newCel(layerBody, f, imgBody)
  spr:newCel(layerDetails, f, imgDetails)
  spr:newCel(layerEffects, f, imgEffects)
end

spr:saveCopyAs("${stagingDir}/source.aseprite")

app.command.ExportSpriteSheet{
  ui=false,
  type="rows",
  columns=10,
  rows=4,
  width=320,
  height=128,
  textureFilename="${stagingDir}/sheet.png",
  exportMode="sprite",
  trim=false
}

local thumbSpr = Sprite(32, 32, ColorMode.RGB)
local thumbImg = Image(32, 32, ColorMode.RGB)
local f1Body = spr.layers[2]:cel(1).image
for y=0,31 do for x=0,31 do thumbImg:drawPixel(x, y, f1Body:getPixel(x, y)) end end
thumbSpr:newCel(thumbSpr.layers[1], 1, thumbImg)
thumbSpr:saveCopyAs("${stagingDir}/thumbnail.png")
thumbSpr:close()

spr:close()
print("SUCCESSFULLY_CREATED_LANTERNCAP_HOPPER")
`;

writeFileSync("tools/build-lanterncap-hopper.lua", luaScript);
console.log("Updated tools/build-lanterncap-hopper.lua");
