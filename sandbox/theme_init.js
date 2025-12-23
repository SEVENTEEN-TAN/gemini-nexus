(function() {
    try {
        const params = new URLSearchParams(window.location.search);
        const theme = params.get('theme');
        const lang = params.get('lang');

        // Apply Theme
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (theme === 'dark' || (theme === 'system' && systemDark)) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }

        // Apply Language
        if (lang && lang !== 'system') {
            document.documentElement.lang = lang;
        } else if (!lang || lang === 'system') {
            if (navigator.language.startsWith('zh')) {
                 document.documentElement.lang = 'zh';
            }
        }
    } catch(e) {}
})();