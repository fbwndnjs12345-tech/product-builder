# No-purchase test plan for GAPD-7300-only setup

## Decision

Do not change the LG U+ GAPD-7300 configuration or firmware. No verified supported API or on-router captive portal installation path has been established for this exact device. The available menu details are not enough to prove that it can enforce QR-issued timed Internet sessions.

## What can be tested today at zero cost

### A. Test the app workflow on the existing PC and phone

- Run the Node.js app locally on the PC.
- Test administrator login, QR issuance, one-time claim, duplicate claim rejection, revocation, and expiry state.
- This verifies application logic only. It does not restrict any phone's Internet access.
- For a phone to open the PC-hosted claim page, both devices must be on the same trusted home Wi-Fi and the PC firewall must permit the app port. Do not expose the admin panel to the public Internet.

### B. Inspect the router without changing settings

- In the router UI, inspect `네트워크 설정 > 세부 설정` and look only for `MAC 필터링` / device access controls. A community guide reports this menu may exist on some GAPD-7300 firmware, but it is not an official confirmation and may vary by firmware/account.
- If present, read the screen and report the exact available options. Do not enable deny-all/allow-list, bridge mode, DMZ, or reset the router.
- Even if MAC filtering exists, it is not an adequate substitute for a QR-based timed captive portal: it typically controls Wi-Fi association by MAC, does not securely bind a QR claim to the gateway session, and may be affected by randomized MAC addresses.

### C. Optional no-purchase network experiment

A PC-based gateway or virtual router might be testable using existing hardware, but feasibility depends on Windows version, available network adapters, and whether the PC can provide an isolated downstream network while retaining upstream Internet. Windows Mobile Hotspot by itself does not prove that per-client forwarding can be reliably and securely controlled by this Node app. Do not treat a Windows Firewall rule prototype as production-grade enforcement without verifying forwarded traffic, IPv6, client identity, and reconnect behavior.

## Actual enforcement requirement

openNDS is designed to run on a Linux/OpenWrt gateway that is the client's default gateway and can control forwarding. A portal server alone cannot block traffic on the LG U+ router. If no compatible existing device or supported router API is available, full real enforcement cannot be achieved reliably with only the GAPD-7300 and the web application.

## Safe next action

First test the app workflow, then inspect `세부 설정` without changing anything. Record the exact menu items visible. Only if a suitable existing gateway cannot be found should a compatible OpenWrt device be considered, and verify its exact hardware revision in the official OpenWrt Table of Hardware before purchase.
