const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

function buildGeneratePayload(form) {
  return {
    scenario: form.scenario,
    geographicScope: form.geographicScope,
    countries: form.countries,
    mediaType: form.mediaType,
    publicationFocus: form.publicationFocus,
    sentiment: form.sentiment,
    sortBy: form.sortBy,
  };
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
    throw new Error(payload?.message || "Backend returned an unsuccessful response.");
  }

  return payload;
}