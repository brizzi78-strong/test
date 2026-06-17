// Set the current year in footers
document.querySelectorAll('#year').forEach(function (el) {
  el.textContent = new Date().getFullYear();
});

// The newsletter form posts directly to Kit (see index.html), so no JS is
// required to capture signups. This file only handles small enhancements.
