import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import ace from 'ace-builds';
import 'ace-builds/src-noconflict/mode-latex';
import 'ace-builds/src-noconflict/theme-chrome';
import 'ace-builds/src-noconflict/theme-clouds_midnight';
import 'ace-builds/src-noconflict/ext-static_highlight';
import { Popover } from 'bootstrap';

import { state } from './state.js';
import { setUILanguage, messages } from './i18n.js';
import Typeahead from './typeahead.js';
import { mathRendererFactory } from './math-renderer.js';
import { setLoadingStatus, processLessonContainer, loadExternalScriptsAndFinalize } from './lesson-loader.js';
import { highlightKeywordEverywhere } from './search.js';
import {
    checkedRadio,
    setAreaWidthRatio,
    initializeDarkThemeSwitch,
    setScrollToTopButton,
    setUIEventHandlers,
    handleLocationHash,
    buildTableOfContents,
} from './ui.js';

let typeaheadInstance = null;

function init() {
    state.aceHighlighter = ace.require('ace/ext/static_highlight');
    state.searchInput = document.getElementById('searchInput');
    state.loadingToastText = document.getElementById('loadingToastText');

    checkedRadio('typesetOnChange', state.typesetOnChange.toString());
    checkedRadio('singleAceInstance', state.singleAceInstance.toString());

    const savedRatio = localStorage.getItem('areaWidthRatio');
    if (savedRatio !== null) {
        checkedRadio('areaWidthRatio', savedRatio);
        setAreaWidthRatio(savedRatio);
    }

    function finalizer() {
        document.querySelectorAll('script[type="text/latexlesson"][toprocess]').forEach((element, index) => {
            element.removeAttribute('toprocess');
            setLoadingStatus(`${messages.processingSection} ${index}\u2026`);
            processLessonContainer(element, (index + 1).toString());
        });

        const keywordIndexList = Object.keys(state.keywordIndex);

        if (typeaheadInstance) {
            typeaheadInstance.options.source = keywordIndexList;
        } else {
            typeaheadInstance = new Typeahead(state.searchInput, {
                source: keywordIndexList,
                minLength: 2,
                limit: 10,
                delay: 150,
                onSelect: (keyword) => highlightKeywordEverywhere(keyword),
            });
        }

        buildTableOfContents();

        setLoadingStatus(messages.processingMathOnPage);

        mathRendererFactory(document.body, true, () => {
            setLoadingStatus(messages.finishedLoading);
            const loadingToast = document.getElementById('loadingToast');
            loadingToast.style.transition = 'opacity 1s';
            loadingToast.style.opacity = '0';
            setTimeout(() => {
                loadingToast.style.display = 'none';
            }, 1000);
        })();

        handleLocationHash();
    }

    function masterReload() {
        document.querySelectorAll('section.main-content').forEach((el) => (el.style.display = 'none'));
        const activeSection = document.querySelector(`section.main-content[lang="${state.displayLanguage}"]`);
        if (activeSection) activeSection.style.display = 'block';
        document
            .querySelectorAll(`section[lang="${state.displayLanguage}"] > script[type="text/latexlesson"][data-src]`)
            .forEach((s) => {
                s.setAttribute('toload', 'true');
            });
        state.keywordIndex = {};
        loadExternalScriptsAndFinalize(finalizer);
    }

    initializeDarkThemeSwitch();
    setScrollToTopButton();
    setUILanguage();
    setUIEventHandlers(masterReload);

    document.addEventListener('focusin', (e) => {
        const el = e.target.closest('.highlighted-blinking');
        if (el) {
            el.classList.remove('highlighted-blinking');
            el.style.opacity = 1;
        }
    });

    document.addEventListener('click', (e) => {
        const stepBody = e.target.closest('.step-body');
        if (stepBody) {
            stepBody.querySelectorAll('.highlighted-blinking').forEach((child) => {
                child.classList.remove('highlighted-blinking');
                child.style.transition = 'opacity 0.4s';
                child.style.opacity = 1;
            });
        }
    });

    document.addEventListener('hide.bs.collapse', (e) => {
        e.target.querySelectorAll('[data-has-tooltip]').forEach((tooltipEl) => {
            Popover.getInstance(tooltipEl)?.hide();
        });
    });

    masterReload();

    document.getElementById('searchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const kw = state.searchInput.value.trim();
        if (kw) highlightKeywordEverywhere(kw);
    });
}

if (document.readyState === 'complete') {
    init();
} else {
    window.addEventListener('load', init);
}
