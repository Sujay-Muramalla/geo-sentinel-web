document.addEventListener("DOMContentLoaded", () => {
    /* -----------------------------
       Expand / collapse filter groups
    ----------------------------- */
    const expandButtons = document.querySelectorAll(".expand-btn");

    expandButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const targetId = button.getAttribute("data-target");
            const target = document.getElementById(targetId);

            if (!target) return;

            const isOpen = target.classList.toggle("is-open");
            button.classList.toggle("is-open", isOpen);
            button.textContent = isOpen ? "Show less" : "Show more";
        });
    });

    /* -----------------------------
       Data model
    ----------------------------- */
    const regionCountryMap = {
        "Europe": ["Germany", "France", "United Kingdom", "Italy", "Spain", "Netherlands"],
        "Asia": ["India", "China", "Japan", "South Korea", "Singapore", "Indonesia"],
        "North America": ["United States", "Canada", "Mexico"],
        "Africa": ["Nigeria", "South Africa", "Kenya", "Egypt", "Morocco"],
        "Middle East": ["Saudi Arabia", "United Arab Emirates", "Israel", "Qatar", "Turkey"],
        "South America": ["Brazil", "Argentina", "Chile", "Colombia", "Peru"],
        "Oceania": ["Australia", "New Zealand"]
    };

    const allCountries = Array.from(
        new Set(Object.values(regionCountryMap).flat())
    ).sort((a, b) => a.localeCompare(b));

    /* -----------------------------
       Selectors
    ----------------------------- */
    const regionCheckboxes = document.querySelectorAll(
        '.filter-group input[type="checkbox"][value]'
    );

    const countryDropdownBtn = document.getElementById("country-dropdown-btn");
    const countryDropdown = document.getElementById("country-dropdown");
    const countryList = document.getElementById("country-list");
    const selectedCountriesContainer = document.getElementById("selected-countries");
    const countrySearchInput = document.getElementById("country-search-input");

    const mediaCheckboxes = Array.from(document.querySelectorAll(".filter-group"))
        .find(group => group.querySelector("h4")?.textContent.trim() === "Media Type")
        ?.querySelectorAll('input[type="checkbox"]') || [];

    const publicationCheckboxes = Array.from(document.querySelectorAll(".filter-group"))
        .find(group => group.querySelector("h4")?.textContent.trim() === "Publication Focus")
        ?.querySelectorAll('input[type="checkbox"]') || [];

    const scopeChipsContainer = document.getElementById("scope-chips");
    const resultsMiniSummary = document.getElementById("results-mini-summary");
    const metricSignalStrength = document.getElementById("metric-signal-strength");
    const metricDominantTone = document.getElementById("metric-dominant-tone");
    const metricSourceSpread = document.getElementById("metric-source-spread");
    const clearFiltersBtn = document.getElementById("clear-filters-btn");

    let explicitCountrySelection = new Set();

    /* -----------------------------
       Helpers
    ----------------------------- */
    function getCheckedLabels(nodeList) {
        return Array.from(nodeList)
            .filter(input => input.checked)
            .map(input => input.parentElement.textContent.trim());
    }

    function getSelectedRegions() {
        return Array.from(regionCheckboxes)
            .filter((checkbox) => checkbox.checked)
            .map((checkbox) => checkbox.value);
    }

    function getAvailableCountries() {
        const selectedRegions = getSelectedRegions();

        if (selectedRegions.length === 0 || selectedRegions.includes("World")) {
            return allCountries;
        }

        const scopedCountries = selectedRegions.flatMap((region) => regionCountryMap[region] || []);
        return Array.from(new Set(scopedCountries)).sort((a, b) => a.localeCompare(b));
    }

    function sanitizeExplicitSelection() {
        const availableCountries = new Set(getAvailableCountries());

        explicitCountrySelection = new Set(
            Array.from(explicitCountrySelection).filter((country) =>
                availableCountries.has(country)
            )
        );
    }

    function getEffectiveCountries() {
        const availableCountries = getAvailableCountries();

        if (explicitCountrySelection.size === 0) {
            return availableCountries;
        }

        return availableCountries.filter((country) =>
            explicitCountrySelection.has(country)
        );
    }

    function getSelectedMediaTypes() {
        return getCheckedLabels(mediaCheckboxes);
    }

    function getSelectedPublicationFocus() {
        return getCheckedLabels(publicationCheckboxes);
    }

    function renderCountryList(filterText = "") {
        const availableCountries = getAvailableCountries();
        const normalizedFilter = filterText.trim().toLowerCase();

        const filteredCountries = availableCountries.filter((country) =>
            country.toLowerCase().includes(normalizedFilter)
        );

        countryList.innerHTML = "";

        if (filteredCountries.length === 0) {
            const emptyState = document.createElement("div");
            emptyState.textContent = "No countries match your search.";
            emptyState.style.fontSize = "0.85rem";
            emptyState.style.color = "#667792";
            emptyState.style.padding = "0.4rem 0.2rem";
            countryList.appendChild(emptyState);
            return;
        }

        filteredCountries.forEach((country) => {
            const label = document.createElement("label");
            const checkbox = document.createElement("input");
            const span = document.createElement("span");

            checkbox.type = "checkbox";
            checkbox.checked = explicitCountrySelection.has(country);
            checkbox.dataset.country = country;

            checkbox.addEventListener("change", () => {
                if (checkbox.checked) {
                    explicitCountrySelection.add(country);
                } else {
                    explicitCountrySelection.delete(country);
                }

                updateAllUI();
            });

            span.textContent = country;

            label.appendChild(checkbox);
            label.appendChild(span);
            countryList.appendChild(label);
        });
    }

    function renderSelectedCountryChips() {
        selectedCountriesContainer.innerHTML = "";

        if (explicitCountrySelection.size === 0) {
            return;
        }

        Array.from(explicitCountrySelection)
            .sort((a, b) => a.localeCompare(b))
            .forEach((country) => {
                const chip = document.createElement("span");
                chip.className = "country-chip";
                chip.textContent = country;
                selectedCountriesContainer.appendChild(chip);
            });
    }

    function updateCountryButtonLabel() {
        const selectedRegions = getSelectedRegions();
        const availableCountries = getAvailableCountries();

        if (explicitCountrySelection.size > 0) {
            const count = explicitCountrySelection.size;
            countryDropdownBtn.textContent = count === 1 ? "1 country selected" : `${count} countries selected`;
            countryDropdownBtn.classList.add("is-active");
            return;
        }

        if (selectedRegions.length === 0) {
            countryDropdownBtn.textContent = "All countries (global scope)";
            countryDropdownBtn.classList.remove("is-active");
            return;
        }

        if (selectedRegions.includes("World")) {
            countryDropdownBtn.textContent = "All countries (world)";
            countryDropdownBtn.classList.remove("is-active");
            return;
        }

        const regionCount = selectedRegions.length;
        if (regionCount === 1) {
            countryDropdownBtn.textContent = `All countries (${availableCountries.length} in selected region)`;
        } else {
            countryDropdownBtn.textContent = `All countries (${availableCountries.length} in selected regions)`;
        }

        countryDropdownBtn.classList.remove("is-active");
    }

    function renderScopeChips() {
        scopeChipsContainer.innerHTML = "";

        const selectedRegions = getSelectedRegions();
        const selectedMedia = getSelectedMediaTypes();
        const selectedFocus = getSelectedPublicationFocus();

        const chips = [];

        if (explicitCountrySelection.size > 0) {
            Array.from(explicitCountrySelection)
                .sort((a, b) => a.localeCompare(b))
                .forEach(country => {
                    chips.push({ text: country, className: "scope-chip is-country" });
                });
        } else if (selectedRegions.length === 0) {
            chips.push({ text: "World", className: "scope-chip is-muted" });
        } else if (selectedRegions.includes("World")) {
            chips.push({ text: "World", className: "scope-chip is-muted" });
        } else {
            selectedRegions.forEach(region => {
                chips.push({ text: region, className: "scope-chip is-muted" });
            });
        }

        selectedMedia.forEach(item => {
            chips.push({ text: item, className: "scope-chip" });
        });

        selectedFocus.forEach(item => {
            chips.push({ text: item, className: "scope-chip" });
        });

        if (chips.length === 0) {
            chips.push({ text: "World", className: "scope-chip is-muted" });
        }

        chips.forEach(chipData => {
            const chip = document.createElement("span");
            chip.className = chipData.className;
            chip.textContent = chipData.text;
            scopeChipsContainer.appendChild(chip);
        });
    }

    function updateResultsSummary() {
        const selectedRegions = getSelectedRegions();
        const selectedMedia = getSelectedMediaTypes();
        const effectiveCountries = getEffectiveCountries();

        const sourceCount = Math.max(4, selectedMedia.length * 2 + Math.min(effectiveCountries.length, 6));

        let regionLabel = "world";
        if (explicitCountrySelection.size > 0) {
            regionLabel = explicitCountrySelection.size === 1
                ? "1 country"
                : `${explicitCountrySelection.size} countries`;
        } else if (selectedRegions.length === 0 || selectedRegions.includes("World")) {
            regionLabel = "world";
        } else if (selectedRegions.length === 1) {
            regionLabel = "1 region";
        } else {
            regionLabel = `${selectedRegions.length} regions`;
        }

        resultsMiniSummary.textContent = `${sourceCount} sources · mixed sentiment · ${regionLabel}`;
    }

    function updateSignalMetrics() {
        const selectedMedia = getSelectedMediaTypes();
        const selectedFocus = getSelectedPublicationFocus();
        const selectedRegions = getSelectedRegions();
        const countryCount = explicitCountrySelection.size;
        const effectiveCountryCount = getEffectiveCountries().length;

        let strength = "Moderate";
        if (countryCount >= 3 || selectedMedia.length >= 3) {
            strength = "High";
        } else if (selectedRegions.includes("World")) {
            strength = "High";
        }

        let tone = "Cautious";
        if (selectedFocus.includes("Policy outlets") || selectedFocus.includes("Research and journals")) {
            tone = "Analytical";
        } else if (selectedMedia.includes("News Channels") && selectedMedia.includes("Newspapers")) {
            tone = "Balanced";
        }

        let spread = "Balanced";
        if (countryCount > 0 && countryCount <= 2) {
            spread = "Focused";
        } else if (effectiveCountryCount > 8 || selectedRegions.includes("World")) {
            spread = "Wide";
        }

        metricSignalStrength.textContent = strength;
        metricDominantTone.textContent = tone;
        metricSourceSpread.textContent = spread;
    }

    function updateAllUI() {
        sanitizeExplicitSelection();
        renderCountryList(countrySearchInput.value);
        renderSelectedCountryChips();
        updateCountryButtonLabel();
        renderScopeChips();
        updateResultsSummary();
        updateSignalMetrics();

        console.log("Selected regions:", getSelectedRegions());
        console.log("Explicit countries:", Array.from(explicitCountrySelection));
        console.log("Effective countries:", getEffectiveCountries());
        console.log("Selected media:", getSelectedMediaTypes());
        console.log("Selected focus:", getSelectedPublicationFocus());
    }

    function resetFilters() {
        regionCheckboxes.forEach((checkbox) => {
            checkbox.checked = checkbox.value === "World";
        });

        Array.from(mediaCheckboxes).forEach((checkbox) => {
            const label = checkbox.parentElement.textContent.trim();
            checkbox.checked = label === "Newspapers" || label === "News Channels";
        });

        Array.from(publicationCheckboxes).forEach((checkbox) => {
            const label = checkbox.parentElement.textContent.trim();
            checkbox.checked = label === "International publications";
        });

        explicitCountrySelection = new Set();
        countrySearchInput.value = "";
        updateAllUI();
    }

    /* -----------------------------
       Region selection behavior
    ----------------------------- */
    regionCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            if (checkbox.value === "World" && checkbox.checked) {
                regionCheckboxes.forEach((cb) => {
                    if (cb !== checkbox) cb.checked = false;
                });
            } else if (checkbox.value !== "World" && checkbox.checked) {
                const worldCheckbox = Array.from(regionCheckboxes).find(
                    (cb) => cb.value === "World"
                );
                if (worldCheckbox) worldCheckbox.checked = false;
            }

            updateAllUI();
        });
    });

    /* -----------------------------
       Media / publication listeners
    ----------------------------- */
    [...mediaCheckboxes, ...publicationCheckboxes].forEach(input => {
        input.addEventListener("change", updateAllUI);
    });

    /* -----------------------------
       Country dropdown behavior
    ----------------------------- */
    countryDropdownBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        countryDropdown.classList.toggle("hidden");
    });

    countryDropdown.addEventListener("click", (event) => {
        event.stopPropagation();
    });

    document.addEventListener("click", () => {
        countryDropdown.classList.add("hidden");
    });

    countrySearchInput.addEventListener("input", () => {
        renderCountryList(countrySearchInput.value);
    });

    /* -----------------------------
       Clear filters
    ----------------------------- */
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener("click", resetFilters);
    }

    /* -----------------------------
       Initial render
    ----------------------------- */
    updateAllUI();
});