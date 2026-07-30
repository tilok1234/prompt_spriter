# Aseprite Pro MCP capability inventory

**Observed:** 2026-07-30  
**Mode:** read-only discovery; no MCP configuration was changed

This records the capabilities visible to the current Codex session. Antigravity
must still verify that the same capability families are available in its own
session before starting a live job.

## Confirmed creation capabilities

- `create_sprite`
- `add_layer`
- `add_frame`
- `put_pixel`
- `put_pixels`
- `draw_symmetry`
- `outline`

These are sufficient to create a custom 32x32 RGBA source with the repository's
own layer contract. `create_character_template` is also available, but its
default shadow, layers, frame counts, and tags do not match Prompt Spriter. Do
not use its defaults for a contracted job.

## Confirmed animation capabilities

- `create_tag`
- `set_tag_range`
- `set_frame_duration`
- `set_frame_range_duration`
- `get_frames`
- `get_tags`
- `get_animation_data`
- `validate_animation`

## Confirmed save, export, and review capabilities

- `save_sprite`
- `export_sprite_sheet`
- `export_tags_as_sheets`
- `get_sprite_screenshot`
- `get_animation_preview`
- `get_sprite_bounds`

Use `save_sprite` for the assigned `source.aseprite`, and
`export_sprite_sheet` for the exact untrimmed 1x PNG required by the job.
Screenshots and previews support creator-side inspection but do not represent
user approval.

## Capabilities intentionally outside this project

Godot-oriented tools were visible, including `export_for_godot`,
`sync_to_godot_project`, and `generate_spriteframes_tres`. They are not part of
Prompt Spriter and must not be used for this workflow.

## Guardrail

If a required capability is absent in Antigravity, report the missing
capability. Do not edit, install, or replace MCP configuration to compensate.
