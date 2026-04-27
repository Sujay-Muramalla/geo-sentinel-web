const DEFAULT_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

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
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildGeneratePayload(form)),
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (payload?.success === false) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      "Backend returned an unsuccessful response.";
    throw new Error(message);
  }

  return payload;
}

export async function fetchReportByQueryHash(queryHash) {
  if (!queryHash) {
    throw new Error("No report query hash is available for this intelligence run.");
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
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Report download failed with status ${response.status}`;
    throw new Error(message);
  }

  if (payload?.success === false) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      "Backend returned an unsuccessful report response.";
    throw new Error(message);
  }

  return payload;
}

export async function fetchReportItemByResultId(queryHash, resultId) {
  if (!queryHash) {
    throw new Error("No report query hash is available for this intelligence run.");
  }

  if (!resultId) {
    throw new Error("No result id is available for this intelligence result.");
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
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Per-card report download failed with status ${response.status}`;
    throw new Error(message);
  }

  if (payload?.success === false) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      "Backend returned an unsuccessful per-card report response.";
    throw new Error(message);
  }

  return payload;
}

export async function fetchReportItemPdfByResultId(queryHash, resultId) {
  if (!queryHash) {
    throw new Error("No report query hash is available for this intelligence run.");
  }

  if (!resultId) {
    throw new Error("No result id is available for this intelligence result.");
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
    let message = `Per-card PDF report download failed with status ${response.status}`;

    try {
      const payload = await response.json();
      message = payload?.error?.message || payload?.message || message;
    } catch {
      // PDF endpoint may return non-JSON errors. Keep the HTTP status message.
    }

    throw new Error(message);
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.toLowerCase().includes("application/pdf")) {
    throw new Error("Backend did not return a PDF report.");
  }

  return response.blob();
}