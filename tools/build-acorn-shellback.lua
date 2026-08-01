
local spr = Sprite(32, 32, ColorMode.RGB)
spr.filename = "C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-acorn-shellback/source.aseprite"

-- Setup palette
local pal = spr.palettes[1]
pal:resize(15)

local colors = {
  Color{ r=0, g=0, b=0, a=0 },         -- 0: trans
  Color{ r=42, g=26, b=16, a=255 },     -- 1: outline
  Color{ r=77, g=50, b=29, a=255 },     -- 2: wood_dark
  Color{ r=125, g=80, b=45, a=255 },    -- 3: wood_mid
  Color{ r=172, g=114, b=62, a=255 },   -- 4: wood_light
  Color{ r=138, g=93, b=59, a=255 },    -- 5: cap_base
  Color{ r=196, g=146, b=88, a=255 },   -- 6: cap_light
  Color{ r=226, g=180, b=120, a=255 },  -- 7: cap_top
  Color{ r=244, g=230, b=206, a=255 },  -- 8: crack
  Color{ r=41, g=64, b=34, a=255 },     -- 9: moss_dark
  Color{ r=74, g=110, b=59, a=255 },    -- 10: moss_mid
  Color{ r=122, g=168, b=89, a=255 },   -- 11: moss_light
  Color{ r=212, g=155, b=77, a=255 },   -- 12: beak_light
  Color{ r=61, g=38, b=20, a=255 },     -- 13: proj_dark
  Color{ r=184, g=130, b=66, a=255 }    -- 14: proj_light
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

-- Create tags properly named
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
local c_wd  = colors[3]
local c_wm  = colors[4]
local c_wl  = colors[5]
local c_cb  = colors[6]
local c_cl  = colors[7]
local c_ct  = colors[8]
local c_cr  = colors[9]
local c_md  = colors[10]
local c_mm  = colors[11]
local c_ml  = colors[12]
local c_bk  = colors[13]
local c_pd  = colors[14]
local c_pl  = colors[15]

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
  local isRetracted = false

  if anim == "idle" then
    if animFrame == 2 then offsetY = -1 end
  elseif anim == "walk" then
    if animFrame == 1 then offsetX = -1
    elseif animFrame == 2 then offsetY = 1
    elseif animFrame == 3 then offsetX = 1
    end
  elseif anim == "attack" then
    if animFrame == 1 or animFrame == 2 then isRetracted = true; offsetY = 1
    elseif animFrame == 3 then offsetY = -2
    elseif animFrame == 4 then offsetY = -1 end
  end

  local cx = 16 + offsetX
  local cy = 16 + offsetY

  -- OUTLINE (Base ring)
  drawOval(imgOutline, cx, cy-1, 11, 9, c_out)
  if not isRetracted then
    if dir == "down" then
      drawOval(imgOutline, cx, cy+7, 4, 3, c_out)
    elseif dir == "left" then
      drawOval(imgOutline, cx-8, cy+5, 4, 3, c_out)
    elseif dir == "right" then
      drawOval(imgOutline, cx+8, cy+5, 4, 3, c_out)
    end
  end

  -- BODY
  if dir == "down" then
    if not isRetracted then
      put(imgBody, cx-8, cy+6, c_wd); put(imgBody, cx-7, cy+6, c_wm); put(imgBody, cx-8, cy+7, c_wd)
      put(imgBody, cx+7, cy+6, c_wm); put(imgBody, cx+8, cy+6, c_wd); put(imgBody, cx+8, cy+7, c_wd)
      drawOval(imgBody, cx, cy+7, 3, 2, c_wm)
      put(imgBody, cx, cy+9, c_bk)
    end
    drawOval(imgBody, cx, cy-1, 10, 8, c_wm)
    drawOval(imgBody, cx, cy-4, 9, 5, c_cb)

  elseif dir == "left" then
    if not isRetracted then
      put(imgBody, cx-6, cy+6, c_wm); put(imgBody, cx+6, cy+6, c_wd)
      drawOval(imgBody, cx-8, cy+5, 3, 2, c_wm)
      put(imgBody, cx-10, cy+6, c_bk)
    end
    drawOval(imgBody, cx, cy-1, 9, 8, c_wm)
    drawOval(imgBody, cx+2, cy-4, 8, 5, c_cb)

  elseif dir == "right" then
    if not isRetracted then
      put(imgBody, cx+6, cy+6, c_wm); put(imgBody, cx-6, cy+6, c_wd)
      drawOval(imgBody, cx+8, cy+5, 3, 2, c_wm)
      put(imgBody, cx+10, cy+6, c_bk)
    end
    drawOval(imgBody, cx, cy-1, 9, 8, c_wm)
    drawOval(imgBody, cx-2, cy-4, 8, 5, c_cb)

  elseif dir == "up" then
    if not isRetracted then
      put(imgBody, cx-8, cy+6, c_wd); put(imgBody, cx+8, cy+6, c_wd)
      put(imgBody, cx, cy-8, c_wm)
    end
    drawOval(imgBody, cx, cy-1, 10, 8, c_wm)
    drawOval(imgBody, cx, cy-3, 9, 6, c_cb)
  end

  -- DETAILS & PALE CRACK ON ANATOMICAL RIGHT
  if dir == "down" then
    for x = cx-7, cx+7, 3 do
      put(imgDetails, x, cy-6, c_cl)
      put(imgDetails, x+1, cy-4, c_ct)
    end
    put(imgDetails, cx+5, cy+2, c_mm); put(imgDetails, cx+6, cy+2, c_ml)
    -- PALE CRACK (Anatomical Right = Screen LEFT)
    put(imgDetails, cx-6, cy-3, c_cr); put(imgDetails, cx-5, cy-2, c_cr)
    put(imgDetails, cx-6, cy-1, c_cr); put(imgDetails, cx-4, cy, c_cr)

  elseif dir == "left" then
    for x = cx-4, cx+7, 3 do
      put(imgDetails, x, cy-6, c_cl)
      put(imgDetails, x+1, cy-4, c_ct)
    end
    put(imgDetails, cx-3, cy+3, c_mm)
    -- PALE CRACK (Anatomical Right = Far Top-Right rim)
    put(imgDetails, cx+4, cy-5, c_cr); put(imgDetails, cx+5, cy-4, c_cr); put(imgDetails, cx+6, cy-3, c_cr)

  elseif dir == "right" then
    for x = cx-7, cx+4, 3 do
      put(imgDetails, x, cy-6, c_cl)
      put(imgDetails, x-1, cy-4, c_ct)
    end
    put(imgDetails, cx+3, cy+3, c_mm)
    -- PALE CRACK (Anatomical Right = Foreground Facing Viewer)
    put(imgDetails, cx-4, cy-2, c_cr); put(imgDetails, cx-3, cy-1, c_cr)
    put(imgDetails, cx-4, cy, c_cr); put(imgDetails, cx-2, cy+1, c_cr)

  elseif dir == "up" then
    for x = cx-6, cx+6, 3 do
      put(imgDetails, x, cy-5, c_cl)
      put(imgDetails, x+1, cy-3, c_ct)
    end
    put(imgDetails, cx-5, cy+2, c_mm)
    -- PALE CRACK (Anatomical Right = Screen RIGHT)
    put(imgDetails, cx+5, cy-3, c_cr); put(imgDetails, cx+6, cy-2, c_cr)
    put(imgDetails, cx+5, cy-1, c_cr); put(imgDetails, cx+4, cy, c_cr)
  end

  -- EFFECTS (Projectiles during attack)
  if anim == "attack" then
    if animFrame == 2 then
      put(imgEffects, cx-8, cy-8, c_ml); put(imgEffects, cx+8, cy-8, c_ml)
    elseif animFrame == 3 or animFrame == 4 then
      local dist = (animFrame == 3) and 9 or 13
      local projDirs = {
        {0, -dist}, {dist, -dist}, {dist, 0}, {dist, dist},
        {0, dist}, {-dist, dist}, {-dist, 0}, {-dist, -dist}
      }
      for _, d in ipairs(projDirs) do
        local px, py = cx + d[1], cy + d[2]
        put(imgEffects, px, py, c_pl)
        put(imgEffects, px+1, py, c_pd)
        put(imgEffects, px, py+1, c_out)
      end
    end
  end

  spr:newCel(layerOutline, f, imgOutline)
  spr:newCel(layerBody, f, imgBody)
  spr:newCel(layerDetails, f, imgDetails)
  spr:newCel(layerEffects, f, imgEffects)
end

spr:saveCopyAs("C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-acorn-shellback/source.aseprite")

app.command.ExportSpriteSheet{
  ui=false,
  type="rows",
  columns=10,
  rows=4,
  width=320,
  height=128,
  textureFilename="C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-acorn-shellback/sheet.png",
  exportMode="sprite",
  trim=false
}

local thumbSpr = Sprite(32, 32, ColorMode.RGB)
local thumbImg = Image(32, 32, ColorMode.RGB)
local f1Body = spr.layers[2]:cel(1).image
for y=0,31 do for x=0,31 do thumbImg:drawPixel(x, y, f1Body:getPixel(x, y)) end end
thumbSpr:newCel(thumbSpr.layers[1], 1, thumbImg)
thumbSpr:saveCopyAs("C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-acorn-shellback/thumbnail.png")
thumbSpr:close()

spr:close()
print("SUCCESSFULLY_CREATED_ACORN_SHELLBACK")
