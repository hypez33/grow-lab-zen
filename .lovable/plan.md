## Goal

1. **Breeding panel**: Show a tiny color-matched origin label (P1 / P2 / Both / MUT) directly on every trait chip so the source is readable at a glance — no tooltip required.
2. **Chat & customer UX polish**: Make the customer chat and customer list noticeably more usable on mobile (393px viewport).

---

## Part 1 — Trait origin labels (`BreedingPreviewPanel.tsx`)

Each trait chip currently shows only the trait name + survival %. We add a leading colored label badge that matches the group tone:

- **P1** — cyan (Parent 1 only)
- **P2** — green (Parent 2 only)
- **BOTH** — gold (shared, reinforced)
- **MUT** — orange (mutation, godtier-only)

Implementation:
- Extend `TraitGroup` chip with a leading `<span>` showing a short label (`P1` / `P2` / `BOTH`) using the same tone class already defined (solid background tint + bold text). Tiny pill: `text-[8px] font-bold px-1 rounded leading-none`.
- Same treatment for mutation chips (`MUT` label, orange).
- Keep existing tooltip + survival % at the end. Layout stays one line per chip on mobile (already wraps).
- Update the legend at the bottom to also list the four label colors as a key.

Result: player sees `[P1] OG Kush 70%` etc. without hovering.

---

## Part 2 — Chat usability (`CustomerModal.tsx` chat block, lines ~613-822)

Pain points today: header takes vertical space, message-type badge above every bubble is noisy, action buttons emoji-prefixed, no quick way to scroll to newest, no inline reply shortcut.

Changes:
1. **Compact bubble header**: move the message-type label inline with the timestamp under the bubble (one row), instead of a separate row above the bubble. Reduces vertical height ~30%.
2. **Group consecutive messages**: when 2+ consecutive messages share `from` + same minute, hide avatar/header on follow-ups (WhatsApp-style stacking).
3. **Sticky "jump to latest" pill**: when the user scrolls up and there are newer unread messages, show a floating pill at the bottom-right of the chat container (`↓ N neue`) that scrolls to bottom on tap.
4. **Action buttons**: replace emoji prefixes with `lucide` icons (`Check`, `Pill`, `Repeat`, `X`) for cleaner look; increase tap target to `min-h-[34px]`.
5. **Pending request highlight**: if the latest message has a pending request, add a subtle pulsing border on the chat container and auto-scroll on open (already partially done).
6. **Empty state**: add a primary CTA button ("Sample geben" for prospects) directly inside the empty state instead of just text.

---

## Part 3 — Customer list polish (`CustomersScreen.tsx` + `CustomerCard.tsx`)

1. **Sticky header on scroll**: wrap the search + filter chips in a `sticky top-0 z-10 backdrop-blur` container so filters stay reachable when scrolling long lists.
2. **Filter chip count colors**: tint the count pill with the filter's status color (gold for VIP, emerald for Loyal, etc.) for instant scanning.
3. **CustomerCard tap area**: the `Sample`/`Deal` button currently sits right-bottom; on 393px the card is dense. Move the unread badge from avatar into the right-side column to reduce overlap, and increase the action button to full-width when there is a `pendingRequest` (urgency CTA).
4. **Pending-request banner on card**: when `customer.pendingRequest` exists, show a slim red bar across the top of the card (`{grams}g · {timeLeft}`) so it's visible without opening.
5. **Sort toggle**: add a small `Sort: Status | Loyalty | Activity` cycler next to "Neu" button.

---

## Part 4 — Modal-wide polish (`CustomerModal.tsx`)

- Make the close button (`X`) larger and pinned to a sticky modal header so it's always reachable while scrolling long chats.
- Convert `SectionHeader` to use a slightly smaller padding on mobile to fit more content above the fold.

---

## Files to edit

- `src/components/game/BreedingPreviewPanel.tsx` — add origin labels + extend legend
- `src/components/game/CustomerModal.tsx` — chat compaction, message grouping, jump-to-latest pill, action button icons, sticky modal header
- `src/components/game/CustomersScreen.tsx` — sticky search/filter, sort toggle, tinted filter counts
- `src/components/game/CustomerCard.tsx` — pending-request banner, layout cleanup, full-width urgency CTA

No changes to game logic, stores, or breeding math — purely UI/UX.
