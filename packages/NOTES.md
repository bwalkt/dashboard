# Architecture Decision: Verifier vs Direct Mobile App

## Context

Designing authentication architecture for SaaS application access with mobile device acting as authentication token (similar to FOB/Yubikey).

**Primary Threat Model**: Remote attacks

## Architecture Options

### Option 1: Current Design (with Verifier)

```
[SaaS Apps in Browser] <--websockets--> [Verifier (Desktop)] <--BLE--> [Mobile App]
                                              |
                                         Local Web Server
```

**Components:**
- Mobile app (phone) - acts as authentication FOB
- Verifier (desktop) - runs local web server, accepts requests from SaaS apps
- SaaS apps (browsers) - communicate with verifier over websockets
- Verifier � Mobile app: Bluetooth (BLE) communication for verification
- Verifier updates headers before SaaS apps communicate with server

### Option 2: Direct Mobile App

```
[SaaS Apps in Browser] <--websockets--> [Mobile App with Web Server]
```

**Components:**
- Mobile app runs web server directly
- SaaS apps communicate directly with mobile app
- No verifier component

## Trade-off Analysis

### Option 1: Keep Verifier

**Pros:**
- Physical security layer via BLE proximity verification
- Network flexibility (mobile on cellular, desktop on WiFi)
- Better desktop UX (browser connects to localhost)
- Avoids mobile OS restrictions on background services

**Cons:**
- Deployment complexity (two components to install)
- More failure points (BLE connectivity, verifier crashes)
- Additional attack surface
- Development/maintenance overhead (two codebases)

### Option 2: Direct Mobile App

**Pros:**
- Architectural simplicity (single component)
- Smaller attack surface
- Easier deployment
- Lower maintenance overhead

**Cons:**
- Lose proximity verification (no BLE)
- Network discovery complexity (how does browser find mobile device?)
- Cross-network issues (mobile on cellular unreachable from desktop WiFi)
- Mobile OS restrictions (iOS/Android may limit background servers)
- Battery drain from running web server
- Firewall/NAT complexity

## Decision Factors

### Critical Insight: Proximity Verification vs Remote Attacks

**For remote attack protection, BLE proximity verification provides minimal security benefit:**
- Remote attackers cannot access the mobile device anyway
- If mobile device is compromised, proximity checks don't help
- Security comes from: strong cryptography, secure key storage, encrypted channels

**BLE proximity is valuable for:**
- Insider threat protection
- Physical presence verification
- Scenarios where you need to prove device is nearby

### Practical Considerations

1. **Network Accessibility**: localhost (verifier) vs discovering mobile device IP
2. **Mobile OS Compatibility**: Background server restrictions on iOS/Android
3. **User Experience**: Seamless desktop access expectations
4. **Cross-network Scenarios**: Common in practice

## Recommendation

**Start without the verifier** - build mobile app with web server capability first.

### Rationale:
- Simpler architecture, faster to ship
- Smaller attack surface for remote attack threat model
- Easier to audit and secure
- Proximity verification not needed for primary threat model

### Migration Path:
If practical issues emerge (mobile OS restrictions, network discovery UX problems, user complaints):
- Add verifier as optional desktop companion
- Make it a convenience feature, not security requirement
- Users who need simpler setup use mobile directly
- Users who want better desktop UX install verifier

### Core Security Properties (same in both options):
- Strong cryptographic authentication
- Secure key storage on mobile device (hardware-backed if possible)
- Encrypted communication channels
- Rate limiting and anomaly detection

## Next Steps

1. Validate mobile OS compatibility for background web servers
2. Design network discovery mechanism (mDNS, QR code, manual IP entry)
3. Build mobile app with web server capability
4. Test UX with target users
5. Revisit verifier if practical (not security) issues require it

## Notes

- The verifier is primarily a UX/convenience component in this threat model
- Security properties are equivalent for remote attack protection
- Keep architecture flexible to add verifier later if needed
