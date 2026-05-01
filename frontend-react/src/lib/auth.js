const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN || "";
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || "";
const COGNITO_REDIRECT_URI =
  import.meta.env.VITE_COGNITO_REDIRECT_URI || window.location.origin;
const COGNITO_LOGOUT_URI =
  import.meta.env.VITE_COGNITO_LOGOUT_URI || window.location.origin;

const AUTH_STORAGE_KEY = "geoSentinelAuthSession";
const PKCE_STORAGE_KEY = "geoSentinelPkceVerifier";

function buildUrl(baseUrl, params) {
  const url = new URL(baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );

  return decodeURIComponent(
    atob(padded)
      .split("")
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join("")
  );
}

function decodeJwtPayload(token) {
  try {
    const [, payload] = String(token || "").split(".");
    return payload ? JSON.parse(decodeBase64Url(payload)) : {};
  } catch {
    return {};
  }
}

async function sha256(value) {
  const encoded = new TextEncoder().encode(value);
  return window.crypto.subtle.digest("SHA-256", encoded);
}

function generateCodeVerifier() {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

async function generateCodeChallenge(verifier) {
  const digest = await sha256(verifier);
  return base64UrlEncode(digest);
}

export function isAuthConfigured() {
  return Boolean(COGNITO_DOMAIN && COGNITO_CLIENT_ID);
}

export async function buildLoginUrl() {
  if (!isAuthConfigured()) return "";

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  window.sessionStorage.setItem(PKCE_STORAGE_KEY, codeVerifier);

  return buildUrl(`${COGNITO_DOMAIN}/login`, {
    client_id: COGNITO_CLIENT_ID,
    response_type: "code",
    scope: "openid email profile",
    redirect_uri: COGNITO_REDIRECT_URI,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
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
  window.sessionStorage.removeItem(PKCE_STORAGE_KEY);
}

export function getStoredAccessToken() {
  const session = readStoredAuthSession();
  return session?.accessToken || "";
}

export function getStoredIdToken() {
  const session = readStoredAuthSession();
  return session?.idToken || "";
}

export function getStoredUserProfile(sessionOverride = null) {
  const session = sessionOverride || readStoredAuthSession();
  const claims = decodeJwtPayload(session?.idToken);

  const email = claims.email || "";
  const name =
    claims.name ||
    [claims.given_name, claims.family_name].filter(Boolean).join(" ") ||
    claims.preferred_username ||
    email.split("@")[0] ||
    "";

  return {
    name,
    email,
    username: claims.preferred_username || claims["cognito:username"] || "",
    emailVerified: Boolean(claims.email_verified),
  };
}

async function exchangeCodeForTokens(code) {
  const codeVerifier = window.sessionStorage.getItem(PKCE_STORAGE_KEY) || "";

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: COGNITO_CLIENT_ID,
    code,
    redirect_uri: COGNITO_REDIRECT_URI,
  });

  if (codeVerifier) {
    body.set("code_verifier", codeVerifier);
  }

  const response = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.error_description ||
        payload?.error ||
        `Token exchange failed with status ${response.status}`
    );
  }

  return payload;
}

export async function consumeHostedUiCallback() {
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

  const tokens = await exchangeCodeForTokens(code);

  const session = {
    authenticated: true,
    provider: "cognito-hosted-ui",
    accessToken: tokens.access_token || "",
    idToken: tokens.id_token || "",
    refreshToken: tokens.refresh_token || "",
    tokenType: tokens.token_type || "Bearer",
    expiresIn: tokens.expires_in || null,
    redirectUri: COGNITO_REDIRECT_URI,
  };

  storeAuthSession(session);
  window.sessionStorage.removeItem(PKCE_STORAGE_KEY);

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