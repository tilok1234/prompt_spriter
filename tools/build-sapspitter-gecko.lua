
local spr = Sprite(32, 32, ColorMode.RGB)
spr.filename = "C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-sapspitter-gecko/source.aseprite"

-- Setup palette (12 opaque colors + transparent)
local pal = spr.palettes[1]
pal:resize(13)

local colors = {
  Color{ r=0, g=0, b=0, a=0 },          -- 0: trans
  Color{ r=27, g=38, b=20, a=255 },     -- 1: c_out (dark olive outline)
  Color{ r=47, g=107, b=20, a=255 },    -- 2: c_bd (lime green dark)
  Color{ r=78, g=156, b=39, a=255 },    -- 3: c_bm (lime green mid)
  Color{ r=118, g=196, b=63, a=255 },   -- 4: c_bl (lime green light highlight)
  Color{ r=77, g=48, b=25, a=255 },     -- 5: c_wd (bark brown dark)
  Color{ r=122, g=80, b=48, a=255 },    -- 6: c_wm (bark brown mid)
  Color{ r=163, g=114, b=72, a=255 },   -- 7: c_wl (bark brown light / toes)
  Color{ r=148, g=77, b=12, a=255 },    -- 8: c_ad (honey amber dark)
  Color{ r=217, g=130, b=24, a=255 },   -- 9: c_am (honey amber mid throat/sap)
  Color{ r=255, g=184, b=43, a=255 },   -- 10: c_al (honey amber light sac)
  Color{ r=255, g=224, b=102, a=255 },  -- 11: c_sl (glossy sap highlight)
  Color{ r=20, g=45, b=15, a=255 }      -- 12: c_de (dark eye for right eye)
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
local c_wd  = colors[6]
local c_wm  = colors[7]
local c_wl  = colors[8]
local c_ad  = colors[9]
local c_am  = colors[10]
local c_al  = colors[11]
local c_sl  = colors[12]
local c_de  = colors[13]

local function put(img, x, y, col)
  if x >= 0 and x < 32 and y >= 0 and y < 32 then
    img:drawPixel(x, y, col)
  end
end

local function drawOval(img, cx, cy, rx, ry, col)
  for y = math.max(0, math.floor(cy - ry)), math.min(31, math.floor(cy + ry)) do
    for x = math.max(0, math.floor(cx - rx)), math.min(31, math.floor(cx + rx)) do
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
  local sacPuff = 0

  if anim == "idle" then
    if animFrame == 2 then
      offsetY = -1
      sacPuff = 1
    end
  elseif anim == "walk" then
    if animFrame == 1 then
      offsetX = -1
      sacPuff = 0
    elseif animFrame == 2 then
      offsetY = 1
      sacPuff = 1
    elseif animFrame == 3 then
      offsetX = 1
      sacPuff = 0
    elseif animFrame == 4 then
      offsetY = 0
      sacPuff = 0
    end
  elseif anim == "attack" then
    if animFrame == 1 then
      offsetY = -2
      sacPuff = 2 -- Huge throat swell
    elseif animFrame == 2 then
      offsetY = 2  -- Lunge forward & contract throat
      sacPuff = -1
    elseif animFrame == 3 then
      offsetY = 1
      sacPuff = 0
    elseif animFrame == 4 then
      offsetY = 0
      sacPuff = 0
    end
  end

  local cx = 16 + offsetX
  local cy = 15 + offsetY

  ---------------------------------------------------------
  -- 1. DOWN DIRECTION
  ---------------------------------------------------------
  if dir == "down" then
    -- Outline
    drawOval(imgOutline, cx, cy-5, 4, 3, c_out) -- Head outline
    drawOval(imgOutline, cx, cy, 3+sacPuff, 3+sacPuff, c_out) -- Throat sac outline
    drawOval(imgOutline, cx, cy+6, 5, 5, c_out) -- Body outline
    -- Curled tail outline (bottom right curling clockwise up)
    put(imgOutline, cx+5, cy+10, c_out); put(imgOutline, cx+6, cy+10, c_out)
    put(imgOutline, cx+7, cy+9, c_out); put(imgOutline, cx+7, cy+8, c_out)
    put(imgOutline, cx+6, cy+7, c_out)

    -- Body (Head, Throat Sac, Body, Legs, Tail)
    -- Head
    drawOval(imgBody, cx, cy-5, 3, 2, c_bm)
    put(imgBody, cx-1, cy-6, c_bl) -- Head highlight
    put(imgBody, cx+1, cy-6, c_bl)

    -- Amber Throat Sac
    drawOval(imgBody, cx, cy, 2+sacPuff, 2+sacPuff, c_am)
    put(imgBody, cx, cy-1+sacPuff, c_al) -- Sac highlight
    put(imgBody, cx, cy+1+sacPuff, c_ad) -- Sac shadow

    -- Main Gecko Body & Bark Brown Back Stripes
    drawOval(imgBody, cx, cy+6, 4, 4, c_bm)
    put(imgBody, cx-1, cy+5, c_wm); put(imgBody, cx, cy+5, c_wm); put(imgBody, cx+1, cy+5, c_wm)
    put(imgBody, cx-2, cy+7, c_wd); put(imgBody, cx, cy+7, c_wd); put(imgBody, cx+2, cy+7, c_wd)

    -- Spread Toes (Leaf-shaped)
    -- Front Legs
    put(imgBody, cx-5, cy-1, c_bm); put(imgBody, cx-6, cy-2, c_wl); put(imgBody, cx-6, cy, c_wl)
    put(imgBody, cx+5, cy-1, c_bm); put(imgBody, cx+6, cy-2, c_wl); put(imgBody, cx+6, cy, c_wl)
    -- Hind Legs
    put(imgBody, cx-5, cy+8, c_bm); put(imgBody, cx-6, cy+7, c_wl); put(imgBody, cx-6, cy+9, c_wl)
    put(imgBody, cx+5, cy+8, c_bm); put(imgBody, cx+6, cy+7, c_wl); put(imgBody, cx+6, cy+9, c_wl)

    -- Tail (Curled clockwise: out bottom right, sweeping up)
    put(imgBody, cx+3, cy+9, c_bd)
    put(imgBody, cx+4, cy+10, c_bd)
    put(imgBody, cx+5, cy+10, c_bm)
    put(imgBody, cx+6, cy+9, c_bl)
    put(imgBody, cx+6, cy+8, c_bl)
    put(imgBody, cx+5, cy+7, c_sl) -- Tail tip droplet

    -- Details (Eyes & Sap Droplets)
    -- Anatomical RIGHT eye is DARKER (Screen Left in Down view)
    put(imgDetails, cx-3, cy-5, c_de) -- Right eye (Dark)
    -- Anatomical LEFT eye is BRIGHT AMBER (Screen Right in Down view)
    put(imgDetails, cx+3, cy-5, c_al) -- Left eye (Bright Amber)

    -- Sap droplets hanging from chin/throat
    put(imgDetails, cx-1, cy+2, c_sl)
    put(imgDetails, cx+1, cy+2, c_sl)

  ---------------------------------------------------------
  -- 2. LEFT DIRECTION
  ---------------------------------------------------------
  elseif dir == "left" then
    -- Facing Left. Creature's RIGHT side is FOREGROUND. Right eye (DARK) is visible!
    -- Outline
    drawOval(imgOutline, cx-6, cy-4, 4, 3, c_out) -- Head
    drawOval(imgOutline, cx-3, cy-1, 3+sacPuff, 3+sacPuff, c_out) -- Throat sac
    drawOval(imgOutline, cx+1, cy+3, 5, 4, c_out) -- Body
    -- Tail (Curling back right and up)
    put(imgOutline, cx+8, cy+6, c_out); put(imgOutline, cx+9, cy+5, c_out)
    put(imgOutline, cx+9, cy+4, c_out); put(imgOutline, cx+8, cy+3, c_out)

    -- Body
    drawOval(imgBody, cx-6, cy-4, 3, 2, c_bm) -- Head
    put(imgBody, cx-7, cy-5, c_bl)

    -- Throat Sac
    drawOval(imgBody, cx-3, cy-1, 2+sacPuff, 2+sacPuff, c_am)
    put(imgBody, cx-4, cy-2, c_al)
    put(imgBody, cx-2, cy, c_ad)

    -- Body
    drawOval(imgBody, cx+1, cy+3, 4, 3, c_bm)
    put(imgBody, cx, cy+2, c_wm); put(imgBody, cx+2, cy+2, c_wd)

    -- Legs (Foreground Right Legs, Background Left Legs)
    -- Front Foreground Leg (Right)
    put(imgBody, cx-4, cy+2, c_bm); put(imgBody, cx-6, cy+3, c_wl); put(imgBody, cx-5, cy+4, c_wl)
    -- Hind Foreground Leg (Right)
    put(imgBody, cx+3, cy+6, c_bm); put(imgBody, cx+2, cy+7, c_wl); put(imgBody, cx+4, cy+8, c_wl)
    -- Background Legs (Darker)
    put(imgBody, cx-2, cy+1, c_bd)
    put(imgBody, cx+5, cy+4, c_bd)

    -- Tail
    put(imgBody, cx+5, cy+5, c_bd)
    put(imgBody, cx+7, cy+6, c_bm)
    put(imgBody, cx+8, cy+5, c_bl)
    put(imgBody, cx+8, cy+4, c_bl)
    put(imgBody, cx+7, cy+3, c_sl) -- Sap tip

    -- Details
    -- Eye: Foreground Right Eye is DARK!
    put(imgDetails, cx-7, cy-4, c_de)

    -- Sap droplet under jaw
    put(imgDetails, cx-5, cy, c_sl)

  ---------------------------------------------------------
  -- 3. RIGHT DIRECTION
  ---------------------------------------------------------
  elseif dir == "right" then
    -- Facing Right. Creature's LEFT side is FOREGROUND. Left eye (BRIGHT AMBER) is visible!
    -- Outline
    drawOval(imgOutline, cx+6, cy-4, 4, 3, c_out) -- Head
    drawOval(imgOutline, cx+3, cy-1, 3+sacPuff, 3+sacPuff, c_out) -- Throat sac
    drawOval(imgOutline, cx-1, cy+3, 5, 4, c_out) -- Body
    -- Tail (Curling back left and up)
    put(imgOutline, cx-8, cy+6, c_out); put(imgOutline, cx-9, cy+5, c_out)
    put(imgOutline, cx-9, cy+4, c_out); put(imgOutline, cx-8, cy+3, c_out)

    -- Body
    drawOval(imgBody, cx+6, cy-4, 3, 2, c_bm) -- Head
    put(imgBody, cx+7, cy-5, c_bl)

    -- Throat Sac
    drawOval(imgBody, cx+3, cy-1, 2+sacPuff, 2+sacPuff, c_am)
    put(imgBody, cx+4, cy-2, c_al)
    put(imgBody, cx+2, cy, c_ad)

    -- Body
    drawOval(imgBody, cx-1, cy+3, 4, 3, c_bm)
    put(imgBody, cx, cy+2, c_wm); put(imgBody, cx-2, cy+2, c_wd)

    -- Legs (Foreground Left Legs, Background Right Legs)
    -- Front Foreground Leg (Left)
    put(imgBody, cx+4, cy+2, c_bm); put(imgBody, cx+6, cy+3, c_wl); put(imgBody, cx+5, cy+4, c_wl)
    -- Hind Foreground Leg (Left)
    put(imgBody, cx-3, cy+6, c_bm); put(imgBody, cx-2, cy+7, c_wl); put(imgBody, cx-4, cy+8, c_wl)
    -- Background Legs (Darker)
    put(imgBody, cx+2, cy+1, c_bd)
    put(imgBody, cx-5, cy+4, c_bd)

    -- Tail
    put(imgBody, cx-5, cy+5, c_bd)
    put(imgBody, cx-7, cy+6, c_bm)
    put(imgBody, cx-8, cy+5, c_bl)
    put(imgBody, cx-8, cy+4, c_bl)
    put(imgBody, cx-7, cy+3, c_sl) -- Sap tip

    -- Details
    -- Eye: Foreground Left Eye is BRIGHT AMBER!
    put(imgDetails, cx+7, cy-4, c_al)

    -- Sap droplet under jaw
    put(imgDetails, cx+5, cy, c_sl)

  ---------------------------------------------------------
  -- 4. UP DIRECTION
  ---------------------------------------------------------
  elseif dir == "up" then
    -- Facing Up (away from viewer).
    -- Creature's RIGHT is Screen Right, Creature's LEFT is Screen Left.
    -- Outline
    drawOval(imgOutline, cx, cy-5, 4, 3, c_out) -- Head
    drawOval(imgOutline, cx, cy+4, 5, 5, c_out) -- Body
    -- Curled tail outline (curling clockwise viewed from top: bottom right sweeping up)
    put(imgOutline, cx+5, cy+9, c_out); put(imgOutline, cx+6, cy+8, c_out)
    put(imgOutline, cx+6, cy+7, c_out); put(imgOutline, cx+5, cy+6, c_out)

    -- Body
    drawOval(imgBody, cx, cy-5, 3, 2, c_bm) -- Head
    put(imgBody, cx, cy-6, c_bd) -- Head shadow facing up

    -- Body & Bark Markings
    drawOval(imgBody, cx, cy+4, 4, 4, c_bm)
    put(imgBody, cx-2, cy+3, c_wm); put(imgBody, cx, cy+3, c_wd); put(imgBody, cx+2, cy+3, c_wm)
    put(imgBody, cx-1, cy+5, c_wd); put(imgBody, cx+1, cy+5, c_wd)

    -- Legs
    -- Front Legs
    put(imgBody, cx-5, cy-2, c_bm); put(imgBody, cx-6, cy-3, c_wl); put(imgBody, cx-6, cy-1, c_wl)
    put(imgBody, cx+5, cy-2, c_bm); put(imgBody, cx+6, cy-3, c_wl); put(imgBody, cx+6, cy-1, c_wl)
    -- Hind Legs
    put(imgBody, cx-5, cy+6, c_bm); put(imgBody, cx-6, cy+5, c_wl); put(imgBody, cx-6, cy+7, c_wl)
    put(imgBody, cx+5, cy+6, c_bm); put(imgBody, cx+6, cy+5, c_wl); put(imgBody, cx+6, cy+7, c_wl)

    -- Tail (Curled clockwise viewed from top: bottom right sweeping up)
    put(imgBody, cx+3, cy+8, c_bd)
    put(imgBody, cx+4, cy+9, c_bm)
    put(imgBody, cx+5, cy+8, c_bl)
    put(imgBody, cx+5, cy+7, c_bl)
    put(imgBody, cx+4, cy+6, c_sl)

    -- Details
    -- Eyes peeking on side: Right eye (Screen Right) is DARK, Left eye (Screen Left) is BRIGHT
    put(imgDetails, cx+3, cy-5, c_de) -- Right eye (Dark)
    put(imgDetails, cx-3, cy-5, c_al) -- Left eye (Bright)
  end

  ---------------------------------------------------------
  -- EFFECTS LAYER (Sap Spit Attack: globules & bursting puddle)
  ---------------------------------------------------------
  if anim == "attack" then
    if animFrame == 2 then
      -- 1st arcing sap globule released from mouth
      if dir == "down" then
        put(imgEffects, cx, cy-1, c_al); put(imgEffects, cx, cy, c_am); put(imgEffects, cx, cy+1, c_sl)
      elseif dir == "left" then
        put(imgEffects, cx-9, cy-4, c_al); put(imgEffects, cx-10, cy-4, c_am); put(imgEffects, cx-11, cy-3, c_sl)
      elseif dir == "right" then
        put(imgEffects, cx+9, cy-4, c_al); put(imgEffects, cx+10, cy-4, c_am); put(imgEffects, cx+11, cy-3, c_sl)
      elseif dir == "up" then
        put(imgEffects, cx, cy-8, c_al); put(imgEffects, cx, cy-9, c_am); put(imgEffects, cx, cy-10, c_sl)
      end

    elseif animFrame == 3 then
      -- Globule travels further and bursts
      if dir == "down" then
        -- Arcing globule
        put(imgEffects, cx, cy+4, c_am); put(imgEffects, cx, cy+5, c_al)
        -- Splash droplets
        put(imgEffects, cx-2, cy+5, c_sl); put(imgEffects, cx+2, cy+5, c_sl)

      elseif dir == "left" then
        put(imgEffects, cx-12, cy-3, c_am); put(imgEffects, cx-13, cy-2, c_al)
        put(imgEffects, cx-13, cy-5, c_sl); put(imgEffects, cx-12, cy, c_sl)

      elseif dir == "right" then
        put(imgEffects, cx+12, cy-3, c_am); put(imgEffects, cx+13, cy-2, c_al)
        put(imgEffects, cx+13, cy-5, c_sl); put(imgEffects, cx+12, cy, c_sl)

      elseif dir == "up" then
        put(imgEffects, cx, cy-11, c_am); put(imgEffects, cx, cy-12, c_al)
        put(imgEffects, cx-2, cy-11, c_sl); put(imgEffects, cx+2, cy-11, c_sl)
      end

    elseif animFrame == 4 then
      -- Sticky sap puddle spreads on ground with droplets
      if dir == "down" then
        drawOval(imgEffects, cx, cy+10, 3, 1, c_am)
        put(imgEffects, cx-1, cy+10, c_al); put(imgEffects, cx+1, cy+10, c_sl)
        put(imgEffects, cx-4, cy+9, c_sl); put(imgEffects, cx+4, cy+11, c_sl)

      elseif dir == "left" then
        drawOval(imgEffects, cx-14, cy+3, 2, 1, c_am)
        put(imgEffects, cx-14, cy+3, c_al); put(imgEffects, cx-13, cy+3, c_sl)
        put(imgEffects, cx-15, cy, c_sl); put(imgEffects, cx-12, cy+5, c_sl)

      elseif dir == "right" then
        drawOval(imgEffects, cx+14, cy+3, 2, 1, c_am)
        put(imgEffects, cx+14, cy+3, c_al); put(imgEffects, cx+13, cy+3, c_sl)
        put(imgEffects, cx+15, cy, c_sl); put(imgEffects, cx+12, cy+5, c_sl)

      elseif dir == "up" then
        drawOval(imgEffects, cx, cy-13, 3, 1, c_am)
        put(imgEffects, cx-1, cy-13, c_al); put(imgEffects, cx+1, cy-13, c_sl)
        put(imgEffects, cx-4, cy-14, c_sl); put(imgEffects, cx+4, cy-12, c_sl)
      end
    end
  end

  spr:newCel(layerOutline, f, imgOutline)
  spr:newCel(layerBody, f, imgBody)
  spr:newCel(layerDetails, f, imgDetails)
  spr:newCel(layerEffects, f, imgEffects)
end

spr:saveCopyAs("C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-sapspitter-gecko/source.aseprite")

app.command.ExportSpriteSheet{
  ui=false,
  type="rows",
  columns=10,
  rows=4,
  width=320,
  height=128,
  textureFilename="C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-sapspitter-gecko/sheet.png",
  exportMode="sprite",
  trim=false
}

local thumbSpr = Sprite(32, 32, ColorMode.RGB)
local thumbImg = Image(32, 32, ColorMode.RGB)
local f1Body = spr.layers[2]:cel(1).image
for y=0,31 do for x=0,31 do thumbImg:drawPixel(x, y, f1Body:getPixel(x, y)) end end
thumbSpr:newCel(thumbSpr.layers[1], 1, thumbImg)
thumbSpr:saveCopyAs("C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-sapspitter-gecko/thumbnail.png")
thumbSpr:close()

spr:close()
print("SUCCESSFULLY_CREATED_SAPSPITTER_GECKO")
