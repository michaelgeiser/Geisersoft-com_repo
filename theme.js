(function () {
    var root = document.documentElement;
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (prefersDark ? 'dark' : 'light');
    root.setAttribute('data-theme', theme);

    function updateToggle(btn, theme) {
        var isDark = theme === 'dark';
        btn.setAttribute('aria-checked', isDark ? 'true' : 'false');
        btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    }

    document.addEventListener('DOMContentLoaded', function () {
        var toggles = document.querySelectorAll('.theme-toggle');
        toggles.forEach(function (btn) {
            updateToggle(btn, root.getAttribute('data-theme'));
            btn.addEventListener('click', function () {
                var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                root.setAttribute('data-theme', next);
                localStorage.setItem('theme', next);
                toggles.forEach(function (b) { updateToggle(b, next); });
            });
        });
    });
})();
