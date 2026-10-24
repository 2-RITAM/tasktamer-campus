# Decisions log (append only; dated, signed)

- 2026-10-23 (A) **Stack:** vanilla HTML/CSS/ES modules, `localStorage` key `tasktamer.v1`, no dependencies. New repository confirmed by user.
- 2026-10-23 (A) **Visual direction (approved):** "study desk". Off-white paper surfaces, ink-dark text, sage primary accent, ochre as the single warm secondary. Light and dark tokens in `css/tokens.css`. Type: local serif display stack (Iowan Old Style / Palatino / Georgia) with a system sans body; no CDN fonts. Contrast of these values was estimated by hand and has NOT been tool-checked.
- 2026-10-23 (A) **Greeting:** time-of-day, no name; `Settings` unchanged.
- 2026-10-23 (A) **Dialogs:** native `<dialog>` approved, with accessible names, `Esc`, focus return.
- 2026-10-23 (A) **Temporary adapter:** `js/ui/storage-adapter.js`, minimal and marked for deletion at integration. Its `applyTaskChange` is a PROPOSAL for Agent B, not a contract.
- 2026-10-23 (A) **OPEN: save() vs debounce.** SKILL.md 5.3 (synchronous `{ ok, error? }`) conflicts with 10.1 (debounced writes). Option A: synchronous writes, amend or defer debounce. Option B: debounced writes plus a defined way to report eventual failures. The adapter writes synchronously only as a stand-in; no option is chosen.
- 2026-10-23 (A) **Agenda:** list view first; month grid deferred.
- 2026-10-23 (A) **Deployment:** plan for GitHub Pages; verify repo and deployment requirements before publishing.
- 2026-10-23 (A) **Deviation:** one nav item (Tasks) in a top bar for now. Bottom nav and sidebar (SKILL.md 9.5) arrive with more views.
