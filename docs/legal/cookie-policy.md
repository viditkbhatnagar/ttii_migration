# Cookie & Local Storage Policy

**Version:** 1.0 (draft) | **Effective Date:** {{EFFECTIVE_DATE}} | **Owner:** {{DPO_NAME}}, Data Protection Officer
**Last reviewed:** {{LAST_REVIEW_DATE}} | **Next review:** {{NEXT_REVIEW_DATE}}

This policy explains the small files and browser-storage entries the TTII Platform uses, why we use them, and how you can control them.

## 1. What this covers

When we say "cookies" in this policy we mean any of:

- **HTTP cookies** — short text strings the browser stores and sends back on each request.
- **`localStorage` / `sessionStorage`** — keyed values your browser keeps on your device until you sign out or clear your browser data.
- **In-memory state** — values held only while a tab is open; cleared on tab close.

Different browsers store these differently, but for the purposes of Indian and EU law these are all treated as "cookies and similar technologies".

## 2. What we use today

Our principle is **essential-only**. We do not currently set advertising, analytics, or behavioural-tracking cookies on the Platform.

| Name / key | Type | Purpose | Lifetime |
|---|---|---|---|
| Authentication token | Browser storage | Keeps you signed in across page navigations after you log in. The token is opaque (cryptographically random); it does not contain any personal data. | Up to {{SESSION_TTL_DESCRIPTION}}, or until you sign out, whichever comes first |
| Portal preference | Browser storage | Remembers which portal (admin / learn / admissions) you last used so the right one loads quickly | Until you change portal or clear browser data |
| Active language / theme preference (where available) | Browser storage | Remembers your UI preferences (e.g. dark mode if enabled) | Until you change them or clear browser data |
| CSRF / session-integrity tokens (where used) | HTTP cookie or browser storage | Protects against cross-site request forgery on authenticated requests | Session only |

Third-party services we integrate with (Razorpay during payment, Microsoft Teams during a live class, Vimeo during video playback) may set their own cookies on their domains. Those services have their own cookie disclosures; please consult them.

## 3. What we do **not** use

We do **not** currently use:

- Google Analytics, Mixpanel, PostHog, Hotjar, Clarity, or any other behavioural-analytics service;
- Facebook Pixel, Google Ads tags, LinkedIn Insight Tag, or any other advertising / remarketing pixel;
- Cross-site or "session-replay" trackers;
- Cookies that persist beyond the purposes described above.

If we add any new tracker that is not strictly necessary for service delivery, we will:

1. Update this policy in advance;
2. Where the law requires, obtain your **opt-in consent** before the tracker activates;
3. Provide a clear opt-out control on the Platform.

## 4. Why we treat all of the above as "essential"

Each item above is required either to deliver the service you have requested (keeping you logged in, processing your payment, playing your video) or for security (CSRF protection). Without them the Platform cannot function. Indian law (the IT Rules) does not require consent for strictly necessary cookies, and EU law (where it applies through cross-border processing) similarly exempts them. We still disclose them here for transparency.

## 5. Controlling cookies

You can:

- **Sign out** — this clears your authentication token immediately on this device.
- **Clear browser data** — delete cookies, `localStorage`, and `sessionStorage` for `teachersindia.in` from your browser settings. This will sign you out and reset your preferences.
- **Use private / incognito mode** — most data is discarded automatically when the window closes.
- **Block cookies in your browser** — most browsers let you block cookies for specific sites. Note that **the Platform will not function** without authentication cookies / storage; you will not be able to sign in.

If you use a different device or browser, your stored preferences and authentication will not transfer.

## 6. Children

We do not target advertising at, or use behavioural tracking on, anyone — adult or minor. Where minors use the Platform, the same essential-only standard applies. See our [Children's Privacy Notice](childrens-privacy-notice.md).

## 7. Changes to this policy

We will update this policy if we change what we store on your device. The "**Effective Date**" line at the top reflects the current version. Material changes will be communicated by an in-product banner on your next visit.

## 8. Contact

For questions about this policy, write to {{DPO_EMAIL}}.

---

## Revision history

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 (draft) | {{LAST_REVIEW_DATE}} | Initial draft | Reflects "essential-only" posture verified at commit `fc089507`. |
