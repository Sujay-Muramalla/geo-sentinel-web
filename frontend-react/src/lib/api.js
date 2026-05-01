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
  if (Array.isArray(value)) return value.filter(Boolean);

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizePublicationFocus(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value || value === "all") return ["all"];
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

function getSafeUserMessage(code, fallbackMessage = "") {
  if (RECOVERABLE_REPORT_ERROR_CODES.includes(code)) {
    return "This report needs to be regenerated before download.";
  }

  if (code === "REPORT_QUERY_HASH_MISSING") {
    return "Run an intelligence scenario before downloading a report.";
  }

  if (code === "REPORT_RESULT_ID_MISSING") {
    return "This result is missing a report reference. Regenerate the scenario and retry.";
  }

  if (code === "REPORT_PDF_CONTENT_TYPE_INVALID") {
    return "The PDF report could not be prepared. Please retry the download.";
  }

  if (String(code).startsWith("HTTP_")) {
    return "The intelligence service is temporarily unavailable. Please retry later.";
  }

  return fallbackMessage || "The request could not be completed. Please retry.";
}

function buildApiError(payload, fallbackMessage, fallbackCode = "") {
  const rawMessage =
    payload?.error?.message ||
    payload?.message ||
    payload?.data?.error?.message ||
    fallbackMessage ||
    "Request failed.";

  const code = normalizeBackendErrorCode(payload, fallbackCode);
  const error = new Error(getSafeUserMessage(code, rawMessage));

  error.code = code;
  error.details = normalizeBackendErrorDetails(payload);
  error.payload = payload || null;
  error.rawMessage = rawMessage;
  error.recoverable = Boolean(
    error.details?.recoverable || RECOVERABLE_REPORT_ERROR_CODES.includes(error.code)
  );

  return error;
}

export function isRecoverableReportError(error) {
  const code = error?.code || "";

  if (RECOVERABLE_REPORT_ERROR_CODES.includes(code)) return true;
  if (error?.recoverable === true || error?.details?.recoverable === true) return true;

  const message = String(error?.rawMessage || error?.message || "").toUpperCase();

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
    throw buildApiError(payload, "", `HTTP_${response.status}`);
  }

  if (payload?.success === false) {
    throw buildApiError(payload, "", "INTELLIGENCE_GENERATION_FAILED");
  }

  return payload;
}

export async function fetchReportByQueryHash(queryHash) {
  if (!queryHash) {
    const error = new Error("Run an intelligence scenario before downloading a report.");
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
    throw buildApiError(payload, "", `HTTP_${response.status}`);
  }

  if (payload?.success === false) {
    throw buildApiError(payload, "", "REPORT_DOWNLOAD_FAILED");
  }

  return payload;
}

export async function fetchReportItemByResultId(queryHash, resultId) {
  if (!queryHash) {
    const error = new Error("Run an intelligence scenario before downloading a report.");
    error.code = "REPORT_QUERY_HASH_MISSING";
    error.recoverable = false;
    throw error;
  }

  if (!resultId) {
    const error = new Error(
      "This result is missing a report reference. Regenerate the scenario and retry."
    );
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
    throw buildApiError(payload, "", `HTTP_${response.status}`);
  }

  if (payload?.success === false) {
    throw buildApiError(payload, "", "CARD_REPORT_DOWNLOAD_FAILED");
  }

  return payload;
}

export async function fetchReportItemPdfByResultId(queryHash, resultId) {
  if (!queryHash) {
    const error = new Error("Run an intelligence scenario before downloading a report.");
    error.code = "REPORT_QUERY_HASH_MISSING";
    error.recoverable = false;
    throw error;
  }

  if (!resultId) {
    const error = new Error(
      "This result is missing a report reference. Regenerate the scenario and retry."
    );
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

    throw buildApiError(payload, "", `HTTP_${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.toLowerCase().includes("application/pdf")) {
    const error = new Error("The PDF report could not be prepared. Please retry the download.");
    error.code = "REPORT_PDF_CONTENT_TYPE_INVALID";
    error.recoverable = false;
    throw error;
  }

  return response.blob();
}