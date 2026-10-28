# Learning centre 1.5 — local acceptance (2026-10-28)

## Scope

Local branch based on `b206b856f679ba0637a9f360bfb248e6898e108b`.
Its tree was verified identical to the previous reviewed local branding commit.
Only `anatomia-vr/` changes; no publication was performed for this iteration.

No new medical statements, new models, accounts, trackers or remote dependencies.
`data.js`, `teaching-content.js`, `teaching-activities.js`, models, previews,
original MEDSI logo, MEDSI stylesheet and original credits are unchanged.

## Automated evidence

- `npm run check`: parsed both GLB models; 16 mappings; all 25 original atlas
  regression scenarios; teaching-content checks; logo SHA-256/brand invariants;
  learning-state/URL tests passed.
- `scripts/learning-dom-check.mjs`: 12 production-DOM scenarios passed with
  happy-dom 21.0.3. Covers close/Escape focus, favorites/search/confirmed reset,
  finite recall/repeat/pause and double-activation guards, atlas navigation and
  error replay, six teacher theme/format combinations, separate lab results,
  unavailable storage, corrupt IDs and impossible/duplicate attempts, denied
  clipboard, 3D-route keyboard focus, and generated offline HTML execution.
- Original real-DOM atlas suite rerun: catalog/Latin search/source modal,
  eight-answer quiz, five-step demo/back/reset, arithmetic presets, unique IDs
  and button names passed.
- `node scripts/build-teaching-offline.mjs`: regenerated single file, zero
  external runtime dependencies. All three labs/comparison/projector execute
  independently with storage unavailable in the DOM harness.
- JS syntax and `git diff --check` passed.

## Browser evidence

Cloud Chromium used a native local-only Python HTTP preview. The shell-network
preview was not reachable from the browser; no external deployment was used.

- Real desktop student/teacher centre, disclosed answer, self-rating completion,
  saved favorite and repeat queue after reload, repeated close/reopen and
  keyboard transitions to the existing projector were inspected.
- Real layout at iframe viewport widths 320, 360, 768 and 1366 pixels: student
  and teacher screens measured no horizontal dialog overflow after correction.
  Expanded routes at 320px were also measured without horizontal overflow.
- Native browser zoom was set to 200%, inspected for usable reflow, and restored
  to 100%. No horizontal dialog overflow was observed.
- DevTools are disallowed by the cloud browser policy. Width testing used a
  temporary same-origin iframe fixture, removed from the deliverable. This is
  viewport-layout testing, not physical-phone or touch-hardware testing.
- Browser logs seen during these flows included extension metadata errors, not
  an observed application exception. This is not a blanket guarantee of no
  errors in all browsers.

## Independent read-only review

A second agent reviewed the changes and reproduced two issues: initial 3D
selection overwriting Continue, and malformed saved attempt counts. Both were
fixed and independently retested. Valid last-organ state survives initial
render; only valid finite results are displayed. Revealed answers receive focus.

## Boundaries

No real WebGL rendering or physical WebXR headset was validated in this cloud
session. Existing state/model tests do not substitute for those device checks.
The standalone download remains the teaching laboratory only, not an offline
3D atlas or full learning centre. Sources still need a network connection.
Recall-session position is page-memory only; favorites and self-ratings persist
locally when storage is available. There is no per-student identity or cloud sync.

Repository-root Quality has unrelated pre-existing failures and was not changed
or represented as a passing check for this scoped release.
