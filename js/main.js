document.addEventListener("DOMContentLoaded", () => {
    const API_BASE_URL = "http://localhost:3000/api";
    
    const state = {
        query: "",
        regions: ["world"],
        countries: [],
        mediaTypes: ["newspapers", "news-channels"],
        publicationFocus: ["international"],
        sentimentFilter: "all",
        sortBy: "signal-desc",
        selectedTrend: "",
        results: [],
        isLoading: false,
        lastSummary: {
            totalSources: 0,
            averageSentiment: 0,
            averageSignal: 0
        }
    };
    
    const expandButtons = document.querySelectorAll(".expand-btn");
    const clearFiltersBtn = document.getElementById("clear-filters-btn");
    
    const countryDropdownBtn = document.getElementById("country-dropdown-btn");
    const countryDropdown = document.getElementById("country-dropdown");
    const countrySearchInput = document.getElementById("country-search-input");
    const countryList = document.getElementById("country-list");
    const selectedCountriesContainer = document.getElementById("selected-countries");
    const scopeChipsContainer = document.getElementById("scope-chips");
    
    const scenarioInput = document.getElementById("scenario-command");
    const statusPill = document.querySelector(".status-pill");
    const primaryActionBtn = document.querySelector(".primary-action-btn");
    const exampleChips = Array.from(document.querySelectorAll(".example-chip"));
    
    const sortResultsSelect = document.getElementById("sort-results-select");
    const sentimentFilterInputs = Array.from(document.querySelectorAll('input[name="sentiment-filter"]'));
    
    const resultsList = document.querySelector(".results-list");
    const resultsMiniSummary = document.getElementById("results-mini-summary");
    const resultsEmptyState = document.getElementById("results-empty-state");
    
    const activeQueryLabel = document.getElementById("active-query-label");
    const activeSortLabel = document.getElementById("active-sort-label");
    const dominantSentimentLabel = document.getElementById("dominant-sentiment-label");
    
    const signalStrengthEl = document.getElementById("metric-signal-strength");
    const dominantToneEl = document.getElementById("metric-dominant-tone");
    const sourceSpreadEl = document.getElementById("metric-source-spread");
    
    const trendSignalList = document.getElementById("trend-signal-list");
    const trendSignalItems = Array.from(document.querySelectorAll(".trend-signal-item"));
    
    const countriesByRegion = {
        europe: ["uk", "germany", "france", "italy", "spain", "poland"],
        asia: ["china", "taiwan", "japan", "india", "south korea", "singapore"],
        "north-america": ["us", "canada", "mexico"],
        africa: ["egypt", "kenya", "south africa", "nigeria", "morocco"],
        "middle-east": ["qatar", "saudi arabia", "uae", "israel", "iran", "turkey"],
        "south-america": ["brazil", "argentina", "chile", "colombia", "peru"],
        oceania: ["australia", "new zealand"]
    };
    
    const regionAliasMap = {
        world: "world",
        global: "world",
        europe: "europe",
        asia: "asia",
        "asia-pacific": "asia",
        asiapacific: "asia",
        apac: "asia",
        "north-america": "north-america",
        northamerica: "north-america",
        africa: "africa",
        "middle-east": "middle-east",
        middleeast: "middle-east",
        mideast: "middle-east",
        "south-america": "south-america",
        southamerica: "south-america",
        oceania: "oceania"
    };
    
    function normalizeText(value) {
        return String(value || "").trim().toLowerCase();
    }
    
    function titleCase(value) {
        return String(value || "")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
    
    function parseDatasetList(value) {
        if (!value) return [];
        return value
        .split(",")
        .map((item) => normalizeText(item))
        .filter(Boolean);
    }
    
    function escapeHtml(value) {
        return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }
    
    function normalizeToken(token) {
        let value = normalizeText(token);
        
        if (value.length > 4 && value.endsWith("ies")) {
            value = `${value.slice(0, -3)}y`;
        } else if (value.length > 5 && value.endsWith("ors")) {
            value = value.slice(0, -1);
        } else if (value.length > 4 && value.endsWith("s") && !value.endsWith("ss")) {
            value = value.slice(0, -1);
        }
        
        return value;
    }
    
    function tokenizeQuery(query) {
        return normalizeText(query)
        .split(/\s+/)
        .map(normalizeToken)
        .filter((token) => token.length > 1);
    }
    
    function mapBackendRegionToUiRegion(region) {
        const normalized = normalizeText(region).replace(/\s+/g, "-");
        return regionAliasMap[normalized] || normalized;
    }
    
    function mapBackendItemToUiMediaTypes(item) {
        const source = normalizeText(item.source);
        const mediaType = normalizeText(item.mediaType);
        
        if (
            source.includes("cnn") ||
            source.includes("bbc") ||
            source.includes("al jazeera") ||
            source.includes("channel") ||
            source.includes("news")
        ) {
            return ["news-channels"];
        }
        
        if (mediaType === "regional" || mediaType === "international" || mediaType === "business") {
            return ["newspapers"];
        }
        
        return ["newspapers"];
    }
    
    function mapBackendItemToUiFocus(item) {
        const mediaType = normalizeText(item.mediaType);
        
        if (mediaType === "regional") {
            return ["regional"];
        }
        
        if (mediaType === "business") {
            return ["international"];
        }
        
        return ["international"];
    }
    
    function getResultCards() {
        return Array.from(document.querySelectorAll(".result-card"));
    }
    
    function getFilterGroupByTitle(sectionTitle) {
        return Array.from(document.querySelectorAll(".filter-group")).find((group) => {
            const heading = group.querySelector(".filter-group-head h4");
            return heading && heading.textContent.trim() === sectionTitle;
        });
    }
    
    function getCheckedValuesFromSection(sectionTitle) {
        const group = getFilterGroupByTitle(sectionTitle);
        if (!group) return [];
        
        return Array.from(group.querySelectorAll('input[type="checkbox"]:checked'))
        .map((input) => input.value)
        .filter(Boolean);
    }
    
    function getGeoCheckboxes() {
        const geoGroup = getFilterGroupByTitle("Geographic Scope");
        if (!geoGroup) return [];
        return Array.from(geoGroup.querySelectorAll('input[type="checkbox"]'));
    }
    
    function getWorldCheckbox() {
        return getGeoCheckboxes().find((checkbox) => checkbox.value === "world");
    }
    
    function getSpecificRegionCheckboxes() {
        return getGeoCheckboxes().filter((checkbox) => checkbox.value !== "world");
    }
    
    function getSelectedCountries() {
        if (!selectedCountriesContainer) return [];
        
        return Array.from(selectedCountriesContainer.querySelectorAll(".country-chip"))
        .map((chip) => normalizeText(chip.dataset.country || chip.textContent.replace("×", "")))
        .filter(Boolean);
    }
    
    function syncStateFromUI() {
        state.query = scenarioInput ? scenarioInput.value.trim() : "";
        state.regions = getCheckedValuesFromSection("Geographic Scope");
        state.countries = getSelectedCountries();
        state.mediaTypes = getCheckedValuesFromSection("Media Type");
        state.publicationFocus = getCheckedValuesFromSection("Publication Focus");
        
        const sentimentChoice = document.querySelector('input[name="sentiment-filter"]:checked');
        state.sentimentFilter = sentimentChoice ? sentimentChoice.value : "all";
        
        state.sortBy = sortResultsSelect ? sortResultsSelect.value : "signal-desc";
    }
    
    function isDefaultScenarioState() {
        const defaultRegions = state.regions.length === 1 && state.regions.includes("world");
        const defaultCountries = state.countries.length === 0;
        
        const defaultMediaTypes =
        state.mediaTypes.length === 2 &&
        state.mediaTypes.includes("newspapers") &&
        state.mediaTypes.includes("news-channels");
        
        const defaultPublicationFocus =
        state.publicationFocus.length === 1 &&
        state.publicationFocus.includes("international");
        
        const emptyQuery = state.query === "";
        
        return (
            emptyQuery &&
            defaultRegions &&
            defaultCountries &&
            defaultMediaTypes &&
            defaultPublicationFocus &&
            state.sentimentFilter === "all" &&
            state.sortBy === "signal-desc"
        );
    }
    
    function updateScenarioShellState() {
        if (!statusPill || !primaryActionBtn) return;
        
        if (state.isLoading) {
            statusPill.textContent = "Loading Intelligence";
            primaryActionBtn.textContent = "Refreshing...";
            return;
        }
        
        const hasQuery = state.query.length > 0;
        const hasCountryScope = state.countries.length > 0;
        const hasCustomRegionScope =
        state.regions.length > 0 && !state.regions.includes("world");
        const hasSentimentFilter = state.sentimentFilter !== "all";
        const isDefaultState = isDefaultScenarioState();
        
        if (isDefaultState) {
            statusPill.textContent = "Live Intelligence Shell";
            primaryActionBtn.textContent = "Generate Intelligence";
            return;
        }
        
        if (hasQuery) {
            statusPill.textContent = "Scenario Ready";
            primaryActionBtn.textContent = "Refresh Intelligence";
            return;
        }
        
        if (hasCountryScope || hasCustomRegionScope || hasSentimentFilter) {
            statusPill.textContent = "Scope Ready";
            primaryActionBtn.textContent = "Refresh Intelligence";
            return;
        }
        
        statusPill.textContent = "Live Intelligence Shell";
        primaryActionBtn.textContent = "Generate Intelligence";
    }
    
    function getCardSearchText(card) {
        const source = card.dataset.source || "";
        const title = card.dataset.title || card.querySelector(".result-title")?.textContent || "";
        const description = card.dataset.description || card.querySelector(".result-description")?.textContent || "";
        const meta = card.querySelector(".result-meta")?.textContent || "";
        const chips = Array.from(card.querySelectorAll(".result-chip"))
        .map((chip) => chip.textContent)
        .join(" ");
        
        const datasetText = [
            card.dataset.region || "",
            card.dataset.countries || "",
            card.dataset.mediaType || "",
            card.dataset.focus || "",
            card.dataset.signal || ""
        ].join(" ");
        
        return normalizeText(`${source} ${title} ${description} ${meta} ${chips} ${datasetText}`);
    }
    
    function getNormalizedSearchableTokens(card) {
        return getCardSearchText(card)
        .split(/[\s,.;:/()+-]+/)
        .map(normalizeToken)
        .filter(Boolean);
    }
    
    function tokenMatchesSearchableText(token, searchableText, searchableTokens) {
        if (!token) return false;
        
        if (searchableTokens.includes(token)) {
            return true;
        }
        
        return searchableTokens.some((searchableToken) => {
            if (searchableToken.length < 3 || token.length < 3) {
                return searchableToken === token;
            }
            
            return searchableToken.includes(token) || token.includes(searchableToken);
        }) || searchableText.includes(token);
    }
    
    function calculateQueryRelevance(card, query) {
        const tokens = tokenizeQuery(query);
        
        if (!tokens.length) {
            const backendSignal = parseFloat(card.dataset.signalScore || card.dataset.signal || "0");
            
            return {
                isMatch: true,
                rawScore: backendSignal,
                normalizedScore: backendSignal,
                matchedTokens: [],
                totalTokens: 0
            };
        }
        
        const searchableText = getCardSearchText(card);
        const searchableTokens = getNormalizedSearchableTokens(card);
        
        let rawScore = 0;
        const matchedTokens = [];
        
        tokens.forEach((token) => {
            const tokenMatched = tokenMatchesSearchableText(token, searchableText, searchableTokens);
            if (!tokenMatched) return;
            
            matchedTokens.push(token);
            
            if (searchableTokens.includes(token)) {
                rawScore += 4;
                return;
            }
            
            const strongPartial = searchableTokens.some(
                (searchableToken) =>
                    searchableToken.length >= 4 &&
                token.length >= 4 &&
                (searchableToken.includes(token) || token.includes(searchableToken))
            );
            
            if (strongPartial) {
                rawScore += 2.5;
                return;
            }
            
            rawScore += 1;
        });
        
        let bonus = 0;
        
        const titleText = normalizeText(card.dataset.title || card.querySelector(".result-title")?.textContent || "");
        const sourceText = normalizeText(card.dataset.source || card.querySelector(".result-source")?.textContent || "");
        const metaText = normalizeText(card.querySelector(".result-meta")?.textContent || "");
        
        tokens.forEach((token) => {
            if (titleText.includes(token)) {
                bonus += 2.5;
            } else if (metaText.includes(token)) {
                bonus += 1;
            } else if (sourceText.includes(token)) {
                bonus += 0.5;
            }
        });
        
        const totalRawScore = rawScore + bonus;
        const matchedCount = [...new Set(matchedTokens)].length;
        const minimumMatches = tokens.length === 1 ? 1 : Math.max(2, Math.ceil(tokens.length / 2));
        
        const maxPerToken = 6.5;
        const theoreticalMax = Math.max(tokens.length * maxPerToken, 1);
        const computedScore = Math.min(100, Math.round((totalRawScore / theoreticalMax) * 100));
        
        const backendSignal = parseFloat(card.dataset.signalScore || card.dataset.signal || "0");
        const normalizedScore = Math.max(computedScore, backendSignal);
        
        return {
            isMatch: matchedCount >= minimumMatches && totalRawScore >= 3.5,
            rawScore: totalRawScore,
            normalizedScore,
            matchedTokens: [...new Set(matchedTokens)],
            totalTokens: tokens.length
        };
    }
    
    function cardMatchesRegions(cardRegion) {
        if (!state.regions.length || state.regions.includes("world")) {
            return true;
        }
        
        return state.regions.includes(cardRegion);
    }
    
    function cardMatchesCountries(cardCountries) {
        if (!state.countries.length) {
            return true;
        }
        
        return state.countries.some((country) => cardCountries.includes(country));
    }
    
    function cardMatchesMediaTypes(cardMediaTypes) {
        if (!state.mediaTypes.length) {
            return true;
        }
        
        return state.mediaTypes.some((mediaType) => cardMediaTypes.includes(mediaType));
    }
    
    function cardMatchesFocus(cardFocusValues) {
        if (!state.publicationFocus.length) {
            return true;
        }
        
        return state.publicationFocus.some((focus) => cardFocusValues.includes(focus));
    }
    
    function getSentimentMetaFromScore(sentimentScore) {
        if (sentimentScore > 0.2) {
            return {
                label: "Positive",
                key: "positive",
                className: "sentiment-positive"
            };
        }
        
        if (sentimentScore < -0.2) {
            return {
                label: "Negative",
                key: "negative",
                className: "sentiment-negative"
            };
        }
        
        return {
            label: "Neutral",
            key: "neutral",
            className: "sentiment-neutral"
        };
    }
    
    function cardMatchesSentimentFilter(sentimentKey) {
        if (state.sentimentFilter === "all") return true;
        return sentimentKey === state.sentimentFilter;
    }
    
    function highlightMatches(text, query) {
        const safeText = escapeHtml(text);
        const tokens = [...new Set(tokenizeQuery(query))];
        
        if (!tokens.length) return safeText;
        
        let highlighted = safeText;
        
        tokens
        .filter((token) => token.length > 1)
        .sort((a, b) => b.length - a.length)
        .forEach((token) => {
            const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(`(${escapedToken})`, "gi");
            highlighted = highlighted.replace(regex, "<mark>$1</mark>");
        });
        
        return highlighted;
    }
    
    function updateCardTextHighlights(card, query) {
        const titleEl = card.querySelector(".result-title");
        const descriptionEl = card.querySelector(".result-description");
        
        const baseTitle = card.dataset.title || titleEl?.textContent || "";
        const baseDescription = card.dataset.description || descriptionEl?.textContent || "";
        
        if (titleEl) {
            titleEl.innerHTML = highlightMatches(baseTitle, query);
        }
        
        if (descriptionEl) {
            descriptionEl.innerHTML = highlightMatches(baseDescription, query);
        }
    }
    
    function updateCardDisplays(card, signalScore, sentimentScore, query) {
        const signalValueEl = card.querySelector(".signal-score-value");
        const sentimentValueEl = card.querySelector(".sentiment-score-value");
        const sentimentTagEl = card.querySelector(".sentiment-tag");
        
        if (signalValueEl) {
            signalValueEl.textContent = `${Math.round(signalScore)}/100`;
        }
        
        if (sentimentValueEl) {
            const formatted = sentimentScore > 0 ? `+${sentimentScore.toFixed(2)}` : sentimentScore.toFixed(2);
            sentimentValueEl.textContent = formatted;
        }
        
        if (sentimentTagEl) {
            const sentimentMeta = getSentimentMetaFromScore(sentimentScore);
            sentimentTagEl.textContent = sentimentMeta.label;
            sentimentTagEl.classList.remove("sentiment-positive", "sentiment-neutral", "sentiment-negative");
            sentimentTagEl.classList.add(sentimentMeta.className);
        }
        
        updateCardTextHighlights(card, query);
    }
    
    function sortVisibleEntries(entries) {
        const sortMode = state.sortBy;
        
        entries.sort((a, b) => {
            if (sortMode === "signal-desc") return b.signalScore - a.signalScore || a.originalIndex - b.originalIndex;
            if (sortMode === "signal-asc") return a.signalScore - b.signalScore || a.originalIndex - b.originalIndex;
            if (sortMode === "sentiment-desc") return b.sentimentScore - a.sentimentScore || a.originalIndex - b.originalIndex;
            if (sortMode === "sentiment-asc") return a.sentimentScore - b.sentimentScore || a.originalIndex - b.originalIndex;
            if (sortMode === "published-desc") return b.publishedTs - a.publishedTs || a.originalIndex - b.originalIndex;
            if (sortMode === "published-asc") return a.publishedTs - b.publishedTs || a.originalIndex - b.originalIndex;
            if (sortMode === "source-asc") return a.source.localeCompare(b.source) || a.originalIndex - b.originalIndex;
            if (sortMode === "title-asc") return a.title.localeCompare(b.title) || a.originalIndex - b.originalIndex;
            return b.signalScore - a.signalScore || a.originalIndex - b.originalIndex;
        });
        
        return entries;
    }
    
    function reorderVisibleCards(entries) {
        if (!resultsList) return;
        entries.forEach((entry) => resultsList.appendChild(entry.card));
    }
    
    function updateTopMatchState(entries) {
        getResultCards().forEach((card) => card.classList.remove("is-top-match"));
        
        if (!entries.length) return;
        if (!state.query.trim()) return;
        
        entries[0].card.classList.add("is-top-match");
    }
    
    function updateResultsSummary(visibleCount) {
        if (!resultsMiniSummary) return;
        
        if (state.isLoading) {
            resultsMiniSummary.textContent = "Loading intelligence results...";
            return;
        }
        
        const sourceLabel = visibleCount === 1 ? "1 source" : `${visibleCount} sources`;
        
        let regionLabel = "world";
        if (state.regions.length > 0 && !state.regions.includes("world")) {
            regionLabel = state.regions
            .map((region) => titleCase(region.replace(/-/g, " ")))
            .join(", ");
        }
        
        let countryLabel = "all countries";
        if (state.countries.length === 1) {
            countryLabel = "1 country";
        } else if (state.countries.length > 1) {
            countryLabel = `${state.countries.length} countries`;
        }
        
        const sentimentLabel =
        state.sentimentFilter === "all"
        ? "mixed sentiment"
        : `${state.sentimentFilter} only`;
        
        const parts = [sourceLabel, sentimentLabel, countryLabel, regionLabel];
        
        if (normalizeText(state.query)) {
            parts.push("query active");
        }
        
        resultsMiniSummary.textContent = parts.join(" · ");
    }
    
    function updateResultsToolbar(sortedEntries) {
        if (activeQueryLabel) {
            activeQueryLabel.textContent = state.query || "None";
        }
        
        if (activeSortLabel && sortResultsSelect) {
            const selectedText = sortResultsSelect.options[sortResultsSelect.selectedIndex]?.text || "Signal Score: High to Low";
            activeSortLabel.textContent = selectedText;
        }
        
        if (dominantSentimentLabel) {
            if (!sortedEntries.length) {
                dominantSentimentLabel.textContent = "No match";
            } else {
                let positive = 0;
                let neutral = 0;
                let negative = 0;
                
                sortedEntries.forEach((entry) => {
                    if (entry.sentimentScore > 0.2) positive += 1;
                    else if (entry.sentimentScore < -0.2) negative += 1;
                    else neutral += 1;
                });
                
                if (negative > positive && negative > neutral) dominantSentimentLabel.textContent = "Negative";
                else if (positive > negative && positive > neutral) dominantSentimentLabel.textContent = "Positive";
                else dominantSentimentLabel.textContent = "Mixed";
            }
        }
    }
    
    function updateSignalMetrics(sortedEntries) {
        if (!signalStrengthEl || !dominantToneEl || !sourceSpreadEl) return;
        
        if (!sortedEntries.length) {
            signalStrengthEl.textContent = "Low";
            dominantToneEl.textContent = "No match";
            sourceSpreadEl.textContent = "0";
            return;
        }
        
        const avgSignal =
        sortedEntries.reduce((sum, entry) => sum + entry.signalScore, 0) / sortedEntries.length;
        
        if (avgSignal >= 75) signalStrengthEl.textContent = "High";
        else if (avgSignal >= 45) signalStrengthEl.textContent = "Medium";
        else signalStrengthEl.textContent = "Low";
        
        let positive = 0;
        let neutral = 0;
        let negative = 0;
        
        sortedEntries.forEach((entry) => {
            if (entry.sentimentScore > 0.2) positive += 1;
            else if (entry.sentimentScore < -0.2) negative += 1;
            else neutral += 1;
        });
        
        if (negative > positive && negative > neutral) dominantToneEl.textContent = "Risk-heavy";
        else if (positive > negative && positive > neutral) dominantToneEl.textContent = "Constructive";
        else dominantToneEl.textContent = "Cautious";
        
        sourceSpreadEl.textContent = String(sortedEntries.length);
    }
    
    function formatPublishedDate(dateValue) {
        if (!dateValue) return "Date unavailable";
        
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) {
            return escapeHtml(String(dateValue));
        }
        
        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }
    
    function buildResultCardMarkup(item) {
        const sentimentMeta = getSentimentMetaFromScore(item.sentimentScore);
        const region = mapBackendRegionToUiRegion(item.region);
        const countries = [normalizeText(item.country)].filter(Boolean);
        const uiMediaTypes = mapBackendItemToUiMediaTypes(item);
        const uiFocus = mapBackendItemToUiFocus(item);
        const keywords = Array.isArray(item.keywords) ? item.keywords : [];
        
        const articleUrl = item.url ? escapeHtml(item.url) : "#";
        const publishedLabel = formatPublishedDate(item.date);
        
        const card = document.createElement("article");
        card.className = "result-card";
        card.dataset.id = item.id || "";
        card.dataset.region = region;
        card.dataset.countries = countries.join(",");
        card.dataset.mediaType = uiMediaTypes.join(",");
        card.dataset.focus = uiFocus.join(",");
        card.dataset.source = item.source || "";
        card.dataset.title = item.title || "";
        card.dataset.description = item.description || "";
        card.dataset.sentimentScore = String(item.sentimentScore || 0);
        card.dataset.signalScore = String(item.signalScore || 0);
        card.dataset.signal = String(item.signalScore || 0);
        card.dataset.published = item.date || "";
        card.dataset.url = item.url || "";
        
        const chips = [
            `<span class="result-chip">${escapeHtml(titleCase(region.replace(/-/g, " ")))}</span>`,
            item.country ? `<span class="result-chip">${escapeHtml(titleCase(item.country))}</span>` : "",
            item.mediaType ? `<span class="result-chip">${escapeHtml(item.mediaType)}</span>` : ""
        ].filter(Boolean).join("");
        
        const keywordMarkup = keywords.length
        ? `
                <div class="result-keywords">
                    ${keywords
        .slice(0, 4)
        .map((keyword) => `<span class="result-chip">${escapeHtml(keyword)}</span>`)
        .join("")}
                </div>
            `
        : "";
        
        card.innerHTML = `
            <div class="result-card-head">
                <div class="result-source-wrap">
                    <span class="result-source">${escapeHtml(item.source || "Unknown Source")}</span>
                    <div class="result-meta">${publishedLabel}</div>
                </div>
                <div class="result-score-stack">
                    <div class="score-pill signal-score-pill">
                        <span class="score-pill-label">Signal</span>
                        <span class="signal-score-value">${Math.round(item.signalScore || 0)}/100</span>
                    </div>
                    <div class="score-pill sentiment-score-pill">
                        <span class="score-pill-label">Sentiment</span>
                        <span class="sentiment-score-value">${(item.sentimentScore || 0) > 0 ? `+${Number(item.sentimentScore).toFixed(2)}` : Number(item.sentimentScore || 0).toFixed(2)}</span>
                    </div>
                    <span class="sentiment-tag ${sentimentMeta.className}">${sentimentMeta.label}</span>
                </div>
            </div>
        
            <h3 class="result-title">${escapeHtml(item.title || "Untitled result")}</h3>
            <p class="result-description">${escapeHtml(item.description || "No summary available.")}</p>
        
            <div class="result-chip-row">
                ${chips}
            </div>
        
            ${keywordMarkup}
        
            <div class="result-card-foot">
                <a class="result-link" href="${articleUrl}" target="_blank" rel="noopener noreferrer">Open Source</a>
            </div>
        `;
        
        return card;
    }
    
    function renderResultsFromState() {
        if (!resultsList) return;
        
        resultsList.innerHTML = "";
        
        state.results.forEach((item) => {
            const card = buildResultCardMarkup(item);
            resultsList.appendChild(card);
        });
    }
    
    function filterAndRenderResults() {
        syncStateFromUI();
        
        const resultCards = getResultCards();
        const visibleEntries = [];
        
        resultCards.forEach((card, index) => {
            const cardRegion = normalizeText(card.dataset.region || "");
            const cardCountries = parseDatasetList(card.dataset.countries);
            const cardMediaTypes = parseDatasetList(card.dataset.mediaType);
            const cardFocusValues = parseDatasetList(card.dataset.focus);
            
            const sentimentScore = parseFloat(card.dataset.sentimentScore || "0");
            const sentimentMeta = getSentimentMetaFromScore(sentimentScore);
            
            const queryRelevance = calculateQueryRelevance(card, state.query);
            
            const strictMatch =
            cardMatchesRegions(cardRegion) &&
            cardMatchesCountries(cardCountries) &&
            cardMatchesMediaTypes(cardMediaTypes) &&
            cardMatchesFocus(cardFocusValues) &&
            cardMatchesSentimentFilter(sentimentMeta.key) &&
            queryRelevance.isMatch;
            
            // fallback: if query exists but no strong match, allow weaker matches
            const fallbackMatch =
            state.query &&
            cardMatchesRegions(cardRegion) &&
            cardMatchesCountries(cardCountries);
            
            const shouldShow = strictMatch || fallbackMatch;
            
            const signalScore = queryRelevance.normalizedScore || parseFloat(card.dataset.signalScore || "0");
            
            updateCardDisplays(card, signalScore, sentimentScore, state.query);
            card.style.display = shouldShow ? "" : "none";
            
            if (shouldShow) {
                visibleEntries.push({
                    card,
                    signalScore,
                    sentimentScore,
                    publishedTs: new Date(card.dataset.published || 0).getTime(),
                    source: normalizeText(card.dataset.source || ""),
                    title: normalizeText(card.dataset.title || ""),
                    originalIndex: index
                });
            }
        });
        
        const sortedEntries = sortVisibleEntries(visibleEntries);
        reorderVisibleCards(sortedEntries);
        updateTopMatchState(sortedEntries);
        
        if (resultsEmptyState) {
            resultsEmptyState.classList.toggle("hidden", sortedEntries.length > 0);
        }
        
        updateResultsSummary(sortedEntries.length);
        updateResultsToolbar(sortedEntries);
        updateSignalMetrics(sortedEntries);
        updateScenarioShellState();
    }
    
    function getAvailableCountriesForSelectedRegions() {
        const selectedRegions = getCheckedValuesFromSection("Geographic Scope");
        
        if (selectedRegions.length === 0 || selectedRegions.includes("world")) {
            return Object.values(countriesByRegion)
            .flat()
            .filter((value, index, self) => self.indexOf(value) === index)
            .sort();
        }
        
        return selectedRegions
        .flatMap((region) => countriesByRegion[region] || [])
        .filter((value, index, self) => self.indexOf(value) === index)
        .sort();
    }
    
    function bindExpandButtons() {
        expandButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const targetId = button.dataset.target;
                const target = document.getElementById(targetId);
                if (!target) return;
                
                target.classList.toggle("is-open");
                button.classList.toggle("is-open", target.classList.contains("is-open"));
                button.textContent = target.classList.contains("is-open")
                ? "Show less"
                : "Show more";
            });
        });
    }
    
    function renderCountryDropdown(searchTerm = "") {
        if (!countryList) return;
        
        const availableCountries = getAvailableCountriesForSelectedRegions();
        const selectedCountries = getSelectedCountries();
        const normalizedSearch = normalizeText(searchTerm);
        
        const filteredCountries = availableCountries.filter((country) =>
            country.includes(normalizedSearch)
    );
    
    if (filteredCountries.length === 0) {
        countryList.innerHTML = `<div class="country-empty">No countries found</div>`;
        return;
    }
    
    countryList.innerHTML = filteredCountries
    .map((country) => {
        const checked = selectedCountries.includes(country) ? "checked" : "";
        return `
                    <label class="filter-option">
                        <input type="checkbox" value="${country}" ${checked} data-country-option="true">
                        <span>${titleCase(country)}</span>
                    </label>
                `;
    })
    .join("");
    
    bindCountryOptionEvents();
}

function bindCountryOptionEvents() {
    if (!countryList) return;
    
    const countryOptions = countryList.querySelectorAll('input[data-country-option="true"]');
    
    countryOptions.forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            const country = normalizeText(checkbox.value);
            
            if (checkbox.checked) {
                addCountryChip(country);
            } else {
                removeCountryChip(country);
            }
            
            updateCountryButtonLabel();
            updateScopeChips();
            filterAndRenderResults();
        });
    });
}

function addCountryChip(country) {
    if (!selectedCountriesContainer) return;
    
    const existing = selectedCountriesContainer.querySelector(
        `.country-chip[data-country="${country}"]`
    );
    if (existing) return;
    
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "country-chip scope-chip";
    chip.dataset.country = country;
    chip.innerHTML = `${titleCase(country)} <span aria-hidden="true">×</span>`;
    
    chip.addEventListener("click", () => {
        removeCountryChip(country);
        syncCountryDropdownChecks();
        updateCountryButtonLabel();
        updateScopeChips();
        filterAndRenderResults();
    });
    
    selectedCountriesContainer.appendChild(chip);
}

function removeCountryChip(country) {
    if (!selectedCountriesContainer) return;
    
    const chip = selectedCountriesContainer.querySelector(
        `.country-chip[data-country="${country}"]`
    );
    if (chip) chip.remove();
}

function syncCountryDropdownChecks() {
    if (!countryList) return;
    
    const selectedCountries = getSelectedCountries();
    const options = countryList.querySelectorAll('input[data-country-option="true"]');
    
    options.forEach((option) => {
        option.checked = selectedCountries.includes(normalizeText(option.value));
    });
}

function updateCountryButtonLabel() {
    if (!countryDropdownBtn) return;
    
    const selectedCountries = getSelectedCountries();
    
    if (selectedCountries.length === 0) {
        countryDropdownBtn.textContent = "All countries (current scope)";
        return;
    }
    
    if (selectedCountries.length === 1) {
        countryDropdownBtn.textContent = `${titleCase(selectedCountries[0])} selected`;
        return;
    }
    
    countryDropdownBtn.textContent = `${selectedCountries.length} countries selected`;
}

function bindCountryDropdown() {
    if (!countryDropdownBtn || !countryDropdown) return;
    
    countryDropdownBtn.addEventListener("click", () => {
        countryDropdown.classList.toggle("hidden");
        countryDropdownBtn.classList.toggle(
            "is-active",
            !countryDropdown.classList.contains("hidden")
        );
        renderCountryDropdown(countrySearchInput ? countrySearchInput.value : "");
    });
    
    document.addEventListener("click", (event) => {
        const clickedInside =
        countryDropdown.contains(event.target) ||
        countryDropdownBtn.contains(event.target);
        
        if (!clickedInside) {
            countryDropdown.classList.add("hidden");
            countryDropdownBtn.classList.remove("is-active");
        }
    });
    
    if (countrySearchInput) {
        countrySearchInput.addEventListener("input", () => {
            renderCountryDropdown(countrySearchInput.value);
        });
    }
}

function updateScopeChips() {
    if (!scopeChipsContainer) return;
    
    const selectedRegions = getCheckedValuesFromSection("Geographic Scope");
    const selectedCountries = getSelectedCountries();
    const chips = [];
    
    const worldSelected = selectedRegions.includes("world") || selectedRegions.length === 0;
    const hasCountries = selectedCountries.length > 0;
    
    if (worldSelected && !hasCountries) {
        chips.push("World");
    } else if (!worldSelected) {
        selectedRegions.forEach((region) => {
            chips.push(titleCase(region.replace(/-/g, " ")));
        });
    }
    
    selectedCountries.forEach((country) => {
        chips.push(titleCase(country));
    });
    
    scopeChipsContainer.innerHTML = chips
    .map((label) => `<span class="scope-chip">${label}</span>`)
    .join("");
}

function handleWorldSelectionRule(changedCheckbox) {
    const worldCheckbox = getWorldCheckbox();
    const regionCheckboxes = getSpecificRegionCheckboxes();
    
    if (!worldCheckbox) return;
    
    if (changedCheckbox.value === "world" && changedCheckbox.checked) {
        regionCheckboxes.forEach((checkbox) => {
            checkbox.checked = false;
        });
        
        clearSelectedCountries();
        renderCountryDropdown(countrySearchInput ? countrySearchInput.value : "");
        updateCountryButtonLabel();
        updateScopeChips();
        return;
    }
    
    if (changedCheckbox.value !== "world" && changedCheckbox.checked) {
        worldCheckbox.checked = false;
    }
    
    const anySpecificRegionChecked = regionCheckboxes.some((checkbox) => checkbox.checked);
    
    if (!anySpecificRegionChecked) {
        worldCheckbox.checked = true;
    }
    
    pruneSelectedCountriesOutsideScope();
    renderCountryDropdown(countrySearchInput ? countrySearchInput.value : "");
    updateCountryButtonLabel();
    updateScopeChips();
}

function clearSelectedCountries() {
    if (!selectedCountriesContainer) return;
    selectedCountriesContainer.innerHTML = "";
}

function pruneSelectedCountriesOutsideScope() {
    if (!selectedCountriesContainer) return;
    
    const allowedCountries = getAvailableCountriesForSelectedRegions();
    const chips = Array.from(selectedCountriesContainer.querySelectorAll(".country-chip"));
    
    chips.forEach((chip) => {
        const country = normalizeText(chip.dataset.country || "");
        if (!allowedCountries.includes(country)) {
            chip.remove();
        }
    });
}

function mapSortModeToApi(sortMode) {
    switch (sortMode) {
        case "signal-asc":
        return { sortBy: "signal", sortDirection: "asc" };
        case "sentiment-desc":
        return { sortBy: "sentiment", sortDirection: "desc" };
        case "sentiment-asc":
        return { sortBy: "sentiment", sortDirection: "asc" };
        case "signal-desc":
        default:
        return { sortBy: "signal", sortDirection: "desc" };
    }
}

function mapUiSentimentToApiSentiment(sentimentValue) {
    if (!sentimentValue || sentimentValue === "all") {
        return [];
    }
    
    return [titleCase(sentimentValue)];
}

function buildApiPayload() {
    const selectedRegions = state.regions.includes("world") ? [] : state.regions;
    const { sortBy, sortDirection } = mapSortModeToApi(state.sortBy);
    
    return {
        scenario: state.query,
        filters: {
            regions: selectedRegions.map((region) => {
                if (region === "north-america") return "North-America";
                if (region === "south-america") return "South-America";
                if (region === "middle-east") return "Middle-East";
                if (region === "asia") return "Asia-Pacific";
                return titleCase(region.replace(/-/g, " "));
            }),
            countries: state.countries.map((country) => titleCase(country)),
            mediaTypes: [],
            sentiment: mapUiSentimentToApiSentiment(state.sentimentFilter)
        },
        sortBy,
        sortDirection
    };
}

