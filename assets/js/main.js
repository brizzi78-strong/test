/* =====================================================================
   The Cardinal Companion — shared site behavior
   ===================================================================== */
(function () {
  "use strict";

  /* ---- Mobile nav toggle ---- */
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  /* ---- Mark the current nav item active ---- */
  var here = location.pathname.replace(/index\.html$/, "").replace(/\/$/, "");
  document.querySelectorAll(".nav-links a").forEach(function (a) {
    var path = a.getAttribute("href");
    if (!path) return;
    var normalized = path.replace(/index\.html$/, "").replace(/\/$/, "");
    // Resolve relative links against current location for a fair comparison.
    try {
      var url = new URL(a.href);
      var target = url.pathname.replace(/index\.html$/, "").replace(/\/$/, "");
      if (target === here && target !== "") a.classList.add("active");
    } catch (e) { /* ignore */ }
  });

  /* ---- Footer year ---- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---- Newsletter / signup forms ----
     Progressive enhancement: if the form has a real `action` (e.g. a Kit,
     Mailchimp, or Buttondown endpoint) we let it submit normally. If it is
     still set to the placeholder, we intercept and show a friendly message
     so the page is fully functional during development. */
  document.querySelectorAll("form[data-signup]").forEach(function (form) {
    var status = form.querySelector(".form-status");
    var action = form.getAttribute("action") || "";
    var redirect = form.getAttribute("data-redirect") || "";
    var isPlaceholder = action === "" || action.indexOf("REPLACE_WITH") !== -1 || action === "#";

    form.addEventListener("submit", function (e) {
      var email = form.querySelector('input[type="email"]');
      if (email && !email.checkValidity()) return; // let native validation handle it

      if (isPlaceholder) {
        e.preventDefault();
        // If this form is a lead-magnet opt-in, send the visitor to the
        // delivery/thank-you page where the download lives.
        if (redirect) { window.location.href = redirect; return; }
        if (status) {
          status.className = "form-status show ok";
          status.textContent =
            "Thank you. This signup form isn't connected to an email provider yet — " +
            "once a provider endpoint is added, subscribers will flow through automatically.";
        }
        form.reset();
      }
      // Otherwise: allow the native POST to the configured provider. For
      // lead-magnet forms, set the provider's redirect/thank-you URL to the
      // delivery page so the experience matches.
    });
  });
})();
