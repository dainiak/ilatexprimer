import { state } from './state.js';

export function highlightKeywordEverywhere(keyword) {
    if (!(keyword in state.keywordIndex))
        return;

    function highlightKeywordInFormulas(element, keyword) {
        if (state.mathRenderer === 'MathJax') {
            element.querySelectorAll('annotation[encoding="application/x-tex"]').forEach(e => {
                if (e.textContent.includes(keyword)) e.parentElement.classList.add('highlighted-blinking');
            });
        }
        else {
            element.querySelectorAll('.katex-html').forEach(e => {
                if (e.closest('.katex').querySelector('annotation[encoding="application/x-tex"]').textContent.includes(keyword)) {
                    e.classList.add('highlighted-blinking');
                }
            });
        }
    }

    let stepList = state.keywordIndex[keyword].steps;
    document.querySelectorAll('.collapse').forEach(element => {
        element.querySelectorAll('.highlighted-blinking').forEach(el => {
            el.classList.remove('highlighted-blinking');
            el.style.opacity = 1;
        });
        if (element.id && element.id.toString().match(/^step\d/) && !stepList.includes(element.id.toString().replace(/^step/, ''))) {
            element.querySelectorAll('[data-has-tooltip]').forEach(el => {
                const popover = bootstrap.Popover.getInstance(el);
                popover && popover.hide();
            });
            bootstrap.Collapse.getOrCreateInstance(element, { toggle: false }).hide();
        }
    });

    for (let i = 0; i < stepList.length; ++i) {
        let stepSelector = `#step${stepList[i]}`;
        let stepDOMnode = document.querySelector(stepSelector);
        if (!stepDOMnode) continue;
        bootstrap.Collapse.getOrCreateInstance(stepDOMnode, { toggle: false }).show();
        highlightKeywordInFormulas(stepDOMnode, keyword);

        let editorInstance = document.querySelector(`${stepSelector} .latex-source-area`).editorInstance || { findAll: () => {} };

        if (state.keywordIndex[keyword].synonyms) {
            state.keywordIndex[keyword].synonyms.forEach(synonym => highlightKeywordInFormulas(stepDOMnode, synonym));
            editorInstance.findAll(
                RegExp(
                    state.keywordIndex[keyword].synonyms.map(str => str.replace(/[\\$^[{}()?.*|]/g, $0 => '\\' + $0)).join('|'),
                    'gi'
                ), {
                    caseSensitive: false,
                    wholeWord: false,
                    regExp: true
                });
        }
        else {
            editorInstance.findAll(keyword, {
                caseSensitive: false,
                wholeWord: false,
            });
        }
    }
    const firstStep = document.getElementById(`step${stepList[0]}`);
    if (firstStep) {
        firstStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
