# Antigravity Queue Launcher

A local, one-button Windows queue for starting fresh Antigravity CLI conversations. It uses your existing signed-in Antigravity subscription and refuses to send unless AI-credit overages are explicitly disabled.

## What each send does

1. Rechecks the local Antigravity AI-credit setting.
2. Takes the top pending message and copies it to the clipboard (a clipboard hiccup never blocks the launch).
3. Removes it from the pending queue, while retaining a recoverable sent-history entry.
4. Opens a new PowerShell terminal in the selected project folder.
5. Starts `agy.exe` without any resume flags, passing the queued message as the initial prompt with full command-line escaping, so quotes and special characters arrive exactly as written. Manual sends use interactive mode (`--prompt-interactive`); auto-send uses non-interactive print mode (`--prompt`) so conversations end by themselves.

The launcher does not use an API key, an external paid service, `--continue`, `--conversation`, or `--dangerously-skip-permissions`.

## Quick start

1. Double-click **Launch Queue.cmd**.
2. Confirm that the green banner says AI-credit overages are explicitly disabled. When the banner is red, it now also explains how to fix the setting.
3. Select **Browse...** and choose the narrow project folder Antigravity should work inside.
4. Select **Add / import messages** (Ctrl+I).
5. Paste one message, or paste many messages separated by:

   ```text
   ---NEXT---
   ```

   The dialog shows live how many messages the paste will add, and warns before importing exact duplicates.
6. Select **Send next** (Ctrl+Enter).
7. Repeat whenever you want to start the next fresh conversation - or turn on auto-send (below).

`sample-queue.txt` demonstrates the bulk-import format. Importing it does not happen automatically.

## Managing the queue

The main window shows the whole queue as a list. The top message is always the one sent next.

- **Select** a message to preview its full text and character count on the right.
- **Top / Up / Down** reorder the selected message.
- **Edit** (F2) changes a message's text in place.
- **Delete** (Del) removes the selected message(s) after a confirmation; multi-select works.
- **Search** (Ctrl+F) filters the list by text. Reordering is disabled while a filter is active.
- **History...** browses every launched message, restores any of them to the queue front, or clears the history.
- **Undo last** is the quick path: it returns the most recently launched message to the front of the queue. It does not cancel a conversation that has already started.

## Auto-send

Tick **Auto-send the queue** and the launcher starts working through the queue immediately, running up to two conversations at once (configurable):

- The first message launches as soon as you tick the box (no manual send needed). Additional slots fill with staggered starts (at least 60 seconds apart) so that two conversations rarely hit the repository-check and commit phase at the same moment.
- Auto-sent conversations run in Antigravity's non-interactive print mode (`--prompt`) with no window at all: each one runs hidden, ends by itself the moment its reply is finished, and the next message launches. A whole queue can run unattended with nothing to close.
- Each conversation's full reply and exit code are saved to `data\logs\<message id>.log` (the newest 200 logs are kept).
- Print mode does not adopt the working folder as the Antigravity workspace on its own, so the launcher also passes `--add-dir <working folder>`. Without it, file changes silently land in agy's internal scratch folder while the conversation still claims success.
- The chain pauses (and the checkbox unticks itself) when a conversation exits with an error, times out, or fails to launch, and when the queue empties. The status bar points at the log so you can read what happened; tick the box again to continue.
- Auto-send is deliberately off each time the launcher starts. Manual sends still use interactive mode with a visible terminal window that stays open.

The status line above the status bar always shows what the last conversation is doing (launching, running, or finished).

Three optional settings in `data\settings.json` tune this:

