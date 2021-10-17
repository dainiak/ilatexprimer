window.MathJax = {
    options: {
        enableMenu: false,
        renderActions: {
            addMenu: [0, '', '']
        },
        skipHtmlTags: [
            "svg",
            "script",
            "noscript",
            "style",
            "textarea",
            "pre",
            "code"
        ]
    },
    startup: {
        typeset: false,
        ready: () => {
            MathJax.startup.defaultReady();
        }
    },
    tex: {
        processEnvironments: true,
        processRefs: true,
        tags: 'ams',
        tagSide: 'right',
        useLabelIds: true,
        macros: {
            par: '',
            showSourceOnClick: '',
            hrf: ['{\\href{#1}{#2}}', 2],           // need this to bypass pre-mathjax \href command processing
            ttp: ['{\\href{[tooltip]#1}{#2}}', 2]
        }
    }
};