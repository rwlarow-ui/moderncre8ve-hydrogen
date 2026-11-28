---
name: fal-render
description: Turn a Furniture Studio concept into photoreal concept renders with fal.ai, then check them against the cut list. Use when the user wants to render, visualize, mock up or prototype a furniture concept from /ops/design or the furniture-studio MCP, asks for fal / fal.ai images of a design, or wants render variations (wood, finish, angle) of a concept.
---

# fal concept renders for Furniture Studio

Two MCP servers from `.mcp.json` work together:
- **furniture-studio** (local, no network) owns the design: concepts, revisions, cut list, render prompt.
- **fal** (`https://mcp.fal.ai/mcp`, remote) generates the images. It signs in with the user's own fal account over OAuth — no API key in the repo or in `.env`.

If fal tools are missing or return 401, ask the user to run `/mcp`, choose **fal** and **Authenticate**. Don't look for or ask for a fal API key.

## Workflow

1. **Get the concept.**
   - From the MCP: `list_concepts` / `get_concept`.
   - From the web app: `/ops/design` keeps drafts in the browser only, so ask the user to export the JSON (*Export JSON*), then `import_concept` it.
   - Run `evaluate_concept` and don't render a concept whose geometry collides. Fix it first.
2. **Build the prompt** with furniture-studio `build_render_prompt` (concept id + revision). Use it as is. Variations (wood, finish, camera angle, room setting) are edits to that prompt: keep the drawer counts and dimensions from the original text.
3. **Pick the model with fal.** Call `recommend_model` for a photoreal product still, 4:3, no text. Then call `get_model_schema` to get its real input names. Don't hard-code model ids from memory.
4. **Ask before spending.** Every generation costs fal credits. Tell the user, in one message:
   - the model
   - how many images
   - the price, if fal returns one

   Then wait for a yes. Default to 1–2 images per request. A yes covers that batch only; retries and new variations need another yes.
5. **Generate** with `submit_job` (or `run_model`), then `check_job` / `get_job_result`.
6. **Save** the outputs under `~/.moderncre8ve/furniture-studio/renders/<concept-id>/r<revision>/` (or `$FURNITURE_STUDIO_DIR/renders/...`), next to the concept files.
   - Use `save_job_outputs` when it offers a local destination.
   - Otherwise download each returned file URL with `curl -fsSL -o <path> <url>`.
   - Write a `prompt.txt` beside the images with the exact prompt, the model id and the job id.
7. **Review against the design.** Compare each image with `get_cut_list` and report mismatches plainly:
   - drawer count (cabinet form: left / right; apron form: total, and which one is the wider lead drawer)
   - proportions (cabinet: tower vs case widths, knee opening, height; apron: slab sides to the floor, apron depth, knee clearance)
   - wood and finish
   - cane inserts and leather pulls (cabinet form); apron-form fronts have no hardware

   Renders don't lock geometry. A good-looking image with the wrong drawer count is a failed render.

## Rules
- Renders are **concept visualization only**: never present them as product photos, and never upload them to Shopify, the storefront or marketing channels without the user saying so.
- Don't send customer names, order data or anything from the ops-dashboard MCP to fal. Only the design prompt and, if the user supplies one, a reference image.
- Reference images: only upload what the user hands you (`prepare_upload`). Keep the brand palette and fonts from the `brand` skill in mind for room-setting variations.
