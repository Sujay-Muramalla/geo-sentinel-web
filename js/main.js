document.addEventListener("DOMContentLoaded", () => {
    const PROD_API_URL = "http://3.67.134.78:3000/api/intelligence/generate";

    const API_URL =
        window.GEO_SENTINEL_API_URL ||
        (
            window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1"
                ? "http://localhost:3000/api/intelligence/generate"
                : PROD_API_URL
        );

    const COUNTRY_SCOPE = {
        world: [
            "united-states", "canada", "mexico", "brazil", "argentina",
            "united-kingdom", "germany", "france", "poland", "ukraine",
            "russia", "china", "japan", "south-korea", "taiwan", "india",
            "pakistan", "israel", "iran", "saudi-arabia", "turkey",
            "egypt", "south-africa", "australia"
        ],
        europe: [
            "united-kingdom", "germany", "france", "poland", "ukraine",
            "italy", "spain", "netherlands", "sweden", "norway", "russia"
        ],
        asia: [
            "china", "japan", "south-korea", "taiwan", "india",
            "pakistan", "singapore", "indonesia", "philippines"
        ],
        "north-america": [
            "united-states", "canada", "mexico"
        ],
        africa: [
            "egypt", "south-africa", "nigeria", "kenya", "ethiopia", "morocco"
        ],
        "middle-east": [
            "israel", "iran", "saudi-arabia", "turkey", "uae", "qatar", "iraq", "jordan"
        ],
        "south-america": [
            "brazil", "argentina", "chile", "colombia", "peru"
        ],
        oceania: [
            "australia", "new-zealand"
        ]
    };

    const ALL_COUNTRIES = Array.from(
        new Set(Object.values(COUNTRY_SCOPE).flat())
    ).sort((a, b) => humanize(a).localeCompare(humanize(b)));

    const state = {
        query: "",
        regions: ["world"],
        countries: [],
        mediaTypes: ["newspapers", "news-channels"],
        publicationFocus: ["international"],
        sentimentFilter: "all",
        sortBy: "final-desc",
        selectedTrend: "",
        results: []
    };

    function normalizeUiText(value = "") {
        return String(value).trim().toLowerCase().replace(/\s+/g, " ");
    }

    function getCheckboxesForFilterGroup(groupTitle) {
        const groups = Array.from(document.querySelectorAll(".filter-group"));

        const match = groups.find((group) => {
            const titleText = normalizeUiText(group.textContent || "");
            return titleText.includes(normalizeUiText(groupTitle));
        });

        return match ? Array.from(match.querySelectorAll("input[type='checkbox']")) : [];
    }

    function mapPublicationFocusValues(values = []) {
        const normalized = (Array.isArray(values) ? values : [])
            .map((value) => String(value || "").trim().toLowerCase());

        if (!normalized.length) {
            return ["international"];
        }

        if (normalized.includes("international")) {
            return ["international"];
        }

        if (normalized.includes("international-publications")) {
            return ["international"];
        }

        if (normalized.includes("regional")) {
            return ["regional"];
        }

        if (normalized.includes("regional-publications")) {
            return ["regional"];
        }

        return ["all"];
    }

    const dom = {
        clearFiltersBtn: document.getElementById("clear-filters-btn"),
        scenarioInput: document.getElementById("scenario-command"),
        scopeChips: document.getElementById("scope-chips"),
        resultsMiniSummary: document.getElementById("results-mini-summary"),
        activeQueryLabel: document.getElementById("active-query-label"),
        activeSortLabel: document.getElementById("active-sort-label"),
        dominantSentimentLabel: document.getElementById("dominant-sentiment-label"),
        metricSignalStrength: document.getElementById("metric-signal-strength"),
        metricDominantTone: document.getElementById("metric-dominant-tone"),
        metricSourceSpread: document.getElementById("metric-source-spread"),
        resultsList: document.querySelector(".results-list"),
        resultsEmptyState: document.getElementById("results-empty-state"),
        generateBtn: document.querySelector(".scenario-command-actions .primary-action-btn"),
        saveQueryBtn: document.querySelector(".secondary-action-btn"),
        exampleChips: Array.from(document.querySelectorAll(".example-chip")),
        trendSignalItems: Array.from(document.querySelectorAll(".trend-signal-item")),
        expandButtons: Array.from(document.querySelectorAll(".expand-btn")),
        countryDropdownBtn: document.getElementById("country-dropdown-btn"),
        countryDropdown: document.getElementById("country-dropdown"),
        countryList: document.getElementById("country-list"),
        countrySearchInput: document.getElementById("country-search-input"),
        selectedCountries: document.getElementById("selected-countries"),
        sortResultsSelect: document.getElementById("sort-results-select"),
        sentimentRadios: Array.from(document.querySelectorAll("input[name='sentiment-filter']")),
        regionCheckboxes: getCheckboxesForFilterGroup("geographic scope"),
        mediaCheckboxes: getCheckboxesForFilterGroup("media type"),
        publicationCheckboxes: getCheckboxesForFilterGroup("publication focus")
    };

    init();

    function init() {
        console.log("Generate button:", dom.generateBtn);
        console.log("API URL:", API_URL);

        bindExpandButtons();
        bindScenarioInput();
        bindGenerateAction();
        bindClearFilters();
        bindExampleChips();
        bindTrendSignals();
        bindCountryDropdown();
        bindRegionFilters();
        bindMediaFilters();
        bindPublicationFilters();
        bindSentimentFilters();
        bindSortControl();

        renderCountryList();
        renderSelectedCountries();
        syncStateFromUI();
        hydrateStaticCards();
        renderScopeChips();
        renderToolbarFromResults(state.results);
        renderResultVisibility(state.results);
    }

    function bindExpandButtons() {
        dom.expandButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const targetId = button.dataset.target;
                const target = document.getElementById(targetId);
                if (!target) return;

                const isOpen = target.classList.toggle("is-open");
                button.textContent = isOpen ? "Show less" : "Show more";
            });
        });
    }

    function bindScenarioInput() {
        if (!dom.scenarioInput) return;

        dom.scenarioInput.addEventListener("input", (event) => {
            state.query = event.target.value.trim();
            state.selectedTrend = state.query;
            renderScopeChips();
            renderResultsMiniSummary();
        });

        dom.scenarioInput.addEventListener("keydown", async (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                await generateIntelligence();
            }
        });
    }

    function bindGenerateAction() {
        console.log("bindGenerateAction called");

        if (!dom.generateBtn) {
            console.error("Generate button not found");
            return;
        }

        dom.generateBtn.addEventListener("click", async () => {
            console.log("Generate button clicked");
            await generateIntelligence();
        });
    }

    function bindClearFilters() {
        if (!dom.clearFiltersBtn) return;

        dom.clearFiltersBtn.addEventListener("click", () => {
            resetAllFilters();
        });
    }

    function bindExampleChips() {
        dom.exampleChips.forEach((chip) => {
            chip.addEventListener("click", async () => {
                const query = chip.textContent.trim();
                if (dom.scenarioInput) {
                    dom.scenarioInput.value = query;
                }
                state.query = query;
                state.selectedTrend = query;
                renderScopeChips();
                renderResultsMiniSummary();
                await generateIntelligence();
            });
        });
    }

    function bindTrendSignals() {
        dom.trendSignalItems.forEach((item) => {
            item.addEventListener("click", async () => {
                const query = item.dataset.trendQuery || item.textContent.trim();
                if (dom.scenarioInput) {
                    dom.scenarioInput.value = query;
                }
                state.query = query;
                state.selectedTrend = query;

                dom.trendSignalItems.forEach((node) => node.classList.remove("is-active"));
                item.classList.add("is-active");

                renderScopeChips();
                renderResultsMiniSummary();
                await generateIntelligence();
            });
        });
    }

    function bindCountryDropdown() {
        if (!dom.countryDropdownBtn || !dom.countryDropdown) return;

        dom.countryDropdownBtn.addEventListener("click", () => {
            dom.countryDropdown.classList.toggle("hidden");
        });

        if (dom.countrySearchInput) {
            dom.countrySearchInput.addEventListener("input", () => {
                renderCountryList(dom.countrySearchInput.value.trim().toLowerCase());
            });
        }

        document.addEventListener("click", (event) => {
            const clickedInside =
                dom.countryDropdown.contains(event.target) ||
                dom.countryDropdownBtn.contains(event.target);

            if (!clickedInside) {
                dom.countryDropdown.classList.add("hidden");
            }
        });
    }

    function bindRegionFilters() {
        dom.regionCheckboxes.forEach((checkbox) => {
            checkbox.addEventListener("change", () => {
                state.regions = getCheckedValues(dom.regionCheckboxes);

                if (!state.regions.length) {
                    checkbox.checked = true;
                    state.regions = getCheckedValues(dom.regionCheckboxes);
                }

                pruneSelectedCountriesToScope();
                renderCountryList(dom.countrySearchInput?.value.trim().toLowerCase() || "");
                renderSelectedCountries();
                renderScopeChips();
                renderResultsMiniSummary();
            });
        });
    }

    function bindMediaFilters() {
        dom.mediaCheckboxes.forEach((checkbox) => {
            checkbox.addEventListener("change", () => {
                state.mediaTypes = getCheckedValues(dom.mediaCheckboxes);

                if (!state.mediaTypes.length) {
                    checkbox.checked = true;
                    state.mediaTypes = getCheckedValues(dom.mediaCheckboxes);
                }

                renderScopeChips();
                renderResultsMiniSummary();
            });
        });
    }

    function bindPublicationFilters() {
        dom.publicationCheckboxes.forEach((checkbox) => {
            checkbox.addEventListener("change", () => {
                state.publicationFocus = mapPublicationFocusValues(getCheckedValues(dom.publicationCheckboxes));
                renderScopeChips();
                renderResultsMiniSummary();
            });
        });
    }

    function bindSentimentFilters() {
        dom.sentimentRadios.forEach((radio) => {
            radio.addEventListener("change", () => {
                const checked = dom.sentimentRadios.find((node) => node.checked);
                state.sentimentFilter = checked ? checked.value : "all";
                applyClientFiltersAndRender();
            });
        });
    }

    function bindSortControl() {
        if (!dom.sortResultsSelect) return;

        dom.sortResultsSelect.addEventListener("change", () => {
            state.sortBy = dom.sortResultsSelect.value || "final-desc";
            applyClientFiltersAndRender();
        });
    }

    function syncStateFromUI() {
        state.query = dom.scenarioInput ? dom.scenarioInput.value.trim() : "";
        state.regions = getCheckedValues(dom.regionCheckboxes);
        state.countries = [...state.countries];
        state.mediaTypes = getCheckedValues(dom.mediaCheckboxes);
        state.publicationFocus = mapPublicationFocusValues(getCheckedValues(dom.publicationCheckboxes));

        const checkedSentiment = dom.sentimentRadios.find((node) => node.checked);
        state.sentimentFilter = checkedSentiment ? checkedSentiment.value : "all";
        state.sortBy = dom.sortResultsSelect ? (dom.sortResultsSelect.value || "final-desc") : "final-desc";

        if (!state.regions.length) state.regions = ["world"];
        if (!state.mediaTypes.length) state.mediaTypes = ["newspapers", "news-channels"];
        if (!state.publicationFocus.length) state.publicationFocus = ["international"];
    }

    function hydrateStaticCards() {
        const staticCards = Array.from(document.querySelectorAll(".result-card"));
        if (!staticCards.length) return;

        state.results = staticCards.map((card, index) => {
            const source = card.dataset.source || "Unknown Source";
            const title = card.dataset.title || card.querySelector(".result-title")?.textContent?.trim() || "Untitled";
            const summary = card.dataset.description || card.querySelector(".result-description")?.textContent?.trim() || "";
            const sentimentScore = Number(card.dataset.sentimentScore || 0);
            const publishedAt = card.dataset.published || new Date().toISOString();
            const region = card.dataset.region || "Global";
            const countries = (card.dataset.countries || "")
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
            const mediaTypes = (card.dataset.mediaType || "")
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
            const focus = (card.dataset.focus || "")
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);

            const sentimentLabel = normalizeSentimentLabel(sentimentScore);
            const relevanceScore = 70 + (index % 20);
            const freshnessScore = Math.max(55, 90 - index * 4);
            const signalScore = mapSignalTextToScore(card.dataset.signal || "medium", sentimentScore);
            const finalScore = Math.round((signalScore * 0.5) + (relevanceScore * 0.3) + (freshnessScore * 0.2));

            return {
                id: `static-${index + 1}`,
                title,
                source,
                sourceType: mediaTypes[0] || "mock",
                publishedAt,
                summary,
                url: "#",
                sentimentLabel,
                sentimentScore,
                signalScore,
                relevanceScore,
                freshnessScore,
                finalScore,
                region: humanize(region),
                country: countries.length ? countries.map(humanize).join(", ") : "Multiple",
                topic: state.query || "",
                rawCountries: countries,
                rawMediaTypes: mediaTypes,
                rawFocus: focus
            };
        });

        state.results = sortResults([...state.results], state.sortBy);
        renderResults(state.results);
    }

    async function generateIntelligence() {
        console.log("generateIntelligence triggered");
        syncStateFromUI();

        if (!state.query) {
            setGenerateButtonState(false);
            updateMiniSummary("Enter a scenario first · no request sent");
            return;
        }

        setGenerateButtonState(true);
        updateMiniSummary("Fetching live RSS intelligence...");

        try {
            const payload = {
                query: state.query,
                regions: state.regions,
                countries: state.countries,
                mediaTypes: state.mediaTypes,
                publicationFocus: state.publicationFocus,
                sentimentFilter: "all",
                sortBy: "final-desc",
                selectedTrend: state.selectedTrend
            };

            console.log("Payload:", payload);

            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Backend returned status ${response.status}`);
            }

            const data = await response.json();
            console.log("API response:", data);

            if (!data.success) {
                throw new Error(data.message || "Backend returned unsuccessful response");
            }

            state.results = Array.isArray(data.results) ? data.results.map(normalizeBackendResult) : [];
            applyClientFiltersAndRender(data);
        } catch (error) {
            console.error("Failed to generate intelligence:", error);
            state.results = [];
            if (dom.resultsList) {
                dom.resultsList.innerHTML = "";
            }
            if (dom.resultsEmptyState) {
                dom.resultsEmptyState.classList.remove("hidden");
            }
            renderToolbarFromResults([]);
            updateMiniSummary(`Live request failed · ${error.message}`);
        } finally {
            setGenerateButtonState(false);
        }
    }

    function stripHtml(value = "") {
        const temp = document.createElement("div");
        temp.innerHTML = String(value || "");
        return (temp.textContent || temp.innerText || "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function normalizeLiveScore(value, maxRaw = 10) {
        const numeric = Number(value || 0);
        if (!Number.isFinite(numeric)) return 0;
        return Math.round(clamp((numeric / maxRaw) * 100, 0, 100));
    }

    function normalizeBackendResult(item) {
        const sentimentScore = Number(item.sentimentScore || 0);

        const rawFinalScore = Number(item.finalScore || 0);
        const rawSignalScore = Number(item.signalScore || item.finalScore || 0);

        const finalScore = normalizeLiveScore(rawFinalScore, 10);
        const signalScore = normalizeLiveScore(rawSignalScore, 10);

        const sourceRegion = item.sourceRegion || item.region || "Global";
        const sourceCountry = item.sourceCountry || item.country || "Multiple";
        const sourceType = item.mediaType || item.sourceType || "rss-live";

        return {
            id: item.id || `live-${Math.random().toString(36).slice(2, 10)}`,
            title: item.title || "Untitled result",
            source: item.source || "Unknown Source",
            sourceType,
            publishedAt: item.publishedAt || new Date().toISOString(),
            summary: stripHtml(item.summary || "No summary available."),
            url: item.url || "#",
            sentimentLabel: normalizeSentimentLabel(item.sentiment ?? item.sentimentLabel ?? sentimentScore),
            sentimentScore,
            signalScore,
            relevanceScore: Number(item.queryRelevance || item.relevanceScore || 0),
            freshnessScore: Number(item.recencyScore || item.freshnessScore || 0),
            finalScore,
            region: sourceRegion,
            country: sourceCountry,
            topic: item.topic || state.query,
            rawCountries: splitCountryString(sourceCountry),
            rawMediaTypes: sourceType ? [sourceType] : [],
            rawFocus: item.publicationFocus ? [item.publicationFocus] : [],
            sourceTier: item.sourceTier || "standard",
            influenceWeight: Number(item.influenceWeight || 1),
            domain: item.domain || ""
        };
    }

    function applyClientFiltersAndRender(responseMeta = null) {
        let filtered = [...state.results];

        if (state.sentimentFilter !== "all") {
            filtered = filtered.filter((item) => item.sentimentLabel === state.sentimentFilter);
        }

        filtered = sortResults(filtered, state.sortBy);
        renderResults(filtered, responseMeta);
    }

    function renderResults(results, responseMeta = null) {
        if (!dom.resultsList) return;

        dom.resultsList.innerHTML = "";

        if (!results.length) {
            if (dom.resultsEmptyState) {
                dom.resultsEmptyState.classList.remove("hidden");
            }
            renderToolbarFromResults([]);
            renderResultsMiniSummary([], responseMeta);
            return;
        }

        if (dom.resultsEmptyState) {
            dom.resultsEmptyState.classList.add("hidden");
        }

        const fragment = document.createDocumentFragment();

        results.forEach((item) => {
            const article = document.createElement("article");
            article.className = "result-card result-card-live";
            article.tabIndex = 0;

            const sentimentClass = getSentimentClass(item.sentimentLabel);
            const sentimentText = displaySentiment(item.sentimentLabel);

            article.innerHTML = `
                <div class="result-card-top">
                    <div class="result-top-left">
                        <span class="result-source">${escapeHtml(item.source)}</span>
                        <span class="result-date">${escapeHtml(formatDate(item.publishedAt))}</span>
                    </div>
                    <span class="sentiment-tag ${sentimentClass}">${escapeHtml(sentimentText)}</span>
                </div>

                <h4 class="result-title">${escapeHtml(item.title)}</h4>

                <p class="result-meta">
                    ${escapeHtml(item.region || "Global")} ·
                    ${escapeHtml(formatSourceType(item.sourceType))} ·
                    ${escapeHtml(item.country || "Multiple")}
                </p>

                <p class="result-description">
                    ${escapeHtml(item.summary)}
                </p>

                <div class="result-score-row">
                    <div class="score-badge score-badge-signal">
                        <span class="score-label">Signal Score</span>
                        <strong class="signal-score-value">${formatScore(item.signalScore)}/100</strong>
                    </div>
                    <div class="score-badge score-badge-sentiment">
                        <span class="score-label">Sentiment Score</span>
                        <strong class="sentiment-score-value">${formatSigned(item.sentimentScore)}</strong>
                    </div>
                    <div class="score-badge score-badge-signal">
                        <span class="score-label">Intelligence Score</span>
                        <strong class="signal-score-value">${formatScore(item.finalScore)}/100</strong>
                    </div>
                </div>

                <div class="result-footer">
                    <span class="result-chip">${escapeHtml(shortTopic(item.topic || state.query || "Geo topic"))}</span>
                    <span class="result-chip">${escapeHtml(item.region || "Global")}</span>
                    <span class="result-chip">${escapeHtml(humanize(item.sourceTier || "standard"))}</span>
                    <a
                        class="result-chip result-chip-link"
                        href="${escapeAttribute(item.url || "#")}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Open source ↗
                    </a>
                </div>
            `;

            if (item.url && item.url !== "#") {
                article.style.cursor = "pointer";

                article.addEventListener("click", (event) => {
                    const anchor = event.target.closest("a");
                    if (anchor) return;
                    window.open(item.url, "_blank", "noopener,noreferrer");
                });

                article.addEventListener("keydown", (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        window.open(item.url, "_blank", "noopener,noreferrer");
                    }
                });
            }

            fragment.appendChild(article);
        });

        dom.resultsList.appendChild(fragment);
        renderToolbarFromResults(results);
        renderResultsMiniSummary(results, responseMeta);
    }

    function renderToolbarFromResults(results) {
        if (dom.activeQueryLabel) {
            dom.activeQueryLabel.textContent = state.query || "None";
        }

        if (dom.activeSortLabel) {
            dom.activeSortLabel.textContent = displaySortLabel(state.sortBy);
        }

        if (dom.dominantSentimentLabel) {
            dom.dominantSentimentLabel.textContent = getDominantSentiment(results);
        }

        if (dom.metricSignalStrength) {
            dom.metricSignalStrength.textContent = getAverageSignalText(results);
        }

        if (dom.metricDominantTone) {
            dom.metricDominantTone.textContent = getDominantTone(results);
        }

        if (dom.metricSourceSpread) {
            dom.metricSourceSpread.textContent = String(results.length);
        }
    }

    function renderResultsMiniSummary(results = state.results, responseMeta = null) {
        if (!results.length) {
            updateMiniSummary(
                `0 sources · no matching results · ${
                    state.countries.length ? state.countries.map(humanize).join(", ") : "all countries"
                } · ${state.regions.map(humanize).join(", ")}`
            );
            return;
        }

        const dominant = getDominantSentiment(results).toLowerCase();
        const countryText = state.countries.length
            ? state.countries.map(humanize).join(", ")
            : "all countries";

        const regionText = state.regions.length
            ? state.regions.map(humanize).join(", ")
            : "world";

        const modeText = responseMeta?.mode ? ` · ${responseMeta.mode}` : "";
        const countText = responseMeta?.counts?.returned !== undefined
            ? ` · ${responseMeta.counts.returned} returned`
            : "";

        updateMiniSummary(
            `${results.length} sources · ${dominant} sentiment · ${countryText} · ${regionText}${modeText}${countText}`
        );
    }

    function renderScopeChips() {
        if (!dom.scopeChips) return;

        const chips = [];

        if (state.query) chips.push(makeChip(`Topic:${state.query}`));
        state.regions.forEach((region) => chips.push(makeChip(`Region:${humanize(region)}`)));
        state.mediaTypes.forEach((media) => chips.push(makeChip(`Media:${humanize(media)}`)));
        state.publicationFocus.forEach((focus) => chips.push(makeChip(`Focus:${humanize(focus)}`)));
        if (state.selectedTrend) chips.push(makeChip(`Trend:${state.selectedTrend}`));
        state.countries.forEach((country) => chips.push(makeChip(`Country:${humanize(country)}`)));

        dom.scopeChips.innerHTML = chips.join("");
    }

    function renderCountryList(searchTerm = "") {
        if (!dom.countryList) return;

        const scopedCountries = getScopedCountries();
        const filtered = scopedCountries.filter((country) =>
            humanize(country).toLowerCase().includes(searchTerm)
        );

        dom.countryList.innerHTML = "";

        if (!filtered.length) {
            dom.countryList.innerHTML = `<p class="country-empty">No countries match this scope.</p>`;
            return;
        }

        const fragment = document.createDocumentFragment();

        filtered.forEach((country) => {
            const label = document.createElement("label");
            label.className = "filter-option";

            const input = document.createElement("input");
            input.type = "checkbox";
            input.value = country;
            input.checked = state.countries.includes(country);

            input.addEventListener("change", () => {
                if (input.checked) {
                    if (!state.countries.includes(country)) {
                        state.countries.push(country);
                    }
                } else {
                    state.countries = state.countries.filter((item) => item !== country);
                }

                renderSelectedCountries();
                renderScopeChips();
                renderResultsMiniSummary();
                renderCountryList(dom.countrySearchInput?.value.trim().toLowerCase() || "");
            });

            const span = document.createElement("span");
            span.textContent = humanize(country);

            label.appendChild(input);
            label.appendChild(span);
            fragment.appendChild(label);
        });

        dom.countryList.appendChild(fragment);
        updateCountryButtonLabel();
    }

    function renderSelectedCountries() {
        if (!dom.selectedCountries) return;

        if (!state.countries.length) {
            dom.selectedCountries.innerHTML = `<p class="selected-countries-empty">No country selected</p>`;
            updateCountryButtonLabel();
            return;
        }

        dom.selectedCountries.innerHTML = state.countries.map((country) => `
            <button type="button" class="selected-country-chip" data-country="${country}">
                ${escapeHtml(humanize(country))} ×
            </button>
        `).join("");

        dom.selectedCountries.querySelectorAll(".selected-country-chip").forEach((button) => {
            button.addEventListener("click", () => {
                const country = button.dataset.country;
                state.countries = state.countries.filter((item) => item !== country);
                renderSelectedCountries();
                renderCountryList(dom.countrySearchInput?.value.trim().toLowerCase() || "");
                renderScopeChips();
                renderResultsMiniSummary();
            });
        });

        updateCountryButtonLabel();
    }

    function updateCountryButtonLabel() {
        if (!dom.countryDropdownBtn) return;

        if (!state.countries.length) {
            dom.countryDropdownBtn.textContent = "All countries (current scope)";
            return;
        }

        if (state.countries.length === 1) {
            dom.countryDropdownBtn.textContent = humanize(state.countries[0]);
            return;
        }

        dom.countryDropdownBtn.textContent = `${state.countries.length} countries selected`;
    }

    function getScopedCountries() {
        if (state.regions.includes("world")) {
            return ALL_COUNTRIES;
        }

        const countries = new Set();
        state.regions.forEach((region) => {
            (COUNTRY_SCOPE[region] || []).forEach((country) => countries.add(country));
        });

        return Array.from(countries).sort((a, b) => humanize(a).localeCompare(humanize(b)));
    }

    function pruneSelectedCountriesToScope() {
        const scoped = new Set(getScopedCountries());
        state.countries = state.countries.filter((country) => scoped.has(country));
    }

    function resetAllFilters() {
        if (dom.scenarioInput) {
            dom.scenarioInput.value = "";
        }

        state.query = "";
        state.selectedTrend = "";
        state.countries = [];
        state.results = [];

        dom.regionCheckboxes.forEach((checkbox) => {
            checkbox.checked = checkbox.value === "world";
        });

        dom.mediaCheckboxes.forEach((checkbox) => {
            checkbox.checked = checkbox.value === "newspapers" || checkbox.value === "news-channels";
        });

        dom.publicationCheckboxes.forEach((checkbox) => {
            const value = String(checkbox.value || "").toLowerCase();
            checkbox.checked = value === "international" || value === "international-publications";
        });

        dom.sentimentRadios.forEach((radio) => {
            radio.checked = radio.value === "all";
        });

        if (dom.sortResultsSelect) {
            dom.sortResultsSelect.value = "final-desc";
        }

        if (dom.countrySearchInput) {
            dom.countrySearchInput.value = "";
        }

        if (dom.countryDropdown) {
            dom.countryDropdown.classList.add("hidden");
        }

        dom.trendSignalItems.forEach((node) => node.classList.remove("is-active"));

        syncStateFromUI();
        renderCountryList();
        renderSelectedCountries();
        renderScopeChips();
        renderResults([]);
        updateMiniSummary("Awaiting scenario · no live intelligence requested");
    }

    function renderResultVisibility(results) {
        renderToolbarFromResults(results);
        renderResultsMiniSummary(results);
    }

    function setGenerateButtonState(isLoading) {
        if (!dom.generateBtn) return;

        dom.generateBtn.disabled = isLoading;
        dom.generateBtn.textContent = isLoading ? "Generating..." : "Generate Intelligence";
    }

    function updateMiniSummary(text) {
        if (dom.resultsMiniSummary) {
            dom.resultsMiniSummary.textContent = text;
        }
    }

    function getCheckedValues(nodes) {
        return nodes.filter((node) => node.checked).map((node) => node.value);
    }

    function sortResults(results, sortBy) {
        const sorted = [...results];

        switch (sortBy) {
            case "signal-desc":
                return sorted.sort((a, b) => (b.signalScore || 0) - (a.signalScore || 0));
            case "signal-asc":
                return sorted.sort((a, b) => (a.signalScore || 0) - (b.signalScore || 0));
            case "sentiment-desc":
                return sorted.sort((a, b) => (b.sentimentScore || 0) - (a.sentimentScore || 0));
            case "sentiment-asc":
                return sorted.sort((a, b) => (a.sentimentScore || 0) - (b.sentimentScore || 0));
            case "published-desc":
                return sorted.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
            case "published-asc":
                return sorted.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));
            case "source-asc":
                return sorted.sort((a, b) => (a.source || "").localeCompare(b.source || ""));
            case "title-asc":
                return sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
            case "final-desc":
            default:
                return sorted.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));
        }
    }

    function getDominantSentiment(results) {
        if (!results.length) return "Mixed";

        const counts = {
            positive: 0,
            neutral: 0,
            negative: 0
        };

        results.forEach((item) => {
            const label = collapseSentiment(item.sentimentLabel);
            counts[label] = (counts[label] || 0) + 1;
        });

        const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        return humanize(dominant);
    }

    function getAverageSignalText(results) {
        if (!results.length) return "None";

        const avg = results.reduce((sum, item) => sum + (Number(item.signalScore) || 0), 0) / results.length;
        if (avg >= 75) return "High";
        if (avg >= 55) return "Moderate";
        if (avg >= 35) return "Watch";
        return "Low";
    }

    function getDominantTone(results) {
        if (!results.length) return "None";

        const avgSentiment = results.reduce((sum, item) => sum + (Number(item.sentimentScore) || 0), 0) / results.length;

        if (avgSentiment >= 0.25) return "Constructive";
        if (avgSentiment >= 0.08) return "Positive";
        if (avgSentiment <= -0.25) return "Risk-heavy";
        if (avgSentiment <= -0.08) return "Cautious";
        return "Neutral";
    }

    function displaySortLabel(value) {
        const labels = {
            "final-desc": "Intelligence Score: Best Match First",
            "signal-desc": "Signal Score: High to Low",
            "signal-asc": "Signal Score: Low to High",
            "sentiment-desc": "Sentiment Score: High to Low",
            "sentiment-asc": "Sentiment Score: Low to High",
            "published-desc": "Latest First",
            "published-asc": "Oldest First",
            "source-asc": "Source A–Z",
            "title-asc": "Title A–Z"
        };

        return labels[value] || "Intelligence Score: Best Match First";
    }

    function mapSignalTextToScore(signalText, sentimentScore) {
        const signal = (signalText || "").toLowerCase();
        if (signal === "high") return Math.max(72, Math.round(Math.abs(sentimentScore) * 100));
        if (signal === "medium") return Math.max(52, Math.round(Math.abs(sentimentScore) * 100));
        return Math.max(35, Math.round(Math.abs(sentimentScore) * 100));
    }

    function normalizeSentimentLabel(value) {
        if (typeof value === "string") {
            const normalized = value.toLowerCase();
            if (normalized.includes("slightly-negative")) return "negative";
            if (normalized.includes("slightly-positive")) return "positive";
            if (normalized.includes("negative")) return "negative";
            if (normalized.includes("positive")) return "positive";
            return "neutral";
        }

        const score = Number(value || 0);
        if (score >= 0.08) return "positive";
        if (score <= -0.08) return "negative";
        return "neutral";
    }

    function collapseSentiment(label) {
        const normalized = (label || "").toLowerCase();
        if (normalized.includes("positive")) return "positive";
        if (normalized.includes("negative")) return "negative";
        return "neutral";
    }

    function displaySentiment(label) {
        const normalized = collapseSentiment(label);
        if (normalized === "positive") return "Positive";
        if (normalized === "negative") return "Negative";
        return "Neutral";
    }

    function getSentimentClass(label) {
        const normalized = collapseSentiment(label);
        if (normalized === "positive") return "sentiment-positive";
        if (normalized === "negative") return "sentiment-negative";
        return "sentiment-neutral";
    }

    function splitCountryString(value) {
        if (!value) return [];
        return String(value)
            .split(",")
            .map((item) => item.trim().toLowerCase().replace(/\s+/g, "-"))
            .filter(Boolean);
    }

    function formatSourceType(value) {
        if (!value) return "Source";
        return humanize(String(value).replace(/rss/g, "rss "));
    }

    function formatDate(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Unknown date";

        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function formatScore(value) {
        const score = Number(value || 0);
        return Math.round(score);
    }

    function formatSigned(value) {
        const score = Number(value || 0);
        if (score > 0) return `+${score.toFixed(2)}`;
        return score.toFixed(2);
    }

    function shortTopic(value) {
        const text = String(value || "").trim();
        if (!text) return "Geo topic";
        return text.length > 28 ? `${text.slice(0, 28)}...` : text;
    }

    function humanize(value) {
        return String(value || "")
            .replace(/-/g, " ")
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    function makeChip(text) {
        return `<span class="scope-chip">${escapeHtml(text)}</span>`;
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function escapeAttribute(value) {
        return escapeHtml(value);
    }
});