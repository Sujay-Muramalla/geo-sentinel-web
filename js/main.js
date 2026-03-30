document.addEventListener("DOMContentLoaded", () => {
    // -----------------------------
    // ELEMENTS
    // -----------------------------
    const expandButtons = document.querySelectorAll(".expand-btn");
    const clearFiltersBtn = document.getElementById("clear-filters-btn");

    const countryDropdownBtn = document.getElementById("country-dropdown-btn");
    const countryDropdown = document.getElementById("country-dropdown");
    const countrySearchInput = document.getElementById("country-search-input");
    const countryList = document.getElementById("country-list");
    const selectedCountriesContainer = document.getElementById("selected-countries");
    const scopeChipsContainer = document.getElementById("scope-chips");

    const resultCards = Array.from(document.querySelectorAll(".result-card"));
    const resultsMiniSummary = document.getElementById("results-mini-summary");

    // -----------------------------
    // COUNTRY DATA BY REGION
    // -----------------------------
    const countriesByRegion = {
        europe: ["uk", "germany", "france", "italy", "spain", "poland"],
        asia: ["china", "taiwan", "japan", "india", "south korea", "singapore"],
        "north-america": ["us", "canada", "mexico"],
        africa: ["egypt", "kenya", "south africa", "nigeria", "morocco"],
        "middle-east": ["qatar", "saudi arabia", "uae", "israel", "iran", "turkey"],
        "south-america": ["brazil", "argentina", "chile", "colombia", "peru"],
        oceania: ["australia", "new zealand"],
    };

    // -----------------------------
    // HELPERS
    // -----------------------------
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

    // -----------------------------
    // EXPAND / COLLAPSE FILTER GROUPS
    // -----------------------------
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

    // -----------------------------
    // COUNTRY DROPDOWN
    // -----------------------------
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

    // -----------------------------
    // ACTIVE SCOPE CHIPS
    // -----------------------------
    function updateScopeChips() {
        if (!scopeChipsContainer) return;

        const selectedRegions = getSelectedRegions();
        const selectedCountries = getSelectedCountries();

        const chips = [];

        if (selectedRegions.includes("world") || selectedRegions.length === 0) {
            chips.push("World");
        } else {
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

    // -----------------------------
    // WORLD CHECKBOX RULE
    // -----------------------------
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

    // -----------------------------
    // RESULT CARD FILTERING
    // -----------------------------
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

    function updateResultsSummary(visibleCount, selectedRegions, selectedCountries) {
        if (!resultsMiniSummary) return;

        let regionLabel = "world";

        if (selectedRegions.length > 0 && !selectedRegions.includes("world")) {
            regionLabel = selectedRegions
                .map((region) => titleCase(region.replace(/-/g, " ")))
                .join(", ");
        }

        const countryLabel =
            selectedCountries.length > 0
                ? `${selectedCountries.length} countries`
                : "all countries";

        resultsMiniSummary.textContent = `${visibleCount} sources · mixed sentiment · ${countryLabel} · ${regionLabel}`;
    }

    function filterResultCards() {
        const selectedRegions = getSelectedRegions();
        const selectedCountries = getSelectedCountries();
        const selectedMediaTypes = getCheckedValuesFromSection("Media Type");
        const selectedFocusValues = getCheckedValuesFromSection("Publication Focus");

        let visibleCount = 0;

        resultCards.forEach((card) => {
            const cardRegion = normalizeText(card.dataset.region || "");
            const cardCountries = parseDatasetList(card.dataset.countries);
            const cardMediaTypes = parseDatasetList(card.dataset.mediaType);
            const cardFocusValues = parseDatasetList(card.dataset.focus);

            const matchesRegion = cardMatchesRegions(cardRegion, selectedRegions);
            const matchesCountry = cardMatchesCountries(cardCountries, selectedCountries);
            const matchesMedia = cardMatchesMediaTypes(cardMediaTypes, selectedMediaTypes);
            const matchesFocus = cardMatchesFocus(cardFocusValues, selectedFocusValues);

            const shouldShow = matchesRegion && matchesCountry && matchesMedia && matchesFocus;

            card.style.display = shouldShow ? "" : "none";

            if (shouldShow) {
                visibleCount += 1;
            }
        });

        updateResultsSummary(visibleCount, selectedRegions, selectedCountries);
    }

    // -----------------------------
    // CLEAR FILTERS
    // -----------------------------
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

    // -----------------------------
    // BIND FILTER EVENTS
    // -----------------------------
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

    // -----------------------------
    // INIT
    // -----------------------------
    function init() {
        bindExpandButtons();
        bindCountryDropdown();
        bindFilterEvents();
        renderCountryDropdown();
        updateCountryButtonLabel();
        updateScopeChips();
        filterResultCards();
    }

    init();
});