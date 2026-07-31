# Schemas

These machine-readable contracts define the Phase 1 data boundary:

- `common.schema.json` - shared IDs, versions, paths, artifacts, and layout;
- `category.schema.json` - versioned category contracts;
- `style-profile.schema.json` - versioned visual style profiles;
- `asset.schema.json` - application-owned stable asset identity;
- `revision.schema.json` - immutable ingested revision;
- `review.schema.json` - application-owned candidate and approval state;
- `submission.schema.json` - agent-authored staging submission;
- `validation.schema.json` - technical validation evidence;
- `completion.schema.json` - final staging completion marker;
- `batch.schema.json` - creation and revision batches;
- `promptinator.schema.json` - application-owned prompt queue, exclusive claim,
  completion provenance, and event history.

Schemas use JSON Schema 2020-12. Semantic checks supplement schema validation
for calculated dimensions, timeline continuity, safe relative paths, and legal
review transitions.
