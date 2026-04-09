document.addEventListener("DOMContentLoaded", () => {
    // -----------------------------
    // SCENARIO STATE
    // -----------------------------
    let currentScenario = {
        query: "",
        regions: [],
        countries: [],
        mediaTypes: [],
        publicationFocus: []
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

    const resultCards = Array.from(document.querySelectorAll(".result-card"));
    const resultsMiniSummary = document.getElementById("results-mini-summary");
    const resultsEmptyState = document.getElementById("results-empty-state");

    const comparisonCount = document.getElementById("comparison-count");
    const comparisonEmptyState = document.getElementById("comparison-empty-state");
    const comparisonList = document.getElementById("comparison-list");

    let comparedItems = [];

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
            .map((token) => normalizeToken(token))
            .filter((token) => token.length > 1);
    }

    function getComparisonDataFromCard(card) {
        const title = card.querySelector("h4")?.textContent.trim() || "Unknown Source";
        const meta = card.querySelector(".result-meta")?.textContent.trim() || "";
        const description = card.querySelector(".result-head + p")?.textContent.trim() || "";
        const sentimentTag = card.querySelector(".sentiment-tag");
        const sentimentText = sentimentTag?.textContent.trim() || "Unknown";
        const sentimentClass = Array.from(sentimentTag?.classList || []).find((className) =>
            className.startsWith("sentiment-")
        ) || "";

        return {
            id: title.toLowerCase().replace(/\s+/g, "-"),
            title,
            meta,
            description,
            sentimentText,
            sentimentClass
        };
    }

    function renderComparisonRail() {
        if (!comparisonCount || !comparisonEmptyState || !comparisonList) return;

        comparisonCount.textContent =
            comparedItems.length === 1 ? "1 selected" : `${comparedItems.length} selected`;

        comparisonEmptyState.classList.toggle("hidden", comparedItems.length > 0);

        if (comparedItems.length === 0) {
            comparisonList.innerHTML = "";
            syncSelectedComparisonCardStates();
            return;
        }

        comparisonList.innerHTML = comparedItems
            .map((item) => {
                return `
                    <article class="comparison-card" data-comparison-id="${item.id}">
                        <div class="comparison-card-head">
                            <div>
                                <h4>${item.title}</h4>
                                <p class="comparison-meta">${item.meta}</p>
                            </div>
                            <button
                                type="button"
                                class="comparison-remove-btn"
                                data-remove-comparison="${item.id}"
                                aria-label="Remove ${item.title} from comparison"
                            >
                                ×
                            </button>
                        </div>

                        <div class="comparison-card-body">
                            <span class="sentiment-tag ${item.sentimentClass}">${item.sentimentText}</span>
                            <p>${item.description}</p>
                        </div>
                    </article>
                `;
            })
            .join("");

        syncSelectedComparisonCardStates();
    }

    function addCardToComparison(card) {
        const comparisonItem = getComparisonDataFromCard(card);
        const alreadyExists = comparedItems.some((item) => item.id === comparisonItem.id);
        if (alreadyExists) return;

        comparedItems.push(comparisonItem);
        renderComparisonRail();
    }

    function removeComparisonItem(itemId) {
        comparedItems = comparedItems.filter((item) => item.id !== itemId);
        renderComparisonRail();
    }

    function syncSelectedComparisonCardStates() {
        resultCards.forEach((card) => {
            const comparisonItem = getComparisonDataFromCard(card);
            const isSelected = comparedItems.some((item) => item.id === comparisonItem.id);
            card.classList.toggle("is-compared", isSelected);
        });
    }

    function bindResultCardComparisonEvents() {
        resultCards.forEach((card) => {
            card.addEventListener("click", (event) => {
                const removeBtn = event.target.closest(".comparison-remove-btn");
                if (removeBtn) return;
                if (card.style.display === "none") return;
                addCardToComparison(card);
            });
        });
    }

    function bindComparisonRailEvents() {
        if (!comparisonList) return;

        comparisonList.addEventListener("click", (event) => {
            const removeButton = event.target.closest("[data-remove-comparison]");
            if (!removeButton) return;

            event.stopPropagation();

            const itemId = removeButton.dataset.removeComparison;
            removeComparisonItem(itemId);
        });
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

    function getSelectedRegions() {
        return getCheckedValuesFromSection("Geographic Scope");
    }

    function getSelectedCountries() {
        if (!selectedCountriesContainer) return [];

        return Array.from(selectedCountriesContainer.querySelectorAll(".country-chip"))
            .map((chip) => normalizeText(chip.dataset.country || chip.textContent.replace("×", "")))
            .filter(Boolean);
    }

    function buildScenarioFromUI() {
        currentScenario = {
            query: scenarioInput ? scenarioInput.value.trim() : "",
            regions: getSelectedRegions(),
            countries: getSelectedCountries(),
            mediaTypes: getCheckedValuesFromSection("Media Type"),
            publicationFocus: getCheckedValuesFromSection("Publication Focus")
        };

        return currentScenario;
    }

    function isDefaultScenarioState(scenario) {
        const defaultRegions =
            scenario.regions.length === 1 && scenario.regions.includes("world");
        const defaultCountries = scenario.countries.length === 0;

        const defaultMediaTypes =
            scenario.mediaTypes.length === 2 &&
            scenario.mediaTypes.includes("newspapers") &&
            scenario.mediaTypes.includes("news-channels");

        const defaultPublicationFocus =
            scenario.publicationFocus.length === 1 &&
            scenario.publicationFocus.includes("international");

        const emptyQuery = scenario.query === "";

        return (
            emptyQuery &&
            defaultRegions &&
            defaultCountries &&
            defaultMediaTypes &&
            defaultPublicationFocus
        );
    }

    function updateScenarioShellState() {
        if (!statusPill || !primaryActionBtn) return;

        const hasQuery = currentScenario.query.length > 0;
        const hasCountryScope = currentScenario.countries.length > 0;
        const hasCustomRegionScope =
            currentScenario.regions.length > 0 && !currentScenario.regions.includes("world");
        const isDefaultState = isDefaultScenarioState(currentScenario);

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

        if (hasCountryScope || hasCustomRegionScope) {
            statusPill.textContent = "Scope Ready";
            primaryActionBtn.textContent = "Refresh Intelligence";
            return;
        }

        statusPill.textContent = "Live Intelligence Shell";
        primaryActionBtn.textContent = "Generate Intelligence";
    }

    function getCardSearchText(card) {
        const title = card.querySelector("h4")?.textContent || "";
        const meta = card.querySelector(".result-meta")?.textContent || "";
        const description = card.querySelector(".result-head + p")?.textContent || "";
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

        return normalizeText(`${title} ${meta} ${description} ${chips} ${datasetText}`);
    }

    function getNormalizedSearchableTokens(card) {
        return getCardSearchText(card)
            .split(/[\s,.;:/()+-]+/)
            .map((token) => normalizeToken(token))
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
                score += 3;
                return;
            }

            const strongPartial = searchableTokens.some(
                (searchableToken) =>
                    searchableToken.length >= 4 &&
                    token.length >= 4 &&
                    (searchableToken.includes(token) || token.includes(searchableToken))
            );

            if (strongPartial) {
                score += 2;
                return;
            }

            score += 1;
        });

        let bonus = 0;

        const titleText = normalizeText(card.querySelector("h4")?.textContent || "");
        const metaText = normalizeText(card.querySelector(".result-meta")?.textContent || "");

        tokens.forEach((token) => {
            if (titleText.includes(token)) {
                bonus += 2;
            } else if (metaText.includes(token)) {
                bonus += 1;
            }
        });

        const totalScore = score + bonus;

        return {
            isMatch: totalScore >= 2,
            score: totalScore,
            matchedTokens: [...new Set(matchedTokens)],
            totalTokens: tokens.length
        };
    }

    function syncScenarioEngine() {
        buildScenarioFromUI();
        updateScopeChips();
        filterResultCards();
        renderComparisonRail();
        updateScenarioShellState();
    }

    function getAvailableCountriesForSelectedRegions() {
        const selectedRegions = getSelectedRegions();

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
                filterResultCards();
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
            filterResultCards();
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

    function bindScenarioInputEvents() {
        if (scenarioInput) {
            scenarioInput.addEventListener("input", syncScenarioEngine);
            scenarioInput.addEventListener("change", syncScenarioEngine);
        }

        exampleChips.forEach((chip) => {
            chip.addEventListener("click", () => {
                if (!scenarioInput) return;
                scenarioInput.value = chip.textContent.trim();
                syncScenarioEngine();
                scenarioInput.focus();
            });
        });

        if (primaryActionBtn) {
            primaryActionBtn.addEventListener("click", syncScenarioEngine);
        }
    }

    function updateScopeChips() {
        if (!scopeChipsContainer) return;

        const selectedRegions = getSelectedRegions();
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

    function cardMatchesRegions(cardRegion, selectedRegions) {
        if (!selectedRegions.length || selectedRegions.includes("world")) {
            return true;
        }

        return selectedRegions.includes(cardRegion);
    }

    function cardMatchesCountries(cardCountries, selectedCountries) {
        if (!selectedCountries.length) {
            return true;
        }

        return selectedCountries.some((country) => cardCountries.includes(country));
    }

    function cardMatchesMediaTypes(cardMediaTypes, selectedMediaTypes) {
        if (!selectedMediaTypes.length) {
            return true;
        }

        return selectedMediaTypes.some((mediaType) => cardMediaTypes.includes(mediaType));
    }

    function cardMatchesFocus(cardFocusValues, selectedFocusValues) {
        if (!selectedFocusValues.length) {
            return true;
        }

        return selectedFocusValues.some((focus) => cardFocusValues.includes(focus));
    }

    function updateResultsSummary(visibleCount, selectedRegions, selectedCountries, query) {
        if (!resultsMiniSummary) return;

        const sourceLabel = visibleCount === 1 ? "1 source" : `${visibleCount} sources`;

        let regionLabel = "world";
        if (selectedRegions.length > 0 && !selectedRegions.includes("world")) {
            regionLabel = selectedRegions
                .map((region) => titleCase(region.replace(/-/g, " ")))
                .join(", ");
        }

        let countryLabel = "all countries";
        if (selectedCountries.length === 1) {
            countryLabel = "1 country";
        } else if (selectedCountries.length > 1) {
            countryLabel = `${selectedCountries.length} countries`;
        }

        const sentimentLabel = visibleCount === 0 ? "no live sentiment" : "mixed sentiment";
        const parts = [sourceLabel, sentimentLabel, countryLabel, regionLabel];

        if (normalizeText(query)) {
            parts.push("query active");
        }

        resultsMiniSummary.textContent = parts.join(" · ");
    }

    function updateSignalMetrics() {
        const signalStrengthEl = document.getElementById("metric-signal-strength");
        const dominantToneEl = document.getElementById("metric-dominant-tone");
        const sourceSpreadEl = document.getElementById("metric-source-spread");

        if (!signalStrengthEl || !dominantToneEl || !sourceSpreadEl) return;

        const visibleCards = resultCards.filter((card) => card.style.display !== "none");

        if (visibleCards.length === 0) {
            signalStrengthEl.textContent = "Low";
            dominantToneEl.textContent = "No match";
            sourceSpreadEl.textContent = "Narrow";
            return;
        }

        const signalLevels = visibleCards.map((card) =>
            normalizeText(card.dataset.signal || "medium")
        );

        const positiveCount = visibleCards.filter((card) =>
            card.querySelector(".sentiment-positive")
        ).length;
        const negativeCount = visibleCards.filter((card) =>
            card.querySelector(".sentiment-negative")
        ).length;
        const neutralCount = visibleCards.filter((card) =>
            card.querySelector(".sentiment-neutral")
        ).length;

        const highSignals = signalLevels.filter((level) => level === "high").length;
        const mediumSignals = signalLevels.filter((level) => level === "medium").length;

        if (highSignals >= 2) {
            signalStrengthEl.textContent = "High";
        } else if (highSignals >= 1 || mediumSignals >= 2) {
            signalStrengthEl.textContent = "Medium";
        } else {
            signalStrengthEl.textContent = "Low";
        }

        if (negativeCount > positiveCount && negativeCount > neutralCount) {
            dominantToneEl.textContent = "Risk-heavy";
        } else if (positiveCount > negativeCount && positiveCount > neutralCount) {
            dominantToneEl.textContent = "Constructive";
        } else {
            dominantToneEl.textContent = "Cautious";
        }

        if (visibleCards.length >= 3) {
            sourceSpreadEl.textContent = "Broad";
        } else if (visibleCards.length === 2) {
            sourceSpreadEl.textContent = "Balanced";
        } else {
            sourceSpreadEl.textContent = "Focused";
        }
    }

    function filterResultCards() {
        const scenario = buildScenarioFromUI();
        const { query, regions, countries, mediaTypes, publicationFocus } = scenario;

        let visibleCount = 0;

        resultCards.forEach((card) => {
            const cardRegion = normalizeText(card.dataset.region || "");
            const cardCountries = parseDatasetList(card.dataset.countries);
            const cardMediaTypes = parseDatasetList(card.dataset.mediaType);
            const cardFocusValues = parseDatasetList(card.dataset.focus);

            const matchesRegion = cardMatchesRegions(cardRegion, regions);
            const matchesCountry = cardMatchesCountries(cardCountries, countries);
            const matchesMedia = cardMatchesMediaTypes(cardMediaTypes, mediaTypes);
            const matchesFocus = cardMatchesFocus(cardFocusValues, publicationFocus);

            const queryRelevance = calculateQueryRelevance(card, query);
            const matchesQuery = queryRelevance.isMatch;

            const shouldShow =
                matchesRegion &&
                matchesCountry &&
                matchesMedia &&
                matchesFocus &&
                matchesQuery;

            card.style.display = shouldShow ? "" : "none";

            if (shouldShow) {
                visibleCount += 1;
            }
        });

        if (resultsEmptyState) {
            resultsEmptyState.classList.toggle("hidden", visibleCount > 0);
        }

        updateResultsSummary(visibleCount, regions, countries, query);
        updateSignalMetrics();
        updateScenarioShellState();
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
        filterResultCards();
    }

    function bindFilterEvents() {
        const filterCheckboxes = document.querySelectorAll('.filter-group input[type="checkbox"]');

        filterCheckboxes.forEach((checkbox) => {
            checkbox.addEventListener("change", () => {
                if (getGeoCheckboxes().includes(checkbox)) {
                    handleWorldSelectionRule(checkbox);
                }

                filterResultCards();
                updateScopeChips();
            });
        });

        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener("click", clearAllFilters);
        }
    }

    function init() {
        bindExpandButtons();
        bindCountryDropdown();
        bindFilterEvents();
        bindScenarioInputEvents();
        bindResultCardComparisonEvents();
        bindComparisonRailEvents();
        renderCountryDropdown();
        updateCountryButtonLabel();
        updateScopeChips();
        buildScenarioFromUI();
        filterResultCards();
        renderComparisonRail();
    }

    init();
});