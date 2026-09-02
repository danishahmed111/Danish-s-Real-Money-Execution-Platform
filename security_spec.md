# Firestore Security Specification - Cryptoverse Exchange

This document defines the zero-trust security architecture, data invariants, and automated verification guidelines for the Firebase Firestore databases.

## 1. Data Invariants

1. **Isolation Invariant**: A user's profile, linked wallets, tracked assets, private security, and transactions belong exclusively to that registered user. There is **no** cross-user read or write access for any other non-admin user.
2. **PII Separation Invariant**: Sensitives such as the custom two-factor OTP secrets (`twoFactorSecret`), backup recovery strings, and primary Gmail logs must be strictly isolated to the `/private/security` subcollection. Other users must not have `get` or `list` rights here.
3. **Immutability Invariant**: Critical ledger indicators like `transactionId`, `walletId`, `createdAt`, `originalOwnerId`, and `type` of activity must be strictly read-only after creation.
4. **Id Integrity Invariant**: All document IDs must fit alphanumeric format matching `^[a-zA-Z0-9_\-]+$` and have an upper boundary size limit of 128 characters to protect against recursive denial-of-wallet sizing attacks.
5. **Server Authority Invariant**: All transaction and log update triggers must stamp chronological milestones (e.g. `createdAt`, `updatedAt`, `timestamp`) matching the server-trusted transaction time (`request.time`).

---

## 2. The "Dirty Dozen" Malicious Payloads (Locked Out)

The following 12 payloads are guaranteed to be rejected with `PERMISSION_DENIED` by our security engine. We enforce these boundaries strictly within `firestore.rules`:

### Attack 1: Self-Assigned Identity Hijacking (Identity Spoofing)
An attacker attempts to write subcollection data attributing ownership to another user profile.
* **Payload to `/users/attackerUID/assets/assetBTC`**:
  ```json
  {
    "assetId": "assetBTC",
    "symbol": "BTC",
    "name": "Bitcoin",
    "amount": 10.0,
    "buyPrice": 50000,
    "ownerId": "victimUID" // Attempting to spoof owner ID to link with another customer
  }
  ```
* **Guard**: We verify that the user's path variable `{userId}` matches `request.auth.uid` precisely on all read and write queries.

### Attack 2: Direct Secret Harvesting (PII Blanket Reading)
A logged-in hacker queries or fetches the private security subcollection of another user to leak their Google Email or TOTP 2FA Secret.
* **Operation**: `GET /users/victimUID/private/security` or `LIST /users/victimUID/private/security`
* **Guard**: Rules explicitly forbid reads here unless `userId == request.auth.uid`, blocking all blanket query scraping.

### Attack 3: Unlimited String Injection Attack (Denial of Wallet)
An attacker tries to inject a massive 15MB binary/text string in place of the wallet tracking label to rack up Firestore storage costs.
* **Payload to `/users/attackerUID/wallets/evm_main`**:
  ```json
  {
    "walletId": "evm_main",
    "address": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "network": "Ethereum",
    "label": "A".repeat(5000000), // 5MB string
    "createdAt": "request.time"
  }
  ```
* **Guard**: Strict length assertions: `incoming().label.size() <= 64`.

### Attack 4: State Shortcutting (Manual Balance Inflation)
A user tries to bypass the exchange mechanism by updating their tracked assets using a direct client payload, or modifying their asset balance without registering a proper transaction.
* **Payload to `/users/attackerUID/assets/assetUSDC`**:
  ```json
  {
    "assetId": "assetUSDC",
    "symbol": "USDC",
    "name": "USD Coin",
    "amount": 999999999.0, // Manually raising holdings to 1 billion
    "buyPrice": 1.0,
    "updatedAt": "request.time"
  }
  ```
* **Guard**: While manual assets can be tracked, actual exchange balances are kept safe. Updates must match strict transactional flows, and keys must fit strict Schema shapes.

### Attack 5: Shadow Update Attack (Ghost Field Injection)
A user tries to update asset information but sneaks in an unauthorized administrative flag like `isVerified` or `isAdmin` inside their public profile or private assets.
* **Payload to `/users/attackerUID/public/profile`**:
  ```json
  {
    "userId": "attackerUID",
    "displayName": "Hacker",
    "isAdmin": true, // GHOST FIELD
    "createdAt": "existing().createdAt",
    "updatedAt": "request.time"
  }
  ```
* **Guard**: Every write or update is protected by `affectedKeys().hasOnly()` gates that restrict modifications exclusively to defined properties.

### Attack 6: Temporal Integrity Hijack (Client Clock Spoof)
An attacker submits a custom transaction with a falsified back-dated timestamp (e.g. showing they bought Bitcoin at $15,000 yesterday instead of today's market value).
* **Payload to `/users/attackerUID/transactions/tx_fake`**:
  ```json
  {
    "transactionId": "tx_fake",
    "type": "BUY",
    "fromAsset": "USDC",
    "toAsset": "BTC",
    "fromAmount": 15000,
    "toAmount": 1,
    "usdValue": 15000,
    "fee": 5,
    "timestamp": "2023-01-01T00:00:00Z" // Spoofed timestamp
  }
  ```
* **Guard**: Prohibits any transaction time exceptions: `incoming().timestamp == request.time`.

### Attack 7: Orphan Record Generation (Missing Parent Invariant)
An attacker inserts transactions claiming connection to a fictional non-existent exchange asset item.
* **Guard**: Relational checks during transaction creation verify the asset existence before writing, preventing orphaned transaction states.

### Attack 8: Document ID Poisoning Attack
An attacker tries to write records with massive binary-characters as Document Keys to overflow indexes.
* **Target**: `/users/attackerUID/wallets/PoisonedString-SpecialChar#%*@@@`
* **Guard**: Strict check `isValidId(walletId)` validating ID size is `<= 128` and conforms to alphanumeric regular expression rules.

### Attack 9: Mutating Immutable Records
A user tries to alter a transaction ledger after execution has been completed to claim they traded Sol instead of USDC.
* **Payload to update `/users/attackerUID/transactions/tx_102`**:
  ```json
  {
    "fromAsset": "SOL" // Changing immutable transaction history
  }
  ```
* **Guard**: Strict update restrictions for transactions, preventing changes to core transaction fields or denying transaction modifications altogether (`allow update: if false;`).

### Attack 10: Anonymous Write Hijacking
An unauthenticated or anonymous visitor tries to insert wallet records into users' trackers.
* **Guard**: We verify `request.auth != null && request.auth.token.email_verified == true`.

### Attack 11: Non-Standard String Structure Poisoning
An attacker places binary strings or unformatted emails instead of correct RFC email structures inside their security settings.
* **Guard**: Private security settings schema validation checks: `data.email is string && data.email.size() <= 128 && data.email.matches('^.+@.+$')`.

### Attack 12: List Query Dumping (Collection Scraping)
A malicious client issues a flat `getDocs(collection('users'))` to scoop up all registered database nodes.
* **Guard**: Blanket queries without a strict user constraint will be rejected: `allow list: if resource.data.userId == request.auth.uid`.

---

## 3. The Test Runner Reference

To enforce these payloads systematically, we have designed the security spec logic to prevent common bypassing strategies. The rules require:
1. `request.auth != null`
2. Static schema constraints (using `isValid[Entity]`)
3. Precise ownership matching (using `{userId} == request.auth.uid`).
