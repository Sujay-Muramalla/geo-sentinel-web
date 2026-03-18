document.addEventListener("DOMContentLoaded", () => {
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
});


// Country dropdown toggle
const dropdownBtn = document.querySelector(".country-dropdown-btn");
const dropdown = document.getElementById("country-dropdown");

dropdownBtn.addEventListener("click", () => {
    dropdown.classList.toggle("hidden");
});

// Close dropdown on outside click
document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && !dropdownBtn.contains(e.target)) {
        dropdown.classList.add("hidden");
    }
});