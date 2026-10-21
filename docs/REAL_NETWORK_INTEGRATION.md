# Real network enforcement integration plan

## Current verified state

The app currently validates receipt QR tokens and records session expiry. It does not control packet forwarding. The network-enforcement module added in this branch is a fail-closed interface only; it is not an OpenWrt/openNDS adapter.

## Target architecture

1. Keep the existing LG U+ GAPD-7300 as the upstream Internet router.
2. Create an isolated guest/test Wi-Fi network behind a separate gateway that supports OpenWrt and openNDS. Do not change the existing home SSID or router mode for initial testing.
3. Ensure test clients use the OpenWrt gateway as their default gateway and DHCP server. Clients must not be able to bypass it through another SSID, wired connection, or IPv6 path.
4. Configure openNDS captive portal/FAS so that a client is identified by the gateway, not by an untrusted client-supplied IP/MAC value.
5. Have the portal validate the receipt QR token on the application server. Only after a signed, time-limited gateway authorization exchange succeeds should the session be marked as granted.
6. Use openNDS session timeout / deauthentication to enforce expiry at the gateway. Revoke access when the administrator cancels a session.
7. Persist the mapping between gateway session identity and receipt token, and reconcile state after application or gateway restarts.

## Security requirements before enabling real mode

- Do not trust a MAC address, IP address, client ID, or expiry submitted directly by a browser.
- Use the gateway's supported FAS/API mechanism and a shared secret; use HTTPS for any remote portal connection.
- Make grants idempotent and time-bounded; reject expired, revoked, replayed, or mismatched sessions.
- Keep gateway administration endpoints and credentials off the public Internet.
- Fail closed when the gateway is unreachable or an authorization result cannot be verified.
- Do not enable IPv6 on the controlled guest network unless equivalent enforcement is configured and tested.
- Never expose gateway credentials or .env secrets in logs or Git.

## Compatibility and hardware decision

The LG U+ GAPD-7300 has not been verified to support OpenWrt, openNDS, or a documented external API for per-client timed authorization. Do not attempt to flash it or change bridge/DMZ settings based on this plan.

Before buying anything, check whether an existing spare router can run a supported OpenWrt release. If no compatible spare router exists, a separate supported gateway/access point is likely required. The exact model must be checked against the official OpenWrt device table before purchase.

## Acceptance test

Use only a dedicated test SSID and one test phone:
1. Before QR claim, Internet access is blocked; only the captive portal is reachable.
2. A valid unused receipt QR allows access for the configured duration.
3. Reusing the same QR is rejected.
4. An expired or revoked session loses Internet access at the gateway.
5. Rebooting the app or gateway does not accidentally grant indefinite access.
6. The existing home Wi-Fi remains unaffected.

Do not report real network enforcement as implemented until all six tests pass on the target gateway.
