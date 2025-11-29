# Account System Analysis & Recommendations

## 1. Current Implementation Status
**Status:** Basic Authentication (MVP)
*   **Auth Provider:** Supabase (Email/Password)
*   **Security:** hCaptcha enabled on Login/Signup.
*   **Session:** Managed via `AuthProvider` context + Middleware protection.
*   **Data Privacy:** Local-first sync architecture (IndexedDB <-> Supabase).
*   **Missing:** Logout (Implemented just now), Profile Management, Account Security features.

## 2. Missing Critical Features (Gap Analysis)

### A. User Profile Management
*   **Current:** No UI to view or edit user details.
*   **Requirement:** Users expect to verify who they are logged in as.
*   **Recommendation:**
    *   Add a "Profile" section in Settings.
    *   Allow updating `Full Name` (stored in `raw_user_meta_data`).
    *   (Optional) Avatar upload.

### B. Security Settings
*   **Current:** Users cannot change credentials once created.
*   **Requirement:** Standard security hygiene.
*   **Recommendation:**
    *   **Change Password:** Authenticated form to update password.
    *   **Change Email:** Critical for long-term usage. Requires a confirmation flow (Supabase sends "Confirm Email Change" to the *new* address).
    *   **Forgot Password:** A public page (`/forgot-password`) to trigger the reset email flow.

### C. Account Deletion (GDPR/CCPA Compliance)
*   **Current:** No self-serve deletion.
*   **Requirement:** "Right to be Forgotten".
*   **Recommendation:**
    *   Add a "Delete Account" danger zone in Settings.
    *   **Action:** Must delete the user from Supabase Auth (`supabase.auth.admin.deleteUser` requires service role, or use RPC) AND clear local IndexedDB data.

### D. Session Visibility
*   **Current:** Silent session management.
*   **Requirement:** Users should know if they are logged in on other devices.
*   **Recommendation:**
    *   List active sessions (if Supabase API exposes this to the client, otherwise strictly handled via token rotation).

## 3. Implementation Roadmap

### Phase 1: Essential (Do this next)
1.  **Profile Card in Settings:** Show current Name and Email.
2.  **Forgot Password Flow:** Create `/forgot-password` and `/reset-password` pages.
3.  **Update Password:** Add form in Settings.

### Phase 2: Compliance & Polish
1.  **Delete Account:** Implement the dangerous action with strict confirmation.
2.  **Email Change:** Implement the re-verification flow.

### Phase 3: Advanced
1.  **Social Auth:** Google/GitHub/LinkedIn providers (Supabase makes this easy).
2.  **MFA:** Enable TOTP (Authenticator App) support.

## 4. Technical Notes (Supabase Specifics)

*   **Password Reset:** Use `supabase.auth.resetPasswordForEmail(email)`. This sends a magic link. You need a page to handle the redirect (configured in Supabase > Auth > URL Configuration).
*   **Update User:** Use `supabase.auth.updateUser({ password: '...' })` or `{ email: '...' }`.
*   **Metadata:** Store non-auth data (preferences, name) in `user_metadata` or a separate `profiles` table if you need relational integrity.
