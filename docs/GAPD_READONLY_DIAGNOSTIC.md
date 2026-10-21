# GAPD-7300 read-only endpoint discovery

This is a diagnostic step for determining whether the exact firmware running on the user's router exposes a rule-management request. It does not assume an API exists.

## Why this exists

The receipt Wi-Fi app runs separately from the router. The router's MAC filter page has weekday and hour fields, but the page alone does not establish whether its rule list can be safely controlled by the app or whether the filter blocks Internet forwarding. Do not enable a guessed `NETWORK_MODE=real`.

## Procedure

1. Connect the development PC to the GAPD-7300's normal Wi-Fi.
2. Sign in to the router UI as usual and open the MAC-filtering page.
3. Open browser Developer Tools (F12) and select Console.
4. Open [`tools/gapd-readonly-inspector.js`](../tools/gapd-readonly-inspector.js), copy its contents, and paste them into the Console.
5. Copy the printed JSON report. The script does not submit forms, click controls, change settings, or print input values, cookies, passwords, or authorization headers.
6. Share only that report for analysis. Never share cookies, passwords, a HAR file, or request headers containing authentication data.

## Limits

- The script only inspects the page's current DOM and resource list; it does not prove that an API exists.
- If the firmware sends requests only after a form interaction, the read-only report may not reveal the request. Do not click Apply or save a real rule just to discover an endpoint.
- If a safe, non-mutating way to inspect the request cannot be identified, stop rather than guessing private router endpoints.
- Even if a private endpoint is found, it is firmware-specific and not a supported API. It needs controlled tests on a spare client before any integration.
- The currently verified app remains simulation-only. This diagnostic does not grant or revoke Internet access.
