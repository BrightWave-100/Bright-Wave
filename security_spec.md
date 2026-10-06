# Challenge Arena — Security Specification (Phase 0 TDD)

## 1. Data Invariants

1. **Authoritative Game Engine Isolation**: Clients are strictly forbidden from writing directly to `/challenges/{challengeId}`, `/challengeSessions/{sessionId}`, `/leaderboards/{entryId}`, `/dailyChallenges/{dateKey}`, or `/friendChallenges/{shareToken}`. All gameplay state transitions, scores, share tokens, and leaderboard entries are computed authoritatively on the backend server.
2. **PII Split-Collection Isolation**: User email addresses are isolated in `/users/{userId}/private/info` (`docId == 'info'`) and may ONLY be read or written by the verified owner (`request.auth.uid == userId && request.auth.token.email_verified == true`) when the parent `/users/{userId}` document exists.
3. **Strict Ownership & Email Verification**: All client writes to `/users/{userId}`, `/users/{userId}/private/{docId}`, `/results/{resultId}`, and `/analyticsEvents/{eventId}` require `request.auth != null && request.auth.token.email_verified == true`.
4. **Temporal & Immutable Integrity**: Every `createdAt` and `updatedAt` field must equal `request.time`. Immutable fields (`uid`, `ownerUid`, `createdAt`, `sessionId`, `challengeId`, `shareToken`) cannot be altered during updates.
5. **Query Enforcer**: Every `allow list` rule enforces `resource.data.ownerUid == request.auth.uid` so clients cannot scrape other users' saved results or analytics events.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Shadow Field Injection on User Profile)**:
   `POST /users/user_1` with `{ uid: "user_1", displayName: "Alex", AnonymousPlayerId: "anon_1", createdAt: request.time, updatedAt: request.time, isAdmin: true }` -> `PERMISSION_DENIED` (`hasOnly` check fails).
2. **Payload 2 (Unverified Email Spoofing)**:
   Authenticated user with `email_verified: false` attempts to write `/users/user_1` -> `PERMISSION_DENIED`.
3. **Payload 3 (Cross-User PII Read)**:
   `user_2` attempts `GET /users/user_1/private/info` -> `PERMISSION_DENIED`.
4. **Payload 4 (Direct Client Leaderboard Manipulation)**:
   Client attempts `POST /leaderboards/entry_99` with `{ score: 100 }` -> `PERMISSION_DENIED` (`allow write: if false`).
5. **Payload 5 (Direct Client Session State Tampering)**:
   Client attempts `PATCH /challengeSessions/sess_1` with `{ state: { money: 999999 } }` -> `PERMISSION_DENIED` (`allow write: if false`).
6. **Payload 6 (ID Poisoning / Oversized String)**:
   Client attempts to create `/results/bad$id!` or `displayName` of 500 characters -> `PERMISSION_DENIED` (`isValidId` and `.size() <= 60` checks fail).
7. **Payload 7 (Out-of-Bounds Score Injection in SavedResult)**:
   Client attempts to save result in `/results/res_1` with `score: 999` -> `PERMISSION_DENIED` (`score >= 0 && score <= 100` check fails).
8. **Payload 8 (Forged Client Timestamp)**:
   Client sends `createdAt: Timestamp(2020, 1, 1)` instead of `request.time` -> `PERMISSION_DENIED`.
9. **Payload 9 (Identity Spoofing on SavedResult)**:
   `user_1` sends `ownerUid: "user_2"` when creating `/results/res_1` -> `PERMISSION_DENIED`.
10. **Payload 10 (Blanket List Scraping on Results)**:
    `user_1` executes an unconstrained `list` query on `/results` without `where('ownerUid', '==', 'user_1')` -> `PERMISSION_DENIED`.
11. **Payload 11 (Orphaned Subcollection Write)**:
    `user_1` writes to `/users/user_1/private/info` when `/users/user_1` does not exist -> `PERMISSION_DENIED` (Master Gate check fails).
12. **Payload 12 (Immutable Field Mutation on Update)**:
    `user_1` updates `/users/user_1` and attempts to mutate `createdAt` or `uid` -> `PERMISSION_DENIED` (`affectedKeys().hasOnly(['displayName', 'updatedAt'])` fails).
