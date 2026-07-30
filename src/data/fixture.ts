import assetJson from "../../fixtures/library/assets/fixture-ember-slime-001/asset.json";
import reviewJson from "../../fixtures/library/assets/fixture-ember-slime-001/review.json";
import revisionJson from "../../fixtures/library/assets/fixture-ember-slime-001/revisions/r001/revision.json";
import validationJson from "../../fixtures/library/assets/fixture-ember-slime-001/revisions/r001/validation.json";
import type {
  AssetRecord,
  ReviewRecord,
  RevisionRecord,
  ValidationRecord,
  ViewerAsset,
} from "../domain/types";

const sheetUrl = new URL(
  "../../fixtures/library/assets/fixture-ember-slime-001/revisions/r001/sheet.png",
  import.meta.url,
).href;
const thumbnailUrl = new URL(
  "../../fixtures/library/assets/fixture-ember-slime-001/revisions/r001/thumbnail.png",
  import.meta.url,
).href;

export const fixtureAsset: ViewerAsset = {
  asset: assetJson as AssetRecord,
  review: reviewJson as ReviewRecord,
  revision: revisionJson as RevisionRecord,
  validation: validationJson as ValidationRecord,
  sheetUrl,
  thumbnailUrl,
  origin: "fixture",
};
