const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN || "";
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || "";
const COGNITO_REDIRECT_URI =
  import.meta.env.VITE_COGNITO_REDIRECT_URI || window.location.origin;
const COGNITO_LOGOUT_URI =
  import.meta.env.VITE_COGNITO_LOGOUT_URI || window.location.origin;

const AUTH_STORAGE_KEY = "geoSentinelAuthSession";

function buildUrl(baseUrl, params) {
  const url = new URL(baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

export function isAuthConfigured() {
  return Boolean(COGNITO_DOMAIN && COGNITO_CLIENT_ID);
}

export function buildLoginUrl() {
  if (!isAuthConfigured()) return "";

  return buildUrl(`${COGNITO_DOMAIN}/login`, {
    client_id: COGNITO_CLIENT_ID,
    response_type: "code",
    scope: "openid email profile",
    redirect_uri: COGNITO_REDIRECT_URI,
  });
}

export function buildLogoutUrl() {
  if (!isAuthConfigured()) return "";

  return buildUrl(`${COGNITO_DOMAIN}/logout`, {
    client_id: COGNITO_CLIENT_ID,
    logout_uri: COGNITO_LOGOUT_URI,
  });
}

export function readStoredAuthSession() {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeAuthSession(session) {
  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      ...session,
      storedAt: new Date().toISOString(),
    })
  );
}

export function clearAuthSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function consumeHostedUiCallback() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    return {
      handled: true,
      error,
      errorDescription,
      session: null,
    };
  }

  if (!code) {
    return {
      handled: false,
      error: "",
      errorDescription: "",
      session: readStoredAuthSession(),
    };
  }

  const session = {
    authenticated: true,
    provider: "cognito-hosted-ui",
    code,
    redirectUri: COGNITO_REDIRECT_URI,
  };

  storeAuthSession(session);

  url.searchParams.delete("code");
  url.searchParams.delete("state");
  window.history.replaceState({}, document.title, url.toString());

  return {
    handled: true,
    error: "",
    errorDescription: "",
    session,
  };
}