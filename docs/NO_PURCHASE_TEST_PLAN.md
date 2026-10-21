# No-purchase test plan for GAPD-7300-only setup

## Decision

The user's actual GAPD-7300 UI exposes a MAC Filtering list with up to 30 entries and fields for On/Off, policy (allow/block), hardware address, weekday, and time range. The time controls shown are hour selectors (00–24), with no minute selector visible in the supplied screen. This supports investigating a manual scheduled restriction, but does not establish a supported API or QR-driven automation path.

**Conclusion for the requested product:** do not claim QR-based, per-customer timed Internet control is implemented by this router. The observed UI is a recurring weekday/hour schedule, not a confirmed API for dynamically granting a session for (for example) 15 or 30 minutes.

## Why MAC filtering alone does not complete the product

1. The QR claim runs in a browser. Normal web pages cannot read the phone's Wi-Fi MAC address. The router's connected-client list may show a MAC, but a user/device-to-session mapping would need a reliable gateway-side integration.
2. The displayed schedule appears hour-granular, so it cannot by itself express arbitrary minute-level expiry times.
3. A weekly allow/block rule is not the same as a per-session lease. A QR can be scanned at an arbitrary time, and its expiry must be calculated from that claim time.
4. The menu does not prove the rule blocks Internet forwarding rather than Wi-Fi association or another subset of traffic. This needs a controlled physical test.
5. No documented, supported GAPD-7300 API has been verified. Browser UI automation or guessed private endpoints are fragile and could lock devices out.

## What can be tested today at zero cost

### A. Test the app workflow on the existing PC and phone

- Run the Node.js app locally on the PC.
- Test administrator login, QR issuance, one-time claim, duplicate claim rejection, revocation, and expiry state.
- This verifies application logic only. It does not restrict any phone's Internet access.
- For a phone to open the PC-hosted claim page, both devices must be on the same trusted home Wi-Fi and the PC firewall must permit the app port. Do not expose the admin panel to the public Internet.

### B. Verify what scheduled MAC filtering actually blocks

The user's GAPD-7300 UI shows:
- Maximum 30 MAC-filter rules.
- Per-rule On/Off.
- Policy: allow or block.
- Hardware/MAC address.
- Days of week (Sunday through Saturday).
- Start and end time selectors that appear to select whole hours.

**Safe manual test, only when ready:** use a spare test phone/device, not the PC hosting the app and not the user's only device for router administration. Record that test device's Wi-Fi MAC address for the current SSID (disable randomized/private address only if necessary and only for that test SSID), add a single explicit *block* rule for a short future window, and verify whether that device loses Internet while the PC and other devices remain online. Keep the router admin session on another device if possible. Remove/disable the test rule afterward and confirm the device reconnects. Do not configure a global deny rule, an allow-list for all devices, or rules for the PC/router administration device. If there is no spare test device, do not apply a rule yet.

A successful manual schedule test proves only that the schedule blocks that test device; it does not prove QR-driven, minute-accurate sessions.

### C. Investigate whether the router UI can be safely automated

No documented, supported GAPD-7300 API has been verified. A safe investigation would inspect browser network requests while opening the MAC-filter form and adding/editing a rule **without saving or applying changes where possible**. Do not guess endpoints or send state-changing requests. Any potential UI endpoint must be verified against the actual firmware and tested only on a spare device. Credentials must stay local and must never be committed to GitHub.

Even if a private endpoint exists, it should not be treated as stable or supported. Do not build production enforcement on it until requests, authentication, schedule semantics, rollback, and firmware behavior are verified.

### D. Optional no-purchase network experiment

A PC-based gateway or virtual router might be testable using existing hardware, but feasibility depends on Windows version, available network adapters, and whether the PC can provide an isolated downstream network while retaining upstream Internet. Windows Mobile Hotspot by itself does not prove that per-client forwarding can be reliably and securely controlled by this Node app. Do not treat a Windows Firewall rule prototype as production-grade enforcement without verifying forwarded traffic, IPv6, client identity, and reconnect behavior.

## Actual enforcement requirement

openNDS is designed to run on a Linux/OpenWrt gateway that is the client's default gateway and can control forwarding. Its official documentation describes gateway-side client authentication and session timeouts; a portal server alone cannot block traffic on the LG U+ router. See [OpenWrt openNDS documentation](https://openwrt.org/docs/guide-user/services/captive-portal/opennds) and [openNDS session timeout configuration](https://opennds.readthedocs.io/en/stable/config.html).

If no compatible existing gateway or supported router API is available, full, reliable enforcement cannot be achieved using only the GAPD-7300 and the web application.

## Current implementation state

- QR issuance, one-time token validation, revocation, and simulated expiry state exist in the application.
- `NETWORK_MODE=simulation` is the only verified working mode.
- The network-enforcement module is an interface boundary only; there is no GAPD-7300 adapter or real packet-blocking integration.
- Do not switch to `NETWORK_MODE=real`: it will not create a working gateway integration.
- No router settings have been changed by this project.

## Safe next action

Keep the app in simulation mode. If a spare test phone is available, verify the effect of one narrow MAC block schedule manually, then disable/remove it. Separately investigate the router UI's request behavior without applying changes. Only if no compatible existing gateway or supported API is available should an OpenWrt device be considered; verify the exact hardware revision in the official OpenWrt Table of Hardware before purchase.
