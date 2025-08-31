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
    loader: {
        load: [
            "input/tex/extensions/autoload",
            "input/tex/extensions/html",
            "input/tex/extensions/newcommand",
            "input/tex/extensions/noerrors",
            "input/tex/extensions/noundefined",
            "input/tex/extensions/texhtml",
            "input/tex/extensions/unicode",
            'output/svg'
        ]
    },
    startup: {
        typeset: false,
        ready: async () => {
            await MathJax.startup.defaultReady();
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