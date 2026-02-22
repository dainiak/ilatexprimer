export const MONOSPACE_FONT_FAMILY = 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

function getLocalStorageItem(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function detectLanguage() {
    try {
        if (navigator.languages && navigator.languages.includes('ru')) return 'ru';
    } catch {
        // ignore
    }
    return 'en';
}

export const state = {
    displayLanguage: getLocalStorageItem('displayLanguage') || detectLanguage(),
    displayTheme:
        getLocalStorageItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    typesetOnChange:
        getLocalStorageItem('typesetOnChange') !== null ? getLocalStorageItem('typesetOnChange') === 'true' : true,
    singleAceInstance: getLocalStorageItem('singleAceInstance') === 'true' || false,
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
