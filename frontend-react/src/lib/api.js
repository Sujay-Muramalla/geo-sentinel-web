import { getStoredAccessToken } from "@/lib/auth";

const DEFAULT_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export const RECOVERABLE_REPORT_ERROR_CODES = [
  "REPORT_METADATA_NOT_FOUND",
  "REPORT_SNAPSHOT_KEY_MISSING",
  "REPORT_SNAPSHOT_NOT_FOUND",
  "REPORT_ITEM_NOT_FOUND",
];

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeCountries(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizePublicationFocus(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (!value || value === "all") {
    return ["all"];
  }

  return [value];
}

function normalizeSentimentFilter(value) {
  return value && value !== "all" ? value : "all";
}

function buildGeneratePayload(form) {
  const scope = form.geographicScope || "world";

  return {
    query: form.scenario?.trim() || "",
    regions: [scope],
    countries: normalizeCountries(form.countries),
    mediaTypes:
      form.mediaType && form.mediaType !== "all"
        ? [form.mediaType]
        : ["newspapers", "news-channels"],
    publicationFocus: normalizePublicationFocus(form.publicationFocus),
    sentimentFilter: normalizeSentimentFilter(form.sentiment),
    sortBy: form.sortBy || "final-desc",
  };
}

function buildJsonHeaders() {
  const accessToken = getStoredAccessToken();

  return {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

function normalizeBackendErrorCode(payload, fallbackCode = "") {
  return (
    payload?.error?.code ||
    payload?.code ||
    payload?.data?.error?.code ||
    fallbackCode ||
    ""
  );
}

function normalizeBackendErrorDetails(payload) {
  return (
    payload?.error?.details ||
    payload?.details ||
    payload?.data?.error?.details ||
    null
  );
}

function buildApiError(payload, fallbackMessage, fallbackCode = "") {
  const message =
    payload?.error?.message ||
    payload?.message ||
    payload?.data?.error?.message ||
    fallbackMessage ||
    "Request failed.";

  const error = new Error(message);
  error.code = normalizeBackendErrorCode(payload, fallbackCode);
  error.details = normalizeBackendErrorDetails(payload);
  error.payload = payload || null;
  error.recoverable = Boolean(
    error.details?.recoverable ||
      RECOVERABLE_REPORT_ERROR_CODES.includes(error.code)
  );

  return error;
}

export function isRecoverableReportError(error) {
  const code = error?.code || "";

  if (RECOVERABLE_REPORT_ERROR_CODES.includes(code)) {
    return true;
  }

  if (error?.recoverable === true || error?.details?.recoverable === true) {
    return true;
  }

  const message = String(error?.message || "").toUpperCase();

  return RECOVERABLE_REPORT_ERROR_CODES.some((recoverableCode) =>
    message.includes(recoverableCode)
  );
}

export function getApiResults(payload) {
  return normalizeArray(payload?.data?.results || payload?.results);
}

export function getApiMeta(payload) {
  return payload?.meta || payload?.data?.meta || {};
}

export function getApiCounts(payload) {
  return (
    payload?.data?.counts ||
    payload?.counts || {
      raw: 0,
      filtered: 0,
      returned: 0,
      rawItemsSeen: 0,
      filteredOut: 0,
    }
  );
}

export function getAppliedFilters(payload) {
  return (
    payload?.data?.appliedFilters ||
    payload?.appliedFilters || {
      regions: [],
      countries: [],
      publicationFocus: [],
      sentimentFilter: "all",
    }
  );
}

export function getSelectedSources(payload) {
  return normalizeArray(
    payload?.data?.selectedSources ||
      payload?.selectedSources ||
      payload?.data?.sourceSelection?.selectedSources ||
      payload?.sourceSelection?.selectedSources
  );
}

export function getExpandedQueries(payload) {
  return normalizeArray(payload?.data?.expandedQueries || payload?.expandedQueries);
}

export function getDiagnostics(payload) {
  return payload?.data?.diagnostics || payload?.diagnostics || null;
}

export function getNoResultExplanation(payload) {
  return payload?.data?.noResultExplanation || payload?.noResultExplanation || null;
}

export function getFeedErrors(payload) {
  return normalizeArray(payload?.data?.feedErrors || payload?.feedErrors);
}

export function getReportQueryHash(payload) {
  return (
    payload?.meta?.cache?.queryHash ||
    payload?.data?.meta?.cache?.queryHash ||
    payload?.data?.cache?.queryHash ||
    payload?.cache?.queryHash ||
    payload?.meta?.queryHash ||
    payload?.data?.queryHash ||
    payload?.queryHash ||
    ""
  );
}

export async function generateIntelligence(form) {
  const endpoint = `${DEFAULT_API_BASE_URL}/api/intelligence/generate`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: buildJsonHeaders(),
    body: JSON.stringify(buildGeneratePayload(form)),
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw buildApiError(
      payload,
      `Request failed with status ${response.status}`,
      `HTTP_${response.status}`
    );
  }

  if (payload?.success === false) {
    throw buildApiError(
      payload,
      "Backend returned an unsuccessful response.",
      "INTELLIGENCE_GENERATION_FAILED"
    );
  }

  return payload;
}

export async function fetchReportByQueryHash(queryHash) {
  if (!queryHash) {
    const error = new Error(
      "No report query hash is available for this intelligence run."
    );
    error.code = "REPORT_QUERY_HASH_MISSING";
    error.recoverable = false;
    throw error;
  }

  const endpoint = `${DEFAULT_API_BASE_URL}/api/reports/${encodeURIComponent(
    queryHash
  )}`;

  const response = await fetch(endpoint);

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw buildApiError(
      payload,
      `Report download failed with status ${response.status}`,
      `HTTP_${response.status}`
    );
  }

  if (payload?.success === false) {
    throw buildApiError(
      payload,
      "Backend returned an unsuccessful report response.",
      "REPORT_DOWNLOAD_FAILED"
    );
  }

  return payload;
}

export async function fetchReportItemByResultId(queryHash, resultId) {
  if (!queryHash) {
    const error = new Error(
      "No report query hash is available for this intelligence run."
    );
    error.code = "REPORT_QUERY_HASH_MISSING";
    error.recoverable = false;
    throw error;
  }

  if (!resultId) {
    const error = new Error("No result id is available for this intelligence result.");
    error.code = "REPORT_RESULT_ID_MISSING";
    error.recoverable = false;
    throw error;
  }

  const endpoint = `${DEFAULT_API_BASE_URL}/api/reports/${encodeURIComponent(
    queryHash
  )}/items/${encodeURIComponent(resultId)}`;

  const response = await fetch(endpoint);

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw buildApiError(
      payload,
      `Per-card report download failed with status ${response.status}`,
      `HTTP_${response.status}`
    );
  }

  if (payload?.success === false) {
    throw buildApiError(
      payload,
      "Backend returned an unsuccessful per-card report response.",
      "CARD_REPORT_DOWNLOAD_FAILED"
    );
  }

  return payload;
}

export async function fetchReportItemPdfByResultId(queryHash, resultId) {
  if (!queryHash) {
    const error = new Error(
      "No report query hash is available for this intelligence run."
    );
    error.code = "REPORT_QUERY_HASH_MISSING";
    error.recoverable = false;
    throw error;
  }

  if (!resultId) {
    const error = new Error("No result id is available for this intelligence result.");
    error.code = "REPORT_RESULT_ID_MISSING";
    error.recoverable = false;
    throw error;
  }

  const endpoint = `${DEFAULT_API_BASE_URL}/api/reports/${encodeURIComponent(
    queryHash
  )}/items/${encodeURIComponent(resultId)}?format=pdf`;

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/pdf",
    },
  });

  if (!response.ok) {
    let payload = null;

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    throw buildApiError(
      payload,
      `Per-card PDF report download failed with status ${response.status}`,
      `HTTP_${response.status}`
    );
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.toLowerCase().includes("application/pdf")) {
    const error = new Error("Backend did not return a PDF report.");
    error.code = "REPORT_PDF_CONTENT_TYPE_INVALID";
    error.recoverable = false;
    throw error;
  }

  return response.blob();
}