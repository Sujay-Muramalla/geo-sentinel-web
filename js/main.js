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