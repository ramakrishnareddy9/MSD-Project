document.addEventListener("DOMContentLoaded", () => {
    const tabs = document.querySelectorAll(".Header div");
    const forms = document.querySelectorAll(".form");

    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            forms.forEach(f => f.classList.remove("active"));
            tab.classList.add("active");
            forms[index].classList.add("active");
        });
    });
    tabs[0].classList.add("active");
    forms[0].classList.add("active");
    
    const backToLogin = document.querySelector(".back-to-login");
    if (backToLogin) {
        backToLogin.addEventListener("click", (e) => {
            e.preventDefault();
            tabs[0].click();
        });
    }
});
