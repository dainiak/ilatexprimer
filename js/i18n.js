var I18N_STRINGS_ALL = {
    "ru": {
        "document.title": "Интерактивное введение в LaTeX",

        "loadingToast": "Идёт загрузка страницы…",
        "githubForkLink": "Проект на GitHub",
        "collapseExpandSteps": "Свернуть/развернуть все шаги урока",
        "mainTitle": "Интерактивное введение в \\( \\LaTeX \\)",
        "headerAbout": "Об уроке",
        "contentAbout": "<p>Урок задуман, свёрстан и запрограммирован <a rel=\"author\" href=\"http://www.dainiak.com\">Александром Дайняком</a>, доцентом <a href=\"https://mipt.ru/\">МФТИ</a>. Почтовый адрес для связи: <code>dainiak@gmail.com</code></p><p>Урок создан с использованием <a href=\"https://www.mathjax.org/\">MathJax</a>, <a href=\"https://khan.github.io/KaTeX/\">KaTeX</a>, <a href=\"https://ace.c9.io\">ACE Editor</a>, <a href=\"http://getbootstrap.com/\">Bootstrap</a>, <a href=\"https://jquery.com/\">jQuery</a>. В перечисленных инструментах и в тонкостях использования \\(\\LaTeX\\) автору помогали разбираться форумы <a href=\"http://stackoverflow.com/\">Stack Overflow</a> и <a href=\"http://tex.stackexchange.com/\">LaTeX Stack Exchange</a>. Сильно облегчали написание и тестирование кода редактор <a href=\"https://www.jetbrains.com/pycharm/\">PyCharm</a> и панель разработчика в <a href=\"https://www.google.com/chrome/\">Chrome</a>. Хостинг проекта осуществляется на <a href=\"https://github.com/dainiak/ilatexprimer\">GitHub</a>.</p>",
        "btnCollapseAll": "Свернуть все шаги",
        "btnExpandAll": "Развернуть все шаги",
        "headerKeywordSearch": "Поиск по ключевым словам",
        "headerOptions": "Дополнительные настройки",
        "headerMathEngine": "Движок, используемый для отображения формул при редактировании кода",
        "optionMathEngineMathJax": "MathJax (медленнее, но вернее)",
        "optionMathEngineKaTeX": "KaTeX (быстрее, но не всё будет корректно отображаться)",
        "headerInteractivityMode": "Когда отображать то, что набрано в окне редактирования кода",
        "optionInteractivityLow": "Только по нажатии <code>Ctrl+Enter</code> в редакторе (надёжнее)",
        "optionInteractivityHigh": "При любых изменениях кода в редакторе (веселее)",
        "headerEditorInstances": "Количество окон редактора кода",
        "optionEditorMultiple": "По одному редактору для каждого шага (удобнее)",
        "optionEditorSingle": "Редактор только для активного шага (меньшая нагрузка на браузер)",
        "headerSourceResultRatio": "Отношение ширин окон с текстом и исходным кодом (на широком экране)",
        "optionNoSourseCode": "без кода",

        "confirmation.SwitchToKaTeX": "Рекомендуется в этом случае использовать для отображения формул KaTeX. Переключиться на KaTeX?",
        "confirmation.CtrlEnter": "Рекомендуется при этом переключиться в режим отображения только по Ctrl+Enter. Переключиться?",
        "confirmation.KaTeXLowerCompatibility": "Отображение формул будет хуже соответствовать «настоящему» LaTeX. Вы уверены?",

        "msg.UnbalancedParenthesis": "((Несбалансированные скобки!))",
        "msg.KatexUnableToDisplayFormula": "(KaTeX не смог отобразить эту формулу)",
        "msg.ProcessingMathOnPage": "Идёт отрисовка формул. На медленном компьютере может зянять десятки секунд…",
        "msg.LoadingSection": "Загружается раздел",
        "msg.ProcessingSection": "Обрабатывается раздел",
        "msg.UnableToLoadThisStep": "Не удалось загрузить этот шаг",
        "msg.FinishedLoading": "Загрузка завершена. Поехали!",
    },
    "en": {

    }
};

var browserLanguage = navigator.languages.indexOf('ru') >= 0 ? 'ru' : 'en';

var I18N_STRINGS = I18N_STRINGS_ALL[browserLanguage];

var confirmationSwitchToKaTeX = I18N_STRINGS["confirmation.SwitchToKaTeX"] || "It is recommended to use KaTeX for math display in this case. Do you want to switch to KaTeX?";
var confirmationCtrlEnter = I18N_STRINGS["confirmation.CtrlEnter"] || "It is recommended to switch to “Crtl+Enter only” update mode. Make the switch?";
var confirmationKaTeXLowerCompatibility = I18N_STRINGS["confirmation.KaTeXLowerCompatibility"] || "KaTeX supports a smaller subset of LaTeX commands. Are you sure you want to switch?";
var msgUnbalancedParenthesis = I18N_STRINGS["msg.UnbalancedParenthesis"] || "((Unbalanced parenthesis))";
var msgKatexUnableToDisplayFormula = I18N_STRINGS["msg.KatexUnableToDisplayFormula"] || "(KaTeX was unable to process the formula)";
var msgProcessingMathOnPage = I18N_STRINGS["msg.ProcessingMathOnPage"] || "Processing math of page. On slow computer this may take a while…";
var msgLoadingSection = I18N_STRINGS["msg.LoadingSection"] || "Loading section";
var msgProcessingSection = I18N_STRINGS["msg.ProcessingSection"] || "Processing section";
var msgUnableToLoadThisStep = I18N_STRINGS["msg.UnableToLoadThisStep"] || "Unable to load this step";
var msgFinishedLoading = I18N_STRINGS["msg.FinishedLoading"] || "Finished loading. Have fun!";