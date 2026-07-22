# Yondle — monetization

How Yondle earns its keep without compromising the static, offline-friendly,
deterministic design. Everything here is **opt-in**: with nothing configured the
app ships exactly as before — no ad script, no ad markup, no external calls.

All the switches live in one declarative file: **`src/config/monetization.ts`**
(read only by `src/ui/*`; the pure core in `lib/*` never imports it). Design
rationale is in `DECISIONS.md` (2026-07-22).

---

## Tier 1 — shipped

Two pure-UI revenue bits, both degrade to nothing when unconfigured.

### 1. Donations — "Buy me a coffee" ✅ live

- **Config:** `supportUrl` in `src/config/monetization.ts`.
- **Current value:** `https://buymeacoffee.com/bigpav`
- **Where it shows:** on the end-of-round `ResultCard` (below Share, with the note
  "Enjoying the daily wander? Help keep Yondle free.") and in the `About` dialog.
- **To change the destination:** edit `supportUrl`. Empty string hides the link
  entirely.

**Buy Me a Coffee page setup** (done on buymeacoffee.com, not in this repo):

- **Page:** https://buymeacoffee.com/bigpav — name **Andrea**.
- **Profile photo:** the Yondle compass / a globe works well.
- **About copy** (paste-ready):

  > Hi, I'm Andrea 👋
  >
  > I build **Yondle** — a free daily geography game. Every day everyone gets the
  > same puzzle: one start city and one target distance, and you hop across the
  > globe city by city to reach it. It's mobile-first, plays in 9 languages, and
  > works offline.
  >
  > I make it on the side and keep it completely free — no paywalls. Contributions
  > go straight to hosting and to building new features (a puzzle archive is next!).
  > If Yondle has brightened a few of your mornings, a coffee genuinely helps me
  > keep it running. Thanks for wandering with me! ☕🌍

- **Website / social link:** the live Yondle URL (or the repo,
  `https://github.com/andrepav1/yonder`, until it's deployed).

### 2. Ads — post-result AdSense slot ⏸ dormant (drop-in)

- **Config:** `ads.client` + `ads.resultSlot` in `src/config/monetization.ts`.
- **Current state:** both empty → **no ad script loads and no markup renders**. The
  slot is completely absent until configured.
- **Where it shows:** one non-intrusive unit at the bottom of the `ResultCard`,
  after a divider, only once a round is finished (`src/ui/AdSlot.tsx`).

**To activate:**

1. Get a Google AdSense account approved for your Yondle domain. Approval needs the
   site live and an `ads.txt` at the domain root (AdSense gives you the exact line —
   for a Vercel deploy, drop it in `public/ads.txt` so it builds to the site root).
2. Create a **display** ad unit; note its publisher id (`ca-pub-…`) and the unit's
   `data-ad-slot` value.
3. Set them in `src/config/monetization.ts`:
   ```ts
   ads: { client: 'ca-pub-XXXXXXXXXXXXXXXX', resultSlot: 'YYYYYYYYYY' }
   ```
4. Redeploy. The AdSense script now loads and the unit renders after each round.

> Note: turning ads on ends the "no runtime network" property for players who load
> the result card. That's the intended trade — but it's why the default is off.

---

## Later tiers — not built yet

Sketches for when traffic justifies the extra machinery (all need a backend, which
v1 deliberately avoids):

- **Freemium subscription.** Free daily puzzle; premium unlocks **unlimited
  practice** (today it's free — the natural paywall lever), a **puzzle archive**
  (cheap to build given deterministic-by-date generation — the recommended anchor
  feature), deeper stats, extra hints, and ad-free play. Needs auth + entitlements +
  payments (Stripe / Lemon Squeezy).
- **Education / B2B licensing.** The strongest differentiator: geography + 9 languages
  with localized city names is a genuine classroom tool. Teacher accounts, custom
  region packs, class leaderboards, white-label.
- **Sponsored / branded puzzles.** Travel-native: a tourism board or airline sponsors
  "today's start city." High-margin, no subscription infra, but needs traffic to sell.

## Licensing note

City data is © GeoNames under **CC BY 4.0**, which **permits commercial use** — so
none of the above is blocked by data licensing. Keep the footer attribution.
