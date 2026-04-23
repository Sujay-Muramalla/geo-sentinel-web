const DEFAULT_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildGeneratePayload(form) {
  return {
    query: form.scenario?.trim() || "",
    scope: form.geographicScope || "world",
    countries: normalizeArray(form.countries),
    mediaType: form.mediaType || "all",
    publicationFocus: form.publicationFocus || "all",
    sentiment: form.sentiment || "all",
    sort: form.sortBy || "final-desc",
  };
}

export function getApiResults(payload) {
  return normalizeArray(payload?.data?.results);
}

export function getApiMeta(payload) {
  return payload?.meta || {};
}

export function getApiCounts(payload) {
  return (
    payload?.data?.counts || {
      raw: 0,
      filtered: 0,
      returned: 0,
    }
  );
}

export function getAppliedFilters(payload) {
  return (
    payload?.data?.appliedFilters || {
      regions: [],
      countries: [],
      publicationFocus: [],
      sentimentFilter: "all",
    }
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