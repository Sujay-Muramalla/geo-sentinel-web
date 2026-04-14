document.addEventListener("DOMContentLoaded", () => {
    const state = {
        query: "",
        regions: ["world"],
        countries: [],
        mediaTypes: ["newspapers", "news-channels"],
        publicationFocus: ["international"],
        sentimentFilter: "all",
        sortBy: "signal-desc",
        selectedTrend: ""
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

    const resultCards = Array.from(document.querySelectorAll(".result-card"));
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
            return {
                isMatch: true,
                score: 0,
                matchedTokens: [],
                totalTokens: 0
            };
        }

        const searchableText = getCardSearchText(card);
        const searchableTokens = getNormalizedSearchableTokens(card);

        let score = 0;
        const matchedTokens = [];

        tokens.forEach((token) => {
            const tokenMatched = tokenMatchesSearchableText(token, searchableText, searchableTokens);
            if (!tokenMatched) return;

            matchedTokens.push(token);

            if (searchableTokens.includes(token)) {
                score += 4;
                return;
            }

            const strongPartial = searchableTokens.some(
                (searchableToken) =>
                    searchableToken.length >= 4 &&
                    token.length >= 4 &&
                    (searchableToken.includes(token) || token.includes(searchableToken))
            );

            if (strongPartial) {
                score += 2.5;
                return;
            }

            score += 1;
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

        const totalScore = score + bonus;
        const matchedCount = [...new Set(matchedTokens)].length;
        const minimumMatches = tokens.length === 1 ? 1 : Math.max(2, Math.ceil(tokens.length / 2));

        return {
            isMatch: matchedCount >= minimumMatches && totalScore >= 3.5,
            score: totalScore,
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

    function cardMatchesSentimentFilter(sentimentValue) {
        if (state.sentimentFilter === "all") return true;
        return normalizeText(sentimentValue) === state.sentimentFilter;
    }

    function updateCardScoreDisplays(card, signalScore, sentimentScore) {
        const signalValueEl = card.querySelector(".signal-score-value");
        const sentimentValueEl = card.querySelector(".sentiment-score-value");

        if (signalValueEl) {
            signalValueEl.textContent = signalScore.toFixed(1);
        }

        if (sentimentValueEl) {
            const formatted = sentimentScore > 0 ? `+${sentimentScore.toFixed(2)}` : sentimentScore.toFixed(2);
            sentimentValueEl.textContent = formatted;
        }
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
        resultCards.forEach((card) => card.classList.remove("is-top-match"));

        if (!entries.length) return;
        if (!state.query.trim()) return;

        entries[0].card.classList.add("is-top-match");
    }

    function updateResultsSummary(visibleCount) {
        if (!resultsMiniSummary) return;

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
                    if (entry.sentimentScore > 0.1) positive += 1;
                    else if (entry.sentimentScore < -0.1) negative += 1;
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

        if (avgSignal >= 8) signalStrengthEl.textContent = "High";
        else if (avgSignal >= 4.5) signalStrengthEl.textContent = "Medium";
        else signalStrengthEl.textContent = "Low";

        let positive = 0;
        let neutral = 0;
        let negative = 0;

        sortedEntries.forEach((entry) => {
            if (entry.sentimentScore > 0.1) positive += 1;
            else if (entry.sentimentScore < -0.1) negative += 1;
            else neutral += 1;
        });

        if (negative > positive && negative > neutral) dominantToneEl.textContent = "Risk-heavy";
        else if (positive > negative && positive > neutral) dominantToneEl.textContent = "Constructive";
        else dominantToneEl.textContent = "Cautious";

        sourceSpreadEl.textContent = String(sortedEntries.length);
    }

    function filterAndRenderResults() {
        syncStateFromUI();

        const visibleEntries = [];

        resultCards.forEach((card, index) => {
            const cardRegion = normalizeText(card.dataset.region || "");
            const cardCountries = parseDatasetList(card.dataset.countries);
            const cardMediaTypes = parseDatasetList(card.dataset.mediaType);
            const cardFocusValues = parseDatasetList(card.dataset.focus);
            const sentimentScore = parseFloat(card.dataset.sentimentScore || "0");
            const sentimentLabel =
                sentimentScore > 0.1 ? "positive" : sentimentScore < -0.1 ? "negative" : "neutral";

            const queryRelevance = calculateQueryRelevance(card, state.query);

            const shouldShow =
                cardMatchesRegions(cardRegion) &&
                cardMatchesCountries(cardCountries) &&
                cardMatchesMediaTypes(cardMediaTypes) &&
                cardMatchesFocus(cardFocusValues) &&
                cardMatchesSentimentFilter(sentimentLabel) &&
                queryRelevance.isMatch;

            const signalScore = queryRelevance.score;

            updateCardScoreDisplays(card, signalScore, sentimentScore);

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

    function bindScenarioInputEvents() {
        if (scenarioInput) {
            scenarioInput.addEventListener("input", () => {
                state.selectedTrend = "";
                syncTrendSignalActiveState();
                filterAndRenderResults();
            });

            scenarioInput.addEventListener("change", () => {
                state.selectedTrend = "";
                syncTrendSignalActiveState();
                filterAndRenderResults();
            });
        }

        exampleChips.forEach((chip) => {
            chip.addEventListener("click", () => {
                if (!scenarioInput) return;
                scenarioInput.value = chip.textContent.trim();
                state.selectedTrend = "";
                syncTrendSignalActiveState();
                filterAndRenderResults();
                scenarioInput.focus();
            });
        });

        if (primaryActionBtn) {
            primaryActionBtn.addEventListener("click", () => {
                filterAndRenderResults();
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
                filterAndRenderResults();
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

        if (countryDropdown) {
            countryDropdown.classList.add("hidden");
        }

        if (countryDropdownBtn) {
            countryDropdownBtn.classList.remove("is-active");
        }

        renderCountryDropdown();
        updateCountryButtonLabel();
        updateScopeChips();
        filterAndRenderResults();
    }

    function bindFilterEvents() {
        const filterCheckboxes = document.querySelectorAll('.filter-group input[type="checkbox"]');

        filterCheckboxes.forEach((checkbox) => {
            checkbox.addEventListener("change", () => {
                if (getGeoCheckboxes().includes(checkbox)) {
                    handleWorldSelectionRule(checkbox);
                }

                updateScopeChips();
                filterAndRenderResults();
            });
        });

        sentimentFilterInputs.forEach((input) => {
            input.addEventListener("change", filterAndRenderResults);
        });

        if (sortResultsSelect) {
            sortResultsSelect.addEventListener("change", filterAndRenderResults);
        }

        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener("click", clearAllFilters);
        }
    }

    function initializeCardDisplays() {
        resultCards.forEach((card) => {
            const sentimentScore = parseFloat(card.dataset.sentimentScore || "0");
            updateCardScoreDisplays(card, 0, sentimentScore);
        });
    }

    function init() {
        bindExpandButtons();
        bindCountryDropdown();
        bindFilterEvents();
        bindScenarioInputEvents();
        bindTrendSignalEvents();
        renderCountryDropdown();
        updateCountryButtonLabel();
        updateScopeChips();
        initializeCardDisplays();
        filterAndRenderResults();
    }

    init();
});