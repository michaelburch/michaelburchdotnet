(function () {
  var SNIPPET_LENGTH = 420;

  var scriptEl = document.querySelector("script[data-index-url]");
  var indexUrl = scriptEl
    ? scriptEl.getAttribute("data-index-url")
    : "/search_index.en.json";

  function currentQuery() {
    return (new URLSearchParams(window.location.search).get("query") || "").trim();
  }

  // Builds a snippet centred on the first matching term rather than the lead paragraph.
  function snippet(body, query) {
    if (!body) return "";
    var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    var lower = body.toLowerCase();
    var at = -1;
    for (var i = 0; i < terms.length && at < 0; i++) {
      at = lower.indexOf(terms[i]);
    }
    if (at < 0) return body.slice(0, SNIPPET_LENGTH) + "\u2026";
    var start = Math.max(0, at - SNIPPET_LENGTH / 3);
    var text = body.slice(start, start + SNIPPET_LENGTH);
    return (start > 0 ? "\u2026" : "") + text + "\u2026";
  }

  function formatDate(value) {
    if (!value) return "";
    var d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  function buildResult(doc, query) {
    var item = document.createElement("li");

    var formatted = formatDate(doc.date);
    if (formatted) {
      var meta = document.createElement("span");
      meta.className = "post-meta";
      var time = document.createElement("time");
      time.setAttribute("datetime", doc.date);
      time.textContent = formatted;
      meta.appendChild(time);
      item.appendChild(meta);
    }

    var h2 = document.createElement("h2");
    var link = document.createElement("a");
    link.className = "post-link";
    // doc.id is absolute against config.base_url, so it would leave the current host.
    link.href = doc.path || "/";
    link.textContent = doc.title;
    h2.appendChild(link);
    item.appendChild(h2);

    var p = document.createElement("p");
    p.textContent = snippet(doc.body, query);
    item.appendChild(p);

    return item;
  }

  function run() {
    var titleEl = document.getElementById("results-title");
    var resultsEl = document.getElementById("search-results");
    if (!resultsEl) return;

    var query = currentQuery();
    if (query.length < 2) {
      window.location.replace("/");
      return;
    }
    titleEl.textContent = "Search Results for '" + query + "'";

    fetch(indexUrl)
      .then(function (response) {
        if (!response.ok) throw new Error("index unavailable");
        return response.json();
      })
      .then(function (data) {
        var index = elasticlunr.Index.load(data);
        var results = index.search(query, {
          bool: "AND",
          expand: true,
          fields: {
            title: { boost: 3 },
            description: { boost: 2 },
            body: { boost: 1 },
          },
        });

        resultsEl.textContent = "";
        if (!results.length) {
          var empty = document.createElement("p");
          empty.textContent = "No results found";
          resultsEl.appendChild(empty);
          return;
        }
        results.forEach(function (result) {
          var doc = index.documentStore.getDoc(result.ref);
          if (doc) resultsEl.appendChild(buildResult(doc, query));
        });
      })
      .catch(function () {
        resultsEl.textContent = "";
        var failed = document.createElement("p");
        failed.textContent = "Search is unavailable right now.";
        resultsEl.appendChild(failed);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
