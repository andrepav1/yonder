// Yondle — monetization configuration (Tier 1: donations + ads).
//
// Deliberately kept SEPARATE from `rules.ts`: these are presentational /
// commercial switches, not game rules, so they never touch the
// determinism-sacred pure core (`lib/*`) or its tests. Only `src/ui/*` reads
// this; `lib/*` must never import it.
//
// Everything is opt-in. An empty string means "render nothing" — so with ads
// unconfigured the AdSense script never loads and no ad markup is emitted, and
// the app stays fully static + offline-friendly by default.

export interface MonetizationConfig {
  /**
   * Support / "buy me a coffee" link. Shown in the About dialog and on the
   * end-of-round result. Empty string hides the link entirely.
   */
  supportUrl: string
  ads: {
    /**
     * Google AdSense publisher ID, e.g. "ca-pub-1234567890123456". Both this
     * and a placement slot must be set for any ad to render; otherwise the
     * AdSense script never loads and no ad markup is produced.
     */
    client: string
    /** AdSense ad-unit slot id for the post-result placement (the ResultCard). */
    resultSlot: string
  }
}

export const defaultMonetization: MonetizationConfig = {
  supportUrl: 'https://buymeacoffee.com/bigpav',
  ads: {
    // Empty = AdSense stays dormant (no script, no markup). To go live, paste
    // your IDs: `client` = "ca-pub-…", `resultSlot` = the ad unit's data-ad-slot.
    client: '',
    resultSlot: '',
  },
}
