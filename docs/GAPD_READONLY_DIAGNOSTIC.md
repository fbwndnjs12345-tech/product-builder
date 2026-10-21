# GAPD-7300 read-only endpoint discovery

This document records what was observed in the user's existing LG U+ GAPD-7300 admin UI. It does not assume that the router exposes a supported API.

## Confirmed observations

The MAC-filtering document is loaded inside the outer admin page's `iframe[name="basefrm"]`. The outer URL can remain `/web/main.html` while the frame document is `/web/network_0406.html`.

Read-only inspection found:

- Frame path: `/web/network_0406.html`
- Form method: `POST`
- Form action attribute: `network_0406.html` (relative to the frame URL)
- Hidden rule fields: `MACFILTER_TBL_NUM` and `MACFILTER_TBL1` through `MACFILTER_TBL30`
- UI handlers exist: `clickApply()`, `row_edit()`, `row_del()`, and `edit_apply()`
- The policy selector's actual option values are `allow` (label `허용`) and `deny` (label `차단`). The page's serialization function may convert these UI values to the router's stored representation; do not assume the selector values are identical to the serialized row values.
- The apply handler serializes the table into comma-separated rule fields: enabled flag, policy, MAC address, start hour, end hour, and seven weekday flags, then submits the form.
- The UI has up to 30 rule slots. Its schedule controls use hours rather than minute-precision expiry.

## What this does and does not establish

This establishes a firmware-specific, browser-form configuration flow. It does **not** establish:

- a supported or stable external API;
- the required authenticated request/cookie/CSRF behavior for a separate application;
- whether the filter policy is currently enabled and how its default policy behaves;
- that the filter blocks all Internet traffic for a matched device;
- whether rule changes take effect immediately or require other router state changes; or
- a way to enforce arbitrary durations such as 30 minutes.

No form was submitted and no router settings were changed during this investigation.

## Application safety fix

The claim endpoint now returns `503 NETWORK_ENFORCEMENT_NOT_CONNECTED` before changing `usedAt` or `activeUntil`. A valid receipt QR is therefore not consumed when the gateway is disconnected, and the UI shows the reason. This prevents a QR scan from looking like a completed session when no Internet permission was granted.

## Decision for the receipt-QR project

Do not implement a live GAPD-7300 adapter based only on these observations. The UI is local-network-only and firmware-specific, and its hour-level schedule does not meet minute-accurate session expiry. Automating its private form could lock out devices or create an unintended allow/block policy.

The app must continue to report `NOT_CONNECTED` and fail closed until all of the following are verified on a dedicated test client:

1. A narrowly scoped rule can be added and removed safely.
2. The rule demonstrably blocks or allows Internet forwarding, not just a UI/table entry.
3. The rule can be managed without disrupting the administrator's device.
4. Expiry and revocation work with the precision the product promises.
5. The behavior survives refresh/reboot and is confirmed from the client side.

## Safe next step without buying hardware

The remaining useful test is an isolated, reversible enforcement test on a spare phone—not another DOM inspection. It should only be attempted after identifying the router's current filter mode/default policy and recording a rollback plan. Do not test on the development PC or the device being used to administer the router. Until that test is explicitly performed, no code should submit this form or claim real access enforcement.

For a production-grade minute-based portal, the preferred route remains a supported gateway/captive-portal integration (for example, a separately verified OpenWrt/openNDS gateway). GAPD-7300 compatibility is unverified; do not flash it or change bridge/DMZ settings based on this document.
