export const MONOSPACE_FONT_FAMILY = 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

export const state = {
    displayLanguage: localStorage.getItem('displayLanguage') || (navigator.languages.includes('ru') ? 'ru' : 'en'),
    displayTheme:
        localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    typesetOnChange:
        localStorage.getItem('typesetOnChange') !== null ? localStorage.getItem('typesetOnChange') === 'true' : true,
    singleAceInstance: localStorage.getItem('singleAceInstance') === 'true' || false,
    startCollapsed: true,
    keywordIndex: {},
    aceEditorOptions: {
        theme: 'ace/theme/chrome',
        mode: 'ace/mode/latex',
        minLines: 3,
        maxLines: Infinity,
        fontFamily: MONOSPACE_FONT_FAMILY,
        fontSize: '90%',
        wrap: true,
        showGutter: true,
        fadeFoldWidgets: false,
        showFoldWidgets: false,
        showPrintMargin: false,
    },
    aceHighlighter: null,
    searchInput: null,
    loadingToastText: null,
    loadAbortController: null,
};
