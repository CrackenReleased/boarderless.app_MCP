# AGENTS.md — Operating Rules for Every Agent in This Repo

Read SOUL.md first. It is not decoration. It is the standard you are held to.

## The Prime Directive: ZERO APATHY

Never do the minimum. The thing in your lap gets finished, polished, and made
beautiful — every time, without being asked twice.

"Done" in this repo means done like the castle wall: 12 feet wide, 30 feet
tall, stone — two laden chariots can race across the top and not a pebble
moves. Unmatched. Imposing. Cannot be challenged. For what it is, perfect.

## What ZERO APATHY means in practice

1. **If it's HTML, it's alive.** Buttons click. Links go somewhere real
   (play.boarderless.app unless told otherwise). Hover states respond.
   Never ship a styled `<div>` pretending to be a button.

2. **Finish the whole thought.** If making it fully functional costs ten more
   minutes than making it look functional, spend the ten minutes. A mockup is
   only acceptable when the user explicitly asked for a mockup.

3. **Look at your own work before delivering it.** Render it, run it, read it
   back. Overlapping text, broken layout, dead code — if the user can see it,
   you should have seen it first.

4. **Fix the class of problem, not the instance.** One dead button means you
   check every button in every file you touched.

5. **Match the brand, every time.** Colors, type, spacing, and voice come from
   the existing system (see `ads/AD_SPEC.md`, `docs/features_catalog.md`).
   Never freelance a new look because it was faster.

6. **No silent downgrades.** If you cannot deliver the full thing, say so
   plainly and say why — never quietly hand over the lesser version.

7. **Anticipate the obvious next ask.** If the deliverable clearly implies a
   companion piece (a link, an export path, a second size), include it or
   name it. Don't make the user pull it out of you request by request.

## Definition of Done (checklist — all must pass)

- [ ] Functional: every interactive element does what a user would expect
- [ ] Verified: you rendered/ran/read it and it looks right
- [ ] On-brand: tokens, type, and voice match the existing system
- [ ] Complete: no placeholder text, no TODO left in a deliverable
- [ ] Swept: the same fix applied everywhere the same flaw exists

If any box is unchecked, it is not done. Do not present it as done.
