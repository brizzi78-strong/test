/* =====================================================================
   Caregiver resource library — filtering + search, rendered from
   /data/resources.json. Works on any static host (requires http(s),
   not file://, because it uses fetch()).
   ===================================================================== */
(function () {
  "use strict";

  var listEl = document.getElementById("resource-list");
  var filtersEl = document.getElementById("resource-filters");
  var searchEl = document.getElementById("resource-search");
  if (!listEl) return;

  var DATA = { categories: [], resources: [] };
  var state = { category: "all", query: "" };

  // Resolve the data path relative to the site root so it works from /resources/.
  var dataUrl = new URL("../data/resources.json", document.currentScript ? document.currentScript.src : location.href).href;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function labelFor(id) {
    var c = DATA.categories.find(function (c) { return c.id === id; });
    return c ? c.label : id;
  }

  function render() {
    var q = state.query.trim().toLowerCase();
    var items = DATA.resources.filter(function (r) {
      var catOk = state.category === "all" || r.category === state.category;
      var qOk = !q ||
        r.title.toLowerCase().indexOf(q) !== -1 ||
        r.description.toLowerCase().indexOf(q) !== -1 ||
        (r.type || "").toLowerCase().indexOf(q) !== -1;
      return catOk && qOk;
    });

    if (!items.length) {
      listEl.innerHTML = '<div class="resource-empty">No resources match yet. Try a different category or search term.</div>';
      return;
    }

    listEl.innerHTML = items.map(function (r) {
      return (
        '<article class="resource-item">' +
          '<h3><a href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">' + esc(r.title) + "</a></h3>" +
          "<p>" + esc(r.description) + "</p>" +
          '<div class="meta">' +
            '<span class="tag">' + esc(labelFor(r.category)) + "</span>" +
            (r.type ? '<span class="tag">' + esc(r.type) + "</span>" : "") +
            (r.region ? '<span class="tag">' + esc(r.region) + "</span>" : "") +
          "</div>" +
        "</article>"
      );
    }).join("");
  }

  function renderFilters() {
    if (!filtersEl) return;
    filtersEl.innerHTML = DATA.categories.map(function (c) {
      return '<button class="chip' + (c.id === state.category ? " active" : "") +
        '" data-cat="' + esc(c.id) + '">' + esc(c.label) + "</button>";
    }).join("");
    filtersEl.querySelectorAll(".chip").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.category = btn.getAttribute("data-cat");
        filtersEl.querySelectorAll(".chip").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        render();
      });
    });
  }

  if (searchEl) {
    searchEl.addEventListener("input", function () {
      state.query = searchEl.value;
      render();
    });
  }

  fetch(dataUrl)
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      DATA = data;
      renderFilters();
      render();
    })
    .catch(function (err) {
      listEl.innerHTML = '<div class="resource-empty">Could not load the resource library (' +
        esc(err.message) + "). Make sure the site is served over http, not opened as a local file.</div>";
    });
})();
