const I18N_STRINGS_ALL = {
    ru: {
        btnCollapseAll: 'Свернуть все шаги',
        btnExpandAll: 'Развернуть все шаги',
        btnResetLocalStorage: 'Сбросить прогресс и настройки',
        collapseExpandSteps: 'Свернуть/развернуть все шаги урока',
        'confirmation.CtrlEnter':
            'Рекомендуется при этом переключиться в режим отображения только по Ctrl+Enter. Переключиться?',
        contentAbout:
            '<p>Урок задуман, свёрстан и запрограммирован <a rel="author" href="https://www.dainiak.com">Александром Дайняком</a>. Почтовый адрес для связи: <code>dainiak@gmail.com</code></p><p>Урок создан с использованием <a href="https://www.mathjax.org/">MathJax</a>, <a href="https://ace.c9.io">ACE Editor</a>, <a href="https://getbootstrap.com/">Bootstrap</a>. В перечисленных инструментах и в тонкостях использования \\(\\LaTeX\\) автору помогали разбираться форумы <a href="https://stackoverflow.com/">Stack Overflow</a> и <a href="https://tex.stackexchange.com/">LaTeX Stack Exchange</a>.</p>',
        'document.title': 'Интерактивное введение в LaTeX',
        githubForkLink: 'Проект на GitHub',
        headerAbout: '<a href="#">Об уроке</a>',
        headerDisplayLanguage: 'Язык отображения',
        headerEditorInstances: 'Количество окон редактора кода',
        headerInteractivityMode: 'Когда отображать то, что набрано в окне редактирования кода',
        headerOptions: 'Дополнительные настройки',
        headerSourceResultRatio: 'Отношение ширин окон с текстом и исходным кодом (на широком экране)',
        headerTOC: '<a href="#">Оглавление</a>',
        headerTheme: 'Тема оформления',
        loadingToastText: 'Идёт загрузка страницы…',
        mainTitle: 'Интерактивное введение в \\( \\LaTeX \\)',
        'msg.FinishedLoading': 'Загрузка завершена. Поехали!',
        'msg.LoadingSection': 'Загружается раздел',
        'msg.ProcessingMathOnPage': 'Идёт отрисовка формул. На медленном компьютере может занять десятки секунд…',
        'msg.ProcessingSection': 'Обрабатывается раздел',
        'msg.UnableToLoadThisStep': 'Не удалось загрузить этот шаг',
        'msg.UnbalancedParenthesis': '((Несбалансированные скобки!))',
        optionEditorMultiple: 'По одному редактору для каждого шага (удобнее)',
        optionEditorSingle: 'Редактор только для активного шага (меньшая нагрузка на браузер)',
        optionInteractivityHigh: 'При любых изменениях кода в редакторе (веселее)',
        optionInteractivityLow: 'Только по нажатии <code>Ctrl+Enter</code> в редакторе (может быть надёжнее)',
        optionLanguageEN: 'english',
        optionLanguageRU: 'русский',
        optionNoSourceCode: 'без кода',
        optionThemeDark: 'тёмная',
        optionThemeLight: 'светлая',
        searchInputLabel: 'Поиск команд LaTeX',
        'msg.SearchResults': 'Найдено шагов: {count}',
    },
    en: {
        btnCollapseAll: 'Collapse all',
        btnExpandAll: 'Expand all',
        btnResetLocalStorage: 'Reset progress and settings',
        collapseExpandSteps: 'Collapse/expand all steps',
        'confirmation.CtrlEnter':
            'It is recommended to switch to \u201cCtrl+Enter only\u201d update mode. Make the switch?',
        contentAbout:
            '<p>Developed by <a rel="author" href="https://www.dainiak.com">Alex Dainiak</a>. Email: <code>dainiak@gmail.com</code></p><p>The lesson is powered by <a href="https://www.mathjax.org/">MathJax</a>, <a href="https://ace.c9.io">ACE Editor</a>, <a href="https://getbootstrap.com/">Bootstrap</a>. While preparing this lesson, the author benefited much from <a href="https://stackoverflow.com/">Stack Overflow</a> and <a href="https://tex.stackexchange.com/">LaTeX Stack Exchange</a>.</p>',
        'document.title': 'Interactive Introduction to LaTeX',
        githubForkLink: 'Fork me on GitHub',
        headerAbout: '<a href="#">About</a>',
        headerDisplayLanguage: 'Language',
        headerEditorInstances: 'Number of source code editor instances',
        headerInteractivityMode: 'When to process the LaTeX source code',
        headerOptions: 'Settings',
        headerSourceResultRatio: 'Result/source code window ratio',
        headerTOC: '<a href="#">Table of Contents</a>',
        headerTheme: 'Theme',
        loadingToastText: 'Loading\u2026',
        mainTitle: 'Interactive Introduction to \\( \\LaTeX \\)',
        'msg.FinishedLoading': 'Finished loading. Have fun!',
        'msg.LoadingSection': 'Loading section',
        'msg.ProcessingMathOnPage': 'Processing math on page. On slow computer this may take a while\u2026',
        'msg.ProcessingSection': 'Processing section',
        'msg.UnableToLoadThisStep': 'Unable to load this step',
        'msg.UnbalancedParenthesis': '((Unbalanced parentheses!))',
        optionEditorMultiple: 'Separate editor per each step (more convenient)',
        optionEditorSingle: 'Single editor instance (lower memory load)',
        optionInteractivityHigh: 'On any update of the source code (more fun)',
        optionInteractivityLow: 'Only when <code>Ctrl+Enter</code> is pressed in the source code editor (more stable)',
        optionLanguageEN: 'english',
        optionLanguageRU: 'русский',
        optionNoSourceCode: 'no source code',
        optionThemeDark: 'dark',
        optionThemeLight: 'light',
        searchInputLabel: 'Search LaTeX commands',
        'msg.SearchResults': '{count} steps found',
    },
};

export const messages = {
    unbalancedParenthesis: '((Unbalanced parentheses))',
    processingMathOnPage: '',
    loadingSection: '',
    processingSection: '',
    unableToLoadThisStep: '',
    finishedLoading: '',
    searchResults: '',
};

export function setUILanguage(language = null) {
    if (!language)
        language = localStorage.getItem('displayLanguage') || (navigator.languages.includes('ru') ? 'ru' : 'en');

    const strings = I18N_STRINGS_ALL[language];

    messages.unbalancedParenthesis = strings['msg.UnbalancedParenthesis'] || '((Unbalanced parentheses))';
    messages.processingMathOnPage = strings['msg.ProcessingMathOnPage'];
    messages.loadingSection = strings['msg.LoadingSection'];
    messages.processingSection = strings['msg.ProcessingSection'];
    messages.unableToLoadThisStep = strings['msg.UnableToLoadThisStep'];
    messages.finishedLoading = strings['msg.FinishedLoading'];
    messages.searchResults = strings['msg.SearchResults'];

    document.documentElement.lang = language;
    document.title = strings['document.title'] ? strings['document.title'] : document.title;

    for (const paramId in strings) {
        if (!paramId.includes('.')) {
            const el = document.getElementById(paramId);
            if (el) el.innerHTML = strings[paramId];
        }
    }
    const langRadio = document.querySelector(`input[type=radio][name=displayLanguage][value=${language}]`);
    if (langRadio) langRadio.checked = true;
}
