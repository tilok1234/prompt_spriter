import { useEffect, useMemo, useState } from "react";
import { Icon } from "./components/Icon";
import {
  ReviewDialog,
  type ReviewDialogMode,
} from "./components/ReviewDialog";
import { RevisionBatchDialog } from "./components/RevisionBatchDialog";
import { RevisionBatchesView } from "./components/RevisionBatchesView";
import { PromptinatorView } from "./components/PromptinatorView";
import { SpriteFrame } from "./components/SpriteFrame";
import { fixtureAsset } from "./data/fixture";
import {
  createRevisionBatch as persistRevisionBatch,
  loadLocalLibrary,
  loadRevisionBatches,
  mutateReview,
  type RevisionBatchEntry,
  type ReviewNoteDraft,
  type ReviewMutationAction,
} from "./data/library";
import {
  loadPromptinatorStore,
  type PromptinatorStore,
} from "./data/promptinator";
import { routeAfterReviewAction } from "./domain/review-navigation";
import type { ReviewNote, ViewerAsset } from "./domain/types";
import "./styles.css";

type Section = "intake" | "revise" | "library" | "archive";
type StageBackground = "checker" | "midnight" | "paper";

const titleCase = (value: string) =>
  value.replace(/(^|-)([a-z])/g, (_, prefix, letter: string) =>
    `${prefix === "-" ? " " : ""}${letter.toUpperCase()}`,
  );

const belongsToSection = (item: ViewerAsset, section: Section) => {
  if (section === "library") {
    return item.review.approvedRevisionId === item.revision.id;
  }
  return (
    item.review.candidate?.revisionId === item.revision.id &&
    item.review.candidate.lane === section
  );
};

const describeNoteTarget = (note: ReviewNote) => {
  const parts = [];
  if (note.target.direction) parts.push(note.target.direction);
  if (note.target.animation) parts.push(note.target.animation);
  if (note.target.frames?.length) {
    parts.push(`frames ${note.target.frames.join(", ")}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Entire sprite";
};

const describeRevisionRole = (item: ViewerAsset) => {
  const roles = [];
  if (item.review.approvedRevisionId === item.revision.id) {
    roles.push("Approved");
  }
  if (item.review.candidate?.revisionId === item.revision.id) {
    roles.push(titleCase(item.review.candidate.lane));
  }
  return roles.length > 0 ? roles.join(" + ") : "History";
};

const matchesSearch = (item: ViewerAsset, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return (
    item.asset.name.toLowerCase().includes(normalizedQuery) ||
    item.asset.id.toLowerCase().includes(normalizedQuery) ||
    item.revision.request.toLowerCase().includes(normalizedQuery) ||
    item.asset.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
  );
};

const formatCreatedAt = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const batchSelectionKey = (item: ViewerAsset) =>
  `${item.asset.id}:${item.revision.id}`;

const navigation: Array<{
  id: Exclude<Section, "archive">;
  label: string;
  icon: "intake" | "revise" | "library";
}> = [
  {
    id: "intake",
    label: "Intake",
    icon: "intake",
  },
  {
    id: "revise",
    label: "Revise",
    icon: "revise",
  },
  {
    id: "library",
    label: "Library",
    icon: "library",
  },
];

const actionForDialog: Record<ReviewDialogMode, ReviewMutationAction> = {
  approve: "approve",
  "send-to-revise": "send-to-revise",
  "add-note": "add-note",
  "start-revision": "start-revision",
  archive: "archive",
  restore: "restore",
};

function useHashRoute() {
  const readHash = () => window.location.hash || "#/intake";
  const [hash, setHash] = useState(readHash);

  useEffect(() => {
    const update = () => setHash(readHash());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  return hash;
}

function LaneEmpty({
  section,
  filtered = false,
}: {
  section: Section;
  filtered?: boolean;
}) {
  if (filtered) {
    return (
      <div className="empty-state">
        <span className="empty-state__glyph">?</span>
        <h2>No matching sprites</h2>
        <p>Try another name, tag, or asset ID.</p>
      </div>
    );
  }

  const copy = {
    intake: "Completed Antigravity candidates will collect here.",
    revise: "Reviewed candidates with actionable notes will collect here.",
    library: "Only revisions you explicitly approve will appear here.",
    archive: "Only candidates archived from Revise will appear here.",
  }[section];

  return (
    <div className="empty-state">
      <span className="empty-state__glyph">+</span>
      <h2>No {section} items yet</h2>
      <p>{copy}</p>
    </div>
  );
}

function App() {
  const route = useHashRoute();
  const routeParts = route.split("/");
  const requestedSection = routeParts[1] || "intake";
  const isBatchesPage = requestedSection === "batches";
  const isPromptinatorPage = requestedSection === "promptinator";
  const isSpecialPage = isBatchesPage || isPromptinatorPage;
  const section = [...navigation.map((entry) => entry.id), "archive"].includes(
    requestedSection as Section,
  )
    ? (requestedSection as Section)
    : "intake";
  const [query, setQuery] = useState("");
  const [assets, setAssets] = useState<ViewerAsset[]>([fixtureAsset]);
  const [librarySource, setLibrarySource] = useState<"fixture" | "local">(
    "fixture",
  );
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [selectedAnimationId, setSelectedAnimationId] = useState("idle");
  const [selectedDirection, setSelectedDirection] = useState("down");
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [stageBackground, setStageBackground] =
    useState<StageBackground>("checker");
  const [comparisonRevisionId, setComparisonRevisionId] = useState("");
  const [dialogMode, setDialogMode] = useState<ReviewDialogMode | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [batches, setBatches] = useState<RevisionBatchEntry[]>([]);
  const [batchLoadError, setBatchLoadError] = useState<string | null>(null);
  const [selectedBatchKeys, setSelectedBatchKeys] = useState<string[]>([]);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchPending, setBatchPending] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [createdBatch, setCreatedBatch] =
    useState<RevisionBatchEntry | null>(null);
  const [promptinatorStore, setPromptinatorStore] =
    useState<PromptinatorStore>({
      kind: "promptinator-store",
      schemaVersion: "1.3.0",
      updatedAt: "1970-01-01T00:00:00.000Z",
      entries: [],
    });
  const [promptinatorLoadError, setPromptinatorLoadError] = useState<
    string | null
  >(null);
  const [requestCopyState, setRequestCopyState] = useState<
    "idle" | "copied" | "error"
  >("idle");

  useEffect(() => {
    let active = true;
    loadLocalLibrary()
      .then((loadedAssets) => {
        if (!active || loadedAssets.length === 0) return;
        setAssets(loadedAssets);
        setLibrarySource("local");
        setLibraryError(null);
      })
      .catch((error) => {
        if (!active) return;
        setLibraryError(
          error instanceof Error ? error.message : String(error),
        );
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    loadRevisionBatches()
      .then((loadedBatches) => {
        if (!active) return;
        setBatches(loadedBatches);
        setBatchLoadError(null);
      })
      .catch((error) => {
        if (!active) return;
        setBatchLoadError(
          error instanceof Error ? error.message : String(error),
        );
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    loadPromptinatorStore()
      .then((store) => {
        if (!active) return;
        setPromptinatorStore(store);
        setPromptinatorLoadError(null);
      })
      .catch((error) => {
        if (!active) return;
        setPromptinatorLoadError(
          error instanceof Error ? error.message : String(error),
        );
      });
    return () => {
      active = false;
    };
  }, []);

  const laneCounts = useMemo(
    () => ({
      intake: assets.filter((asset) => belongsToSection(asset, "intake"))
        .length,
      revise: assets.filter((asset) => belongsToSection(asset, "revise"))
        .length,
      library: assets.filter((asset) => belongsToSection(asset, "library"))
        .length,
      archive: assets.filter((asset) => belongsToSection(asset, "archive"))
        .length,
    }),
    [assets],
  );
  const promptinatorReadyCount = promptinatorStore.entries.filter(
    (entry) => entry.state === "ready",
  ).length;
  const sectionItems = assets.filter((asset) =>
    belongsToSection(asset, section),
  );
  const filteredItems = sectionItems.filter((asset) =>
    matchesSearch(asset, query),
  );
  const filteredBatches = batches.filter((entry) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return true;
    return (
      entry.batch.id.toLowerCase().includes(normalizedQuery) ||
      entry.batch.items.some((batchItem) =>
        batchItem.assetId.toLowerCase().includes(normalizedQuery),
      )
    );
  });
  const selectedBatchKeySet = new Set(selectedBatchKeys);
  const selectedBatchItems = assets.filter(
    (candidate) =>
      belongsToSection(candidate, "revise") &&
      selectedBatchKeySet.has(batchSelectionKey(candidate)),
  );
  const requestedAssetId = routeParts[3];
  const requestedRevisionId = routeParts[4];
  const item =
    filteredItems.find(
      (asset) =>
        asset.asset.id === requestedAssetId &&
        asset.revision.id === requestedRevisionId,
    ) ??
    filteredItems[0] ??
    sectionItems[0] ??
    assets[0] ??
    fixtureAsset;
  const selectedAnimation =
    item.revision.animations.find(
      (animation) => animation.id === selectedAnimationId,
    ) ?? item.revision.animations[0];
  const assetRevisions = useMemo(
    () =>
      assets
        .filter((candidate) => candidate.asset.id === item.asset.id)
        .sort((left, right) =>
          right.revision.id.localeCompare(left.revision.id),
        ),
    [assets, item.asset.id],
  );
  const comparisonItem =
    assetRevisions.find(
      (candidate) =>
        candidate.revision.id === comparisonRevisionId &&
        candidate.revision.id !== item.revision.id,
    ) ??
    assetRevisions.find(
      (candidate) => candidate.revision.id !== item.revision.id,
    ) ??
    null;
  const comparisonAnimation = comparisonItem
    ? (comparisonItem.revision.animations.find(
        (animation) => animation.id === selectedAnimation.id,
      ) ?? comparisonItem.revision.animations[0])
    : null;
  const comparisonDirection =
    comparisonItem &&
    comparisonItem.revision.directions.includes(selectedDirection)
      ? selectedDirection
      : comparisonItem?.revision.directions[0];
  const comparisonFrameIndex = comparisonAnimation
    ? Math.min(frameIndex, comparisonAnimation.frames - 1)
    : 0;
  const exactCandidate =
    item.review.candidate?.revisionId === item.revision.id
      ? item.review.candidate
      : null;
  const reviewActionsEnabled =
    librarySource === "local" && item.origin === "local-library";
  const batchActionsEnabled = librarySource === "local";

  useEffect(() => {
    const availableKeys = new Set(
      assets
        .filter((candidate) => belongsToSection(candidate, "revise"))
        .map(batchSelectionKey),
    );
    setSelectedBatchKeys((current) => {
      const next = current.filter((key) => availableKeys.has(key));
      return next.length === current.length ? current : next;
    });
  }, [assets]);

  useEffect(() => {
    setFrameIndex(0);
  }, [selectedAnimationId, selectedDirection]);

  useEffect(() => {
    setRequestCopyState("idle");
  }, [item.asset.id, item.revision.id]);

  useEffect(() => {
    if (
      !item.revision.animations.some(
        (animation) => animation.id === selectedAnimationId,
      )
    ) {
      setSelectedAnimationId(item.revision.animations[0].id);
    }
    if (!item.revision.directions.includes(selectedDirection)) {
      setSelectedDirection(item.revision.directions[0]);
    }
  }, [item, selectedAnimationId, selectedDirection]);

  useEffect(() => {
    const otherRevisions = assetRevisions.filter(
      (candidate) => candidate.revision.id !== item.revision.id,
    );
    if (otherRevisions.length === 0) {
      setComparisonRevisionId("");
      return;
    }
    if (
      !otherRevisions.some(
        (candidate) => candidate.revision.id === comparisonRevisionId,
      )
    ) {
      const parent = otherRevisions.find(
        (candidate) =>
          candidate.revision.id === item.revision.parentRevisionId,
      );
      setComparisonRevisionId(
        (parent ?? otherRevisions[0]).revision.id,
      );
    }
  }, [
    assetRevisions,
    comparisonRevisionId,
    item.revision.id,
    item.revision.parentRevisionId,
  ]);

  useEffect(() => {
    if (!playing) return undefined;
    const interval = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % selectedAnimation.frames);
    }, selectedAnimation.durationMs);
    return () => window.clearInterval(interval);
  }, [playing, selectedAnimation]);

  const changeSection = (nextSection: Section) => {
    window.location.hash = `#/${nextSection}`;
  };

  const selectAsset = (selectedItem: ViewerAsset) => {
    window.location.hash = `#/${section}/review/${selectedItem.asset.id}/${selectedItem.revision.id}`;
  };

  const toggleBatchSelection = (candidate: ViewerAsset) => {
    const key = batchSelectionKey(candidate);
    setSelectedBatchKeys((current) =>
      current.includes(key)
        ? current.filter((candidateKey) => candidateKey !== key)
        : [...current, key],
    );
  };

  const openBatchDialog = () => {
    if (!batchActionsEnabled || selectedBatchItems.length === 0) return;
    setBatchError(null);
    setCreatedBatch(null);
    setBatchDialogOpen(true);
  };

  const closeBatchDialog = () => {
    if (batchPending) return;
    setBatchError(null);
    setBatchDialogOpen(false);
  };

  const submitRevisionBatch = async (batchId: string) => {
    if (!batchActionsEnabled || selectedBatchItems.length === 0) return;
    setBatchPending(true);
    setBatchError(null);
    try {
      const result = await persistRevisionBatch({
        batchId,
        selections: selectedBatchItems.map((candidate) => ({
          assetId: candidate.asset.id,
          revisionId: candidate.revision.id,
          expectedUpdatedAt: candidate.review.updatedAt,
        })),
      });
      setBatches(result.items);
      setCreatedBatch(result.created);
      setSelectedBatchKeys([]);
      setActionNotice(
        `${result.created.batch.id} saved with ${result.created.batch.items.length} revision item${
          result.created.batch.items.length === 1 ? "" : "s"
        }.`,
      );
    } catch (error) {
      setBatchError(error instanceof Error ? error.message : String(error));
    } finally {
      setBatchPending(false);
    }
  };

  const openReviewDialog = (mode: ReviewDialogMode) => {
    setActionError(null);
    setActionNotice(null);
    setDialogMode(mode);
  };

  const closeReviewDialog = () => {
    if (actionPending) return;
    setActionError(null);
    setDialogMode(null);
  };

  const submitReviewAction = async (note?: ReviewNoteDraft) => {
    if (!dialogMode || !reviewActionsEnabled) return;
    setActionPending(true);
    setActionError(null);
    try {
      const mutationAction = actionForDialog[dialogMode];
      const updatedAssets = await mutateReview({
        action: mutationAction,
        assetId: item.asset.id,
        revisionId: item.revision.id,
        expectedUpdatedAt: item.review.updatedAt,
        ...(note ? { note } : {}),
      });
      setAssets(updatedAssets);
      setLibrarySource("local");

      const nextSection: Section =
        dialogMode === "approve"
          ? "library"
          : dialogMode === "archive"
            ? "archive"
            : "revise";
      const notice = {
        approve: `${item.asset.name} ${item.revision.id} is now the approved Library revision.`,
        "send-to-revise": `${item.asset.name} moved to Revise with its first note.`,
        "add-note": `Revision note added to ${item.asset.name}.`,
        "start-revision": `${item.asset.name} opened in Revise while ${item.revision.id} stays approved.`,
        archive: `${item.asset.name} moved from Revise to Archive.`,
        restore: `${item.asset.name} restored to Revise.`,
      }[dialogMode];
      setActionNotice(notice);
      setDialogMode(null);
      window.location.hash = routeAfterReviewAction({
        action: mutationAction,
        currentSection: section,
        nextSection,
        assetId: item.asset.id,
        revisionId: item.revision.id,
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setActionPending(false);
    }
  };

  const copyRevisionRequest = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable.");
      }
      await navigator.clipboard.writeText(item.revision.request);
      setRequestCopyState("copied");
    } catch {
      setRequestCopyState("error");
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand__mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div>
            <strong>PROMPT</strong>
            <strong>SPRITER</strong>
          </div>
        </div>

        <p className="sidebar__eyebrow">WORKSPACE</p>
        <nav className="lane-nav" aria-label="Review lanes">
          {navigation.map((entry) => (
            <button
              type="button"
              key={entry.id}
              className={
                !isSpecialPage && section === entry.id ? "is-active" : ""
              }
              onClick={() => changeSection(entry.id)}
            >
              <Icon name={entry.icon} />
              <span>{entry.label}</span>
              <b>{laneCounts[entry.id]}</b>
            </button>
          ))}
        </nav>

        <p className="sidebar__eyebrow sidebar__eyebrow--spaced">
          ORGANIZE
        </p>
        <div className="secondary-nav">
          <button type="button">
            <Icon name="category" />
            <span>Categories</span>
          </button>
          <button
            type="button"
            className={isBatchesPage ? "is-active" : ""}
            onClick={() => {
              window.location.hash = "#/batches";
            }}
          >
            <Icon name="batch" />
            <span>Batches</span>
            <b>{batches.length}</b>
          </button>
          <button
            type="button"
            className={isPromptinatorPage ? "is-active" : ""}
            onClick={() => {
              window.location.hash = "#/promptinator";
            }}
          >
            <Icon name="prompt" />
            <span>Promptinator</span>
            <b>{promptinatorReadyCount}</b>
          </button>
          <button
            type="button"
            className={
              !isSpecialPage && section === "archive" ? "is-active" : ""
            }
            onClick={() => changeSection("archive")}
          >
            <Icon name="archive" />
            <span>Archive</span>
            <b>{laneCounts.archive}</b>
          </button>
        </div>

        <div className="sidebar__category">
          <p className="sidebar__eyebrow">ACTIVE CATEGORY</p>
          <div className="category-token">
            <span>32</span>
            <div>
              <strong>Enemy Mob</strong>
              <small>4 directions · draft</small>
            </div>
          </div>
        </div>

        <div className="sidebar__footer">
          <span className="status-light" />
          <div>
            <strong>Local library</strong>
            <small>
              {librarySource === "local"
                ? `${assets.length} revision${assets.length === 1 ? "" : "s"} loaded`
                : "Phase 1 fixture"}
            </small>
          </div>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div>
            <p className="topbar__kicker">
              {isBatchesPage
                ? "REVISION DISPATCH"
                : isPromptinatorPage
                  ? "CREATION DISPATCH"
                  : "REVIEW QUEUE"}
            </p>
            <h1>
              {isBatchesPage
                ? "Batches"
                : isPromptinatorPage
                  ? "Promptinator"
                  : titleCase(section)}
            </h1>
          </div>
          <label className="search">
            <Icon name="search" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                isBatchesPage
                  ? "Search batches and asset IDs"
                  : isPromptinatorPage
                    ? "Search prompts, collections, concepts"
                    : "Search sprites, tags, IDs"
              }
              aria-label={
                isBatchesPage
                  ? "Search revision batches"
                  : isPromptinatorPage
                    ? "Search Promptinator"
                    : "Search sprites"
              }
            />
            <kbd>CTRL K</kbd>
          </label>
          <div className="topbar__stat">
            <strong>
              {isBatchesPage
                ? filteredBatches.length
                : isPromptinatorPage
                  ? promptinatorReadyCount
                  : laneCounts[section]}
            </strong>
            <span>
              {isBatchesPage
                ? "revision batches"
                : isPromptinatorPage
                  ? "ready prompts"
                  : section === "intake"
                    ? "awaiting review"
                    : "items"}
            </span>
          </div>
        </header>

        {isBatchesPage ? (
          <>
            {batchLoadError ? (
              <div className="page-warning" role="alert">
                {batchLoadError}
              </div>
            ) : null}
            <RevisionBatchesView batches={filteredBatches} />
          </>
        ) : isPromptinatorPage ? (
          <PromptinatorView
            store={promptinatorStore}
            query={query}
            loadError={promptinatorLoadError}
            onStoreChange={setPromptinatorStore}
            onReload={async () => {
              try {
                const store = await loadPromptinatorStore();
                setPromptinatorStore(store);
                setPromptinatorLoadError(null);
              } catch (error) {
                setPromptinatorLoadError(
                  error instanceof Error ? error.message : String(error),
                );
              }
            }}
          />
        ) : sectionItems.length === 0 || filteredItems.length === 0 ? (
          <LaneEmpty
            section={section}
            filtered={sectionItems.length > 0 && filteredItems.length === 0}
          />
        ) : (
          <div className="viewer-layout">
            <section className="asset-column" aria-label={`${section} assets`}>
              <div className="column-heading">
                <div>
                  <span className="column-heading__bar" />
                  <strong>NEWEST FIRST</strong>
                </div>
                <button type="button" aria-label="Grid view">
                  <Icon name="grid" />
                </button>
              </div>

              {section === "revise" ? (
                <div className="batch-selection-bar">
                  <span>
                    <b>{selectedBatchItems.length}</b> selected for a revision
                    batch
                  </span>
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={openBatchDialog}
                    disabled={
                      !batchActionsEnabled ||
                      selectedBatchItems.length === 0
                    }
                  >
                    Generate batch brief
                  </button>
                </div>
              ) : null}

              {filteredItems.map((candidate) => {
                const candidateBatchKey = batchSelectionKey(candidate);
                const selectedForBatch =
                  selectedBatchKeySet.has(candidateBatchKey);
                return (
                  <div
                    className={`asset-card-shell ${
                      section === "revise"
                        ? "asset-card-shell--batchable"
                        : ""
                    } ${
                      selectedForBatch ? "is-batch-selected" : ""
                    }`}
                    key={`${candidate.asset.id}-${candidate.revision.id}`}
                  >
                    {section === "revise" ? (
                      <button
                        type="button"
                        className="batch-select-toggle"
                        aria-label={`${
                          selectedForBatch ? "Remove" : "Add"
                        } ${candidate.asset.name} ${
                          candidate.revision.id
                        } ${
                          selectedForBatch ? "from" : "to"
                        } revision batch`}
                        aria-pressed={selectedForBatch}
                        onClick={() => toggleBatchSelection(candidate)}
                        disabled={!batchActionsEnabled}
                      >
                        {selectedForBatch ? "✓" : "+"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={`asset-card ${
                        candidate.asset.id === item.asset.id &&
                        candidate.revision.id === item.revision.id
                          ? "is-selected"
                          : ""
                      }`}
                      onClick={() => selectAsset(candidate)}
                    >
                      <div className="asset-card__preview checker">
                        <img
                          src={candidate.thumbnailUrl}
                          alt=""
                          draggable={false}
                        />
                        <span>
                          {candidate.revision.sheet.cellWidth}×
                          {candidate.revision.sheet.cellHeight}
                        </span>
                      </div>
                      <div className="asset-card__body">
                        <div className="asset-card__topline">
                          <span className="lane-pill">
                            {section.toUpperCase()}
                          </span>
                          <time>
                            {formatCreatedAt(
                              candidate.revision.createdAt,
                            )}
                          </time>
                        </div>
                        <h2>{candidate.asset.name}</h2>
                        <p>{candidate.asset.id}</p>
                        <div className="asset-card__tags">
                          <span>
                            {titleCase(candidate.asset.category.id)}
                          </span>
                          <span>{candidate.revision.id}</span>
                          <span className="validation-tag">
                            {candidate.validation.status === "passed"
                              ? "✓ Passed"
                              : titleCase(candidate.validation.status)}
                          </span>
                        </div>
                      </div>
                      <Icon name="chevron" />
                    </button>
                  </div>
                );
              })}

              <div className="fixture-note">
                <span>i</span>
                <p>
                  {libraryError
                    ? `Local library read failed; showing the fixture. ${libraryError}`
                    : librarySource === "local"
                      ? "Immutable local revisions loaded directly from the Prompt Spriter workspace."
                      : "Deterministic fixture. Completed Antigravity candidates will replace it after ingestion."}
                </p>
              </div>
            </section>

            <section className="review-panel" aria-label="Sprite review">
              <div className="review-panel__header">
                <div>
                  <div className="crumbs">
                    <span>{section.toUpperCase()}</span>
                    <b>/</b>
                    <span>{item.asset.id}</span>
                    <b>/</b>
                    <strong>{item.revision.id}</strong>
                  </div>
                  <h2>{item.asset.name}</h2>
                </div>
                <div className="review-actions">
                  {section === "intake" && exactCandidate?.lane === "intake" ? (
                    <>
                      <button
                        type="button"
                        className="button button--secondary"
                        onClick={() => openReviewDialog("send-to-revise")}
                        disabled={!reviewActionsEnabled}
                      >
                        Send to Revise
                      </button>
                      <button
                        type="button"
                        className="button button--primary"
                        onClick={() => openReviewDialog("approve")}
                        disabled={!reviewActionsEnabled}
                      >
                        Approve
                      </button>
                    </>
                  ) : null}
                  {section === "revise" && exactCandidate?.lane === "revise" ? (
                    <>
                      <button
                        type="button"
                        className="button button--secondary"
                        onClick={() => openReviewDialog("add-note")}
                        disabled={!reviewActionsEnabled}
                      >
                        Add note
                      </button>
                      <button
                        type="button"
                        className="button button--quiet"
                        onClick={() => openReviewDialog("archive")}
                        disabled={!reviewActionsEnabled}
                      >
                        Archive
                      </button>
                    </>
                  ) : null}
                  {section === "archive" &&
                  exactCandidate?.lane === "archive" ? (
                    <button
                      type="button"
                      className="button button--secondary"
                      onClick={() => openReviewDialog("restore")}
                      disabled={!reviewActionsEnabled}
                    >
                      Restore to Revise
                    </button>
                  ) : null}
                  {section === "library" &&
                  item.review.approvedRevisionId === item.revision.id ? (
                    <>
                      <span className="approved-pill">
                        Approved {item.revision.id}
                      </span>
                      {item.review.candidate === null ? (
                        <button
                          type="button"
                          className="button button--secondary"
                          onClick={() => openReviewDialog("start-revision")}
                          disabled={!reviewActionsEnabled}
                        >
                          Start revision
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>

              <div className="review-body">
                <div className="review-canvas-column">
                  <div className="animation-tabs" role="tablist">
                    {item.revision.animations.map((animation) => (
                      <button
                        type="button"
                        role="tab"
                        aria-selected={selectedAnimation.id === animation.id}
                        className={
                          selectedAnimation.id === animation.id
                            ? "is-active"
                            : ""
                        }
                        key={animation.id}
                        onClick={() => setSelectedAnimationId(animation.id)}
                      >
                        {animation.id}
                        <small>{animation.frames}f</small>
                      </button>
                    ))}
                  </div>

                  <div className={`sprite-stage stage--${stageBackground}`}>
                    <div className="stage-grid" />
                    <SpriteFrame
                      revision={item.revision}
                      sheetUrl={item.sheetUrl}
                      direction={selectedDirection}
                      animation={selectedAnimation.id}
                      frameIndex={frameIndex}
                      scale={6}
                      label={`${item.asset.name}, ${selectedDirection} ${selectedAnimation.id}`}
                    />
                    <span className="ground-line" />
                    <div className="stage-corner stage-corner--left">
                      6× REVIEW
                    </div>
                    <div className="stage-corner stage-corner--right">
                      FRAME {frameIndex + 1}/{selectedAnimation.frames}
                    </div>
                  </div>

                  <div className="playback-bar">
                    <button
                      type="button"
                      className="play-button"
                      onClick={() => setPlaying((current) => !current)}
                      aria-label={playing ? "Pause animation" : "Play animation"}
                    >
                      <Icon name={playing ? "pause" : "play"} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPlaying(false);
                        setFrameIndex(
                          (current) =>
                            (current + 1) % selectedAnimation.frames,
                        );
                      }}
                      aria-label="Step one frame"
                    >
                      <Icon name="step" />
                    </button>
                    <div className="playback-timing">
                      <span>{selectedAnimation.durationMs} ms</span>
                      <div>
                        {Array.from({
                          length: selectedAnimation.frames,
                        }).map((_, index) => (
                          <button
                            type="button"
                            aria-label={`Show frame ${index + 1}`}
                            className={frameIndex === index ? "is-active" : ""}
                            key={index}
                            onClick={() => {
                              setPlaying(false);
                              setFrameIndex(index);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="background-picker">
                      {(
                        [
                          "checker",
                          "midnight",
                          "paper",
                        ] as StageBackground[]
                      ).map((background) => (
                        <button
                          type="button"
                          key={background}
                          className={`swatch swatch--${background} ${
                            stageBackground === background ? "is-active" : ""
                          }`}
                          aria-label={`${background} background`}
                          onClick={() => setStageBackground(background)}
                        />
                      ))}
                    </div>
                  </div>

                  {comparisonItem &&
                  comparisonAnimation &&
                  comparisonDirection ? (
                    <div className="revision-compare">
                      <div className="section-title">
                        <div>
                          <span className="section-title__rule" />
                          <strong>REVISION COMPARISON</strong>
                        </div>
                        <label>
                          <span>Compare with</span>
                          <select
                            value={comparisonItem.revision.id}
                            onChange={(event) =>
                              setComparisonRevisionId(event.target.value)
                            }
                            aria-label="Comparison revision"
                          >
                            {assetRevisions
                              .filter(
                                (candidate) =>
                                  candidate.revision.id !== item.revision.id,
                              )
                              .map((candidate) => (
                                <option
                                  value={candidate.revision.id}
                                  key={candidate.revision.id}
                                >
                                  {candidate.revision.id} ·{" "}
                                  {describeRevisionRole(candidate)}
                                </option>
                              ))}
                          </select>
                        </label>
                      </div>
                      <div className="revision-compare__grid">
                        <figure>
                          <figcaption>
                            <strong>{item.revision.id}</strong>
                            <span>{describeRevisionRole(item)}</span>
                          </figcaption>
                          <div
                            className={`revision-compare__stage stage--${stageBackground}`}
                          >
                            <SpriteFrame
                              revision={item.revision}
                              sheetUrl={item.sheetUrl}
                              direction={selectedDirection}
                              animation={selectedAnimation.id}
                              frameIndex={frameIndex}
                              scale={4}
                              label={`${item.revision.id}, ${selectedDirection} ${selectedAnimation.id}`}
                            />
                          </div>
                        </figure>
                        <figure>
                          <figcaption>
                            <strong>{comparisonItem.revision.id}</strong>
                            <span>{describeRevisionRole(comparisonItem)}</span>
                          </figcaption>
                          <div
                            className={`revision-compare__stage stage--${stageBackground}`}
                          >
                            <SpriteFrame
                              revision={comparisonItem.revision}
                              sheetUrl={comparisonItem.sheetUrl}
                              direction={comparisonDirection}
                              animation={comparisonAnimation.id}
                              frameIndex={comparisonFrameIndex}
                              scale={4}
                              label={`${comparisonItem.revision.id}, ${comparisonDirection} ${comparisonAnimation.id}`}
                            />
                          </div>
                        </figure>
                      </div>
                      <p>
                        Both panes follow the focused animation, direction, and
                        frame wherever the older contract supports them.
                      </p>
                    </div>
                  ) : null}

                  <div className="direction-review">
                    <div className="section-title">
                      <div>
                        <span className="section-title__rule" />
                        <strong>ALL DIRECTIONS</strong>
                      </div>
                      <small>Click to focus</small>
                    </div>
                    <div className="direction-grid">
                      {item.revision.directions.map((direction) => (
                        <button
                          type="button"
                          key={direction}
                          className={
                            direction === selectedDirection ? "is-active" : ""
                          }
                          onClick={() => setSelectedDirection(direction)}
                        >
                          <div className="mini-stage checker">
                            <SpriteFrame
                              revision={item.revision}
                              sheetUrl={item.sheetUrl}
                              direction={direction}
                              animation={selectedAnimation.id}
                              frameIndex={frameIndex}
                              scale={3}
                            />
                          </div>
                          <span>{direction}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="timeline">
                    <div className="section-title">
                      <div>
                        <span className="section-title__rule" />
                        <strong>FRAME STRIP</strong>
                      </div>
                      <small>{selectedDirection}</small>
                    </div>
                    <div className="timeline__frames">
                      {Array.from({
                        length: selectedAnimation.frames,
                      }).map((_, index) => (
                        <button
                          type="button"
                          className={frameIndex === index ? "is-active" : ""}
                          key={index}
                          onClick={() => {
                            setPlaying(false);
                            setFrameIndex(index);
                          }}
                        >
                          <SpriteFrame
                            revision={item.revision}
                            sheetUrl={item.sheetUrl}
                            direction={selectedDirection}
                            animation={selectedAnimation.id}
                            frameIndex={index}
                            scale={2}
                          />
                          <span>F{String(index + 1).padStart(2, "0")}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <aside className="inspector">
                  <div className="inspector__section">
                    <p className="inspector__label">VALIDATION</p>
                    <div className="validation-summary">
                      <span>✓</span>
                      <div>
                        <strong>{titleCase(item.validation.status)}</strong>
                        <small>
                          {item.validation.checks.length} checks recorded
                        </small>
                      </div>
                    </div>
                    {item.validation.checks.map((check) => (
                      <div className="check-row" key={check.code}>
                        <span
                          className={
                            check.status === "not-assessed"
                              ? "check-dot check-dot--neutral"
                              : "check-dot"
                          }
                        />
                        <div>
                          <strong>{titleCase(check.code)}</strong>
                          <small>{check.status}</small>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="inspector__section">
                    <p className="inspector__label">CONTRACT</p>
                    <dl className="metadata-list">
                      <div>
                        <dt>Category</dt>
                        <dd>{item.asset.category.id}</dd>
                      </div>
                      <div>
                        <dt>Style</dt>
                        <dd>{item.asset.style.id}</dd>
                      </div>
                      <div>
                        <dt>Sheet</dt>
                        <dd>
                          {item.revision.sheet.width}×{item.revision.sheet.height}
                        </dd>
                      </div>
                      <div>
                        <dt>Cell</dt>
                        <dd>
                          {item.revision.sheet.cellWidth}×
                          {item.revision.sheet.cellHeight}
                        </dd>
                      </div>
                      <div>
                        <dt>Directions</dt>
                        <dd>{item.revision.directions.length}</dd>
                      </div>
                      <div>
                        <dt>Batch</dt>
                        <dd>{item.revision.batchId ?? "none"}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="inspector__section">
                    <div className="inspector__label-row">
                      <p className="inspector__label">STORED CREATION PROMPT</p>
                      <button
                        type="button"
                        onClick={() => void copyRevisionRequest()}
                      >
                        {requestCopyState === "copied"
                          ? "Copied"
                          : requestCopyState === "error"
                            ? "Copy failed"
                            : "Copy"}
                      </button>
                    </div>
                    <blockquote>{item.revision.request}</blockquote>
                    <div className="producer">
                      <span>AI</span>
                      <div>
                        <strong>{item.revision.producer.application}</strong>
                        <small>{item.revision.producer.model}</small>
                      </div>
                    </div>
                  </div>

                  {item.review.notes.length > 0 ? (
                    <div className="inspector__section review-notes">
                      <p className="inspector__label">
                        REVISION NOTES · {item.review.notes.length}
                      </p>
                      {item.review.notes.map((note) => (
                        <article
                          className={note.resolvedAt ? "is-resolved" : ""}
                          key={note.id}
                        >
                          <header>
                            <span>{describeNoteTarget(note)}</span>
                            <b>{note.resolvedAt ? "Processed" : "Open"}</b>
                          </header>
                          <p>{note.text}</p>
                        </article>
                      ))}
                    </div>
                  ) : null}

                  <div className="review-state-card">
                    <span>
                      {section === "intake"
                        ? "USER DECISION"
                        : section === "library"
                          ? "LIBRARY REVISION"
                          : section === "archive"
                            ? "RECOVERABLE STORAGE"
                            : "REVISION WORKSPACE"}
                    </span>
                    <p>
                      {section === "intake"
                        ? "Choose Approve or Send to Revise. Technical validation does not make this decision."
                        : section === "library"
                          ? item.review.candidate
                            ? `This exact ${item.revision.id} revision stays approved while ${item.review.candidate.revisionId} is in ${titleCase(item.review.candidate.lane)}.`
                            : `This exact ${item.revision.id} revision is manually approved. Start revision opens a separate working candidate without changing it.`
                          : section === "archive"
                            ? "Only Restore is available here. Restoring returns this candidate and its notes to Revise."
                            : "Add review notes here or move the candidate into recoverable Archive storage."}
                    </p>
                  </div>
                </aside>
              </div>
            </section>
          </div>
        )}
      </main>

      {actionNotice ? (
        <div className="review-feedback" role="status">
          <span>{actionNotice}</span>
          <button
            type="button"
            aria-label="Dismiss review update"
            onClick={() => setActionNotice(null)}
          >
            ×
          </button>
        </div>
      ) : null}

      {dialogMode ? (
        <ReviewDialog
          mode={dialogMode}
          item={item}
          currentDirection={selectedDirection}
          currentAnimation={selectedAnimation.id}
          busy={actionPending}
          error={actionError}
          onClose={closeReviewDialog}
          onSubmit={submitReviewAction}
        />
      ) : null}

      {batchDialogOpen ? (
        <RevisionBatchDialog
          items={selectedBatchItems}
          created={createdBatch}
          busy={batchPending}
          error={batchError}
          onClose={closeBatchDialog}
          onSubmit={(batchId) => void submitRevisionBatch(batchId)}
        />
      ) : null}
    </div>
  );
}

export default App;