- `printTimeoutMinutes` (default 10) - how long a print-mode conversation may run before Antigravity gives up. This is a kill-switch for hung tasks, not a wait: the chain advances the moment a conversation finishes. Real sprite tasks have taken 3-5 minutes, so do not set this too low.
- `autoSendConcurrency` (default 2, allowed 1-4) - how many conversations may run at the same time. Set 1 for strictly serial processing with zero risk of two conversations touching the repository at once; higher values increase throughput but make simultaneous git/build steps more likely (a collision typically just fails that conversation's checks and pauses the chain).
- `autoSendMode` - set to `"interactive"` if you prefer auto-sent conversations to stay interactive; the chain then advances when you exit or close each one.
- `autoSendModel` - optional model id (see `agy models`) pinned onto every auto-sent conversation via `--model`, e.g. `"gemini-3.6-flash-high"`. Leave empty to use Antigravity's own default. Manual interactive sends are never pinned.

Note: print mode cannot answer interactive permission prompts. If a task needs an approval your workspace policy does not already allow, that conversation fails or times out and the chain pauses - run that message manually instead.

## Promptinator mode

The launcher lives inside the Prompt Spriter repository and can feed itself
from the Promptinator queue instead of a hand-maintained list. Tick **Pull
from Promptinator** and, whenever the local queue is empty, each send claims
the lowest Ready Promptinator entry (`tools/claim-next-prompt.mjs`) and sends
the full claim printout - prompt, expected asset ID, and staging instructions -
as the conversation's message.

- The local queue always has priority: imported messages are sent first, and
  Promptinator refills only when the queue is empty. Untick the box to go back
  to a purely manual queue.
- Claims are created one send at a time, at launch time, so nothing sits
  claimed while waiting in a local list. Trusted ingestion completes each
  claim automatically when the conversation finishes its job.
- With auto-send on, the chain keeps claiming until Promptinator has no Ready
  entries, then finishes cleanly.
- If a launch fails after a claim was created, the exact claimed prompt is
  placed at the front of the local queue - sending it again resumes the same
  claim, which is Promptinator's documented recovery path. The claim stays
  visible in the Prompt Spriter viewer either way.
- Sending prompts through this mode (rather than pasting briefs manually)
  keeps every safeguard the repository adds to prompts: the structured rules,
  directional derivation, style-example guidance, and automatic claim
  completion with full provenance.

Settings in `data\settings.json`: `promptinatorEnabled` mirrors the checkbox;
`promptinatorRepo` overrides the repository root (leave empty to use the
repository this launcher lives in); `promptinatorClaimant` names the claimant
recorded in the store (default "Queue Launcher"). Node.js must be on PATH.

## Subscription-only protection

Before every send, both the GUI and the new terminal check these supported local settings:

- `%USERPROFILE%\.gemini\config\config.json` -> `userSettings.useAiCredits`
- `%USERPROFILE%\.gemini\antigravity-cli\settings.json` -> `useG1Credits`

The send button is blocked when:

- either recognized setting enables AI credits;
- a recognized value is malformed;
- a relevant configuration file cannot be read; or
- no explicit disabled credit setting can be found.

The launcher only reads these settings. It never changes them. The guard banner refreshes automatically every few seconds.

## Queue, recovery, and backups

- `data\queue.json` is the pending queue.
- `data\sent.jsonl` records messages whose terminal process was launched.
- `data\inflight\` temporarily holds a protected prompt job while a launch is being validated, plus a small `.done` marker that reports each conversation's exit code back to the launcher.
- `data\backups\` holds automatic queue backups (`backup.<timestamp>.<reason>.json`). A backup is always taken before imports and repairs, and periodically before deletes and edits. The newest 30 are kept.
- On startup, the launcher detects **stranded messages** - jobs from a previous session whose conversation is no longer running (for example, a closed terminal) - and offers to return them to the front of the queue.
- If a terminal launch fails, the message is automatically returned to the queue.
- If the queue file is damaged, the launcher fails closed and offers **Repair queue...**, which keeps every valid message and moves unreadable ones to a quarantine file in `data\backups`.
- Only one launcher window can run at a time, and the send button locks while processing a click.

The UI says **launched**, rather than claiming **delivered**, because Antigravity itself is responsible for accepting and processing the prompt.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| Ctrl+Enter | Send next |
| Ctrl+I | Add / import messages |
| Ctrl+F | Focus the search box |
| Del | Delete the selected message(s) |
| F2 | Edit the selected message |

## Important limits

- A message is limited to 20,000 characters to remain safely under Windows command-line limits. The preview shows a red character count when a message is over the limit.
- Each send opens a separate terminal conversation.
- The launcher does not bypass Antigravity approval or workspace-security policies.
- Antigravity usage still counts against your subscription quota. With overages disabled, Antigravity should stop at the included quota instead of automatically consuming paid credits.
- Sent messages remain in local history until you deliberately remove that history (History... -> Clear history).
- The window remembers its size and position between runs.

## Dry-run tests

The included tests do not start Antigravity and do not consume quota. Run:

```powershell
& "$PSScriptRoot\tests\run-tests.ps1"
```

They verify queue ordering, multiline import, sent-message recovery, fail-closed credit protection, command-line escaping (a `CommandLineToArgvW` round trip proves prompts with quotes arrive intact), backup rotation and throttling, queue repair, stranded-job detection and restore, sent-history restore/clear, and PowerShell syntax of every application script.

## Troubleshooting

### Send next is disabled

Check all three conditions shown in the window:

1. The guard banner is green.
2. The working folder exists.
3. At least one message is pending and `agy.exe` is installed.

### Antigravity opens but does not accept the prompt

Use **Undo last** to put the message back at the front, then inspect the terminal error. The exact message also remains on the clipboard.

### The queue file is damaged

The launcher fails closed when queue JSON is invalid and shows a **Repair queue...** button. Repair backs up the broken file first, keeps every valid message, and quarantines the rest. You can also restore any automatic backup from `data\backups` by copying it over `data\queue.json` while the launcher is closed.
