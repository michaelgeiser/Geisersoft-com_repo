// Client-side include: replaces <div data-include="/path/file.html"></div>
// with the fetched HTML. Absolute paths keep it working from any page depth.
document.querySelectorAll('[data-include]').forEach(function (el) {
    fetch(el.getAttribute('data-include'))
        .then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); })
        .then(function (html) { el.outerHTML = html; })
        .catch(function (e) { console.error('Include failed:', el.getAttribute('data-include'), e); });
});

// Fills <span data-last-modified></span> with the page's Last-Modified header
// (via document.lastModified), formatted like "November 18, 2026".
document.querySelectorAll('[data-last-modified]').forEach(function (el) {
    var d = new Date(document.lastModified);
    if (!isNaN(d)) {
        el.textContent = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
});
