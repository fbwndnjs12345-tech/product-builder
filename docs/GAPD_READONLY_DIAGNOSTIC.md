# GAPD-7300 read-only endpoint discovery

This is a diagnostic step for determining whether the exact firmware running on the user's router exposes a rule-management request. It does not assume an API exists.

## Observed on the user's router UI

The actual MAC-filtering document is loaded inside the outer admin page's `iframe[name="basefrm"]`. The outer URL can remain `/web/main.html` while the frame document is `/web/network_0406.html`.

Read-only inspection of that frame found:

- Form method: `POST`
- Form action attribute: `network_0406.html` (relative to the frame page)
- Hidden rule fields: `MACFILTER_TBL_NUM` and `MACFILTER_TBL1` through `MACFILTER_TBL30`
- UI handlers: `clickApply()`, `row_edit()`, `row_del()`, and `edit_apply()`
- `clickApply()` serializes each displayed row as comma-separated fields: enabled flag, allow/block policy, MAC address, start hour, end hour, and seven weekday flags, then submits the form.

These observations establish a firmware-specific form-based configuration flow, **not** a supported API and **not** proof that MAC filtering blocks Internet forwarding. The form has not been submitted as part of this investigation. The router's broader policy/default behavior and authentication/session requirements are not yet verified.

## Why this exists

The receipt Wi-Fi app runs separately from the router. The router's MAC filter page has weekday and hour fields, but the page alone does not establish whether its rule list can be safely controlled by the app or whether the filter blocks Internet forwarding. Do not enable a guessed `NETWORK_MODE=real`.

## Procedure

1. Connect the development PC to the GAPD-7300's normal Wi-Fi.
2. Sign in to the router UI as usual and open the MAC-filtering page.
3. Open browser Developer Tools (F12) and select Console.
4. Inspect the actual frame document, not just the outer admin page. For this firmware, the frame is named `basefrm`.
5. Share only DOM structure and function source needed for analysis. Never share cookies, passwords, a HAR file, or request headers containing authentication data.

## Limits and safety

- Read-only DOM and resource inspection does not prove that an API exists.
- Do not call `clickApply()`, submit the form, or save a real rule just to discover an endpoint.
- Do not automate this private form from a cloud server: it is local-network-only, firmware-specific, and likely depends on the browser's authenticated session.
- Do not create a broad allow/block policy or test on the development PC/admin device. If a manual enforcement test is later required, it must use a spare client, one narrow reversible rule, and a verified rollback plan.
- The UI's schedule is hour-based in the observed form. Do not promise minute-accurate QR expiry based on this mechanism.
- Even if a private endpoint is found, it is not a supported API. It needs controlled tests on a spare client before any integration.
- The currently verified app remains simulation-only. This diagnostic does not grant or revoke Internet access.
