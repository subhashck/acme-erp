export function googleAuthErrorMessage(code?: string, description?: string) {
  const normalized = code?.trim().toLowerCase();
  switch (normalized) {
    case "access_denied":
    case "org_internal":
      return "Google did not allow this account to sign in. If the Google app is in Testing mode, an administrator must add this email under Google Auth Platform → Audience → Test users. Check that you selected the same Gmail address registered in ERP.";
    case "account_not_linked":
      return "This Google account is not connected to an ERP account yet. Sign in with your ERP email and password, then choose Settings → Profile & Security → Connect Google account.";
    case "google_account_not_allowed":
      return "Use the verified Gmail address registered to your ERP account. Other Google account types are not enabled for this sign-in.";
    case "oauth_provider_not_found":
      return "Google sign-in is not configured on this server. Ask an administrator to configure the Google OAuth client ID and secret, then restart ERP.";
    case "redirect_uri_mismatch":
    case "invalid_redirect_uri":
      return "Google rejected the callback URL. Ask an administrator to register this app's exact callback URL in Google Cloud OAuth client settings.";
    case "invalid_client":
    case "unauthorized_client":
      return "Google rejected the OAuth client credentials. Ask an administrator to verify the client ID, client secret, and OAuth client type.";
    case "state_mismatch":
      return "The Google sign-in session expired or could not be verified. Start again from the ERP sign-in page.";
    default:
      if (description?.toLowerCase().includes("test user") || description?.toLowerCase().includes("testing")) {
        return "This Google account is not allowed while the app is in Testing mode. Ask an administrator to add it under Google Auth Platform → Audience → Test users.";
      }
      return "Google sign-in could not be completed. Try again, or use your ERP email and password. If this continues, share the error code with your administrator.";
  }
}