async function fetchIntelligenceResults() {
    syncStateFromUI();
    
    const payload = buildApiPayload();
    
    state.isLoading = true;
    updateScenarioShellState();
    updateResultsSummary(0);
    
    if (primaryActionBtn) {
        primaryActionBtn.disabled = true;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/intelligence/analyze`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Backend request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        state.results = Array.isArray(data.results) ? data.results : [];
        state.lastSummary = data.summary || {
            totalSources: 0,
            averageSentiment: 0,
            averageSignal: 0
        };
        
        renderResultsFromState();
        filterAndRenderResults();
    } catch (error) {
        console.error("Failed to fetch intelligence results:", error);
        state.results = [];
        state.lastSummary = {
            totalSources: 0,
            averageSentiment: 0,
            averageSignal: 0
        };
        
        renderResultsFromState();
        filterAndRenderResults();
        
        if (resultsMiniSummary) {
            resultsMiniSummary.textContent = "Backend unavailable · check API server";
        }
    } finally {
        state.isLoading = false;
        if (primaryActionBtn) {
            primaryActionBtn.disabled = false;
        }
        updateScenarioShellState();
    }
}

function bindScenarioInputEvents() {
    if (scenarioInput) {
        scenarioInput.addEventListener("input", () => {
            state.selectedTrend = "";
            syncTrendSignalActiveState();
            syncStateFromUI();
            updateScenarioShellState();
        });
        
        scenarioInput.addEventListener("change", () => {
            state.selectedTrend = "";
            syncTrendSignalActiveState();
            syncStateFromUI();
            updateScenarioShellState();
        });
    }
    
    exampleChips.forEach((chip) => {
        chip.addEventListener("click", () => {
            if (!scenarioInput) return;
            scenarioInput.value = chip.textContent.trim();
            state.selectedTrend = "";
            syncTrendSignalActiveState();
            syncStateFromUI();
            updateScenarioShellState();
            scenarioInput.focus();
        });
    });
    
    if (primaryActionBtn) {
        primaryActionBtn.addEventListener("click", () => {
            fetchIntelligenceResults();
        });
    }
}

function syncTrendSignalActiveState() {
    trendSignalItems.forEach((item) => {
        item.classList.toggle("is-active", item.dataset.trendQuery === state.selectedTrend);
    });
}

function bindTrendSignalEvents() {
    if (!trendSignalList) return;
    
    trendSignalItems.forEach((item) => {
        item.addEventListener("click", () => {
            const trendQuery = item.dataset.trendQuery || "";
            state.selectedTrend = trendQuery;
            
            if (scenarioInput) {
                scenarioInput.value = trendQuery;
            }
            
            syncTrendSignalActiveState();
            syncStateFromUI();
            updateScenarioShellState();
            fetchIntelligenceResults();
        });
    });
}

function clearAllFilters() {
    document.querySelectorAll('.filter-group input[type="checkbox"]').forEach((checkbox) => {
        checkbox.checked = false;
    });
    
    const worldCheckbox = getWorldCheckbox();
    if (worldCheckbox) {
        worldCheckbox.checked = true;
    }
    
    const mediaGroup = getFilterGroupByTitle("Media Type");
    if (mediaGroup) {
        const newspapers = mediaGroup.querySelector('input[value="newspapers"]');
        const newsChannels = mediaGroup.querySelector('input[value="news-channels"]');
        if (newspapers) newspapers.checked = true;
        if (newsChannels) newsChannels.checked = true;
    }
    
    const publicationGroup = getFilterGroupByTitle("Publication Focus");
    if (publicationGroup) {
        const international = publicationGroup.querySelector('input[value="international"]');
        if (international) international.checked = true;
    }
    
    const allSentiment = document.querySelector('input[name="sentiment-filter"][value="all"]');
    if (allSentiment) {
        allSentiment.checked = true;
    }
    
    if (sortResultsSelect) {
        sortResultsSelect.value = "signal-desc";
    }
    
    clearSelectedCountries();
    
    if (countrySearchInput) {
        countrySearchInput.value = "";
    }
    
    if (scenarioInput) {
        scenarioInput.value = "";
    }
    
    state.selectedTrend = "";
    syncTrendSignalActiveState();
    
    if (countryDropdown) {
        countryDropdown.classList.add("hidden");
    }
    
    if (countryDropdownBtn) {
        countryDropdownBtn.classList.remove("is-active");
    }
    
    renderCountryDropdown();
    updateCountryButtonLabel();
    updateScopeChips();
    syncStateFromUI();
    updateScenarioShellState();
    fetchIntelligenceResults();
}

function bindFilterEvents() {
    const filterCheckboxes = document.querySelectorAll('.filter-group input[type="checkbox"]');
    
    filterCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            if (getGeoCheckboxes().includes(checkbox)) {
                handleWorldSelectionRule(checkbox);
            }
            
            updateScopeChips();
            syncStateFromUI();
            updateScenarioShellState();
            filterAndRenderResults();
        });
    });
    
    sentimentFilterInputs.forEach((input) => {
        input.addEventListener("change", () => {
            syncStateFromUI();
            updateScenarioShellState();
            filterAndRenderResults();
        });
    });
    
    if (sortResultsSelect) {
        sortResultsSelect.addEventListener("change", () => {
            syncStateFromUI();
            filterAndRenderResults();
        });
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener("click", clearAllFilters);
    }
}

function initializeCardDisplays() {
    getResultCards().forEach((card) => {
        const signalScore = parseFloat(card.dataset.signalScore || "0");
        const sentimentScore = parseFloat(card.dataset.sentimentScore || "0");
        updateCardDisplays(card, signalScore, sentimentScore, "");
    });
}

async function init() {
    bindExpandButtons();
    bindCountryDropdown();
    bindFilterEvents();
    bindScenarioInputEvents();
    bindTrendSignalEvents();
    renderCountryDropdown();
    updateCountryButtonLabel();
    updateScopeChips();
    initializeCardDisplays();
    syncStateFromUI();
    updateScenarioShellState();
    await fetchIntelligenceResults();
}

init();
});