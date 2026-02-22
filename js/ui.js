import { Popover, Collapse } from 'bootstrap';
import { state } from './state.js';
import { attachAce } from './editor.js';
import { setUILanguage } from './i18n.js';
import { highlightKeywordEverywhere } from './search.js';

export function checkedRadio(name, value) {
    const el = document.querySelector(`input[type=radio][name="${name}"][value="${value}"]`);
    if (el) el.checked = true;
}

export function onRadioChange(name, handler) {
    document.querySelectorAll(`input[type=radio][name="${name}"]`).forEach((el) => {
        el.addEventListener('change', handler);
    });
}

export function setAreaWidthRatio(ratioCode) {
    const sourceAreas = document.querySelectorAll('.latex-source-area');
    const resultAreas = document.querySelectorAll('.result-display-area');

    [...sourceAreas, ...resultAreas].forEach((el) => {
        const toRemove = [];
        el.classList.forEach((cls) => {
            if (/^col-md-\d+$/.test(cls)) toRemove.push(cls);
        });
        toRemove.forEach((cls) => el.classList.remove(cls));
    });

    if (ratioCode !== '0') {
        sourceAreas.forEach((el) => {
            el.classList.add(`col-md-${ratioCode}`);
            el.style.display = '';
            el.dispatchEvent(new Event('resize'));
        });
        resultAreas.forEach((el) => {
            el.classList.add(`col-md-${12 - parseInt(ratioCode)}`);
        });
    } else {
        sourceAreas.forEach((el) => {
            if (!el.closest('.force-source-visibility')) el.style.display = 'none';
        });
        resultAreas.forEach((el) => {
            if (!el.closest('.force-source-visibility')) el.classList.add('col-md-12');
        });
    }
}

export function initializeDarkThemeSwitch() {
    const darkSwitch = document.getElementById('darkSwitch');
    darkSwitch.checked = state.displayTheme === 'dark';

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-bs-theme', theme);
        darkSwitch.checked = theme === 'dark';
        state.aceEditorOptions.theme = theme === 'dark' ? 'ace/theme/clouds_midnight' : 'ace/theme/chrome';
        document
            .querySelectorAll('.latex-source-area')
            .forEach((element) => element.editorInstance?.setTheme(state.aceEditorOptions.theme));
    }

    function setTheme(theme) {
        state.displayTheme = theme;
        localStorage.setItem('theme', state.displayTheme);
        checkedRadio('theme', state.displayTheme);
        applyTheme(theme);
    }

    setTheme(state.displayTheme);
    darkSwitch.addEventListener('change', () => {
        setTheme(darkSwitch.checked ? 'dark' : 'light');
    });
    onRadioChange('theme', (e) => setTheme(e.target.value.toString()));
}

export function setScrollToTopButton() {
    let btn = document.getElementById('scrollToTop');
    window.addEventListener('scroll', () => {
        btn.style.display = document.body.scrollTop > 20 || document.documentElement.scrollTop > 20 ? 'block' : 'none';
    });
    btn.addEventListener('click', () => (document.body.scrollTop = document.documentElement.scrollTop = 0));
}

export function setUIEventHandlers(masterReload) {
    onRadioChange('singleAceInstance', (e) => {
        state.singleAceInstance = e.target.value === 'true';
        localStorage.setItem('singleAceInstance', state.singleAceInstance);
        if (state.singleAceInstance)
            document.querySelectorAll('.latex-source-area').forEach((el) => el.editorInstance?.customDestroyer());
        else document.querySelectorAll('.latex-source-area').forEach((el) => attachAce(el));
    });

    onRadioChange('typesetOnChange', (e) => {
        state.typesetOnChange = e.target.value === 'true';
        localStorage.setItem('typesetOnChange', state.typesetOnChange);
    });

    onRadioChange('areaWidthRatio', (e) => {
        localStorage.setItem('areaWidthRatio', e.target.value.toString());
        setAreaWidthRatio(e.target.value.toString());
    });

    function reloadWithLanguage(language) {
        state.displayLanguage = language;
        setUILanguage(state.displayLanguage);
        localStorage.setItem('displayLanguage', state.displayLanguage);
        masterReload();
    }

    onRadioChange('displayLanguage', (e) => reloadWithLanguage(e.target.value.toString()));

    document.querySelectorAll('.language-flag-btn').forEach((el) => {
        el.addEventListener('click', (e) => reloadWithLanguage(e.currentTarget.dataset['language']));
    });

    document.getElementById('btnCollapseAll').addEventListener('click', () => {
        document.body.querySelectorAll('[data-has-tooltip]').forEach((el) => {
            Popover.getInstance(el)?.hide();
        });
        document.querySelectorAll('.step-body.collapse').forEach((el) => {
            Collapse.getOrCreateInstance(el, { toggle: false }).hide();
        });
    });

    document.getElementById('btnExpandAll').addEventListener('click', () => {
        document.querySelectorAll('.step-body.collapse').forEach((el) => {
            Collapse.getOrCreateInstance(el, { toggle: false }).show();
        });
    });

    document.getElementById('btnResetLocalStorage').addEventListener('click', () => {
        localStorage.clear();
        location.reload();
    });

    document.querySelectorAll('.social-share a').forEach((el) => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            window.open(el.href, '', 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=600,width=600');
        });
    });
}

export function handleLocationHash() {
    if (!window.location.hash) return;
    let stepId = window.location.hash.replace(/^#(step|stepheading)?(?=\d)/, '');
    if (document.getElementById(`stepheading${stepId}`)) {
        const stepEl = document.querySelector(`#step${stepId}.collapse`);
        Collapse.getOrCreateInstance(stepEl, { toggle: false }).show();
        window.location.hash = '';
        window.location.hash = `#stepheading${stepId}`;
        document.getElementById(`step${stepId}`).scrollIntoView();
    } else {
        let kw = window.location.hash.substring(1);
        if (kw in state.keywordIndex || `\\${kw}` in state.keywordIndex) {
            if (!(kw in state.keywordIndex)) {
                kw = `\\${kw}`;
            }
            state.searchInput.value = kw;
            highlightKeywordEverywhere(kw);
        }
    }
}

export function buildTableOfContents() {
    const visibleSection = document.querySelector('section.main-content[style*="block"]');
    if (!visibleSection) return;

    const tocContainer = document.getElementById('tableofcontents');
    tocContainer.textContent = '';

    const rootUl = document.createElement('ul');
    let currentSectionLi = null;
    let subUl = null;

    function addTocLink(target, headingSourceEl) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#';
        a.className = 'toc-link';
        for (const child of headingSourceEl.childNodes) {
            a.appendChild(child.cloneNode(true));
        }
        a.addEventListener('click', (e) => {
            e.preventDefault();
            const stepEl = document.querySelector(`#step${target}.collapse`);
            if (!stepEl) return;
            Collapse.getOrCreateInstance(stepEl, { toggle: false }).show();
            history.replaceState(null, '', `#stepheading${target}`);
            const heading = document.getElementById(`stepheading${target}`);
            if (heading) {
                heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
        li.appendChild(a);
        return li;
    }

    visibleSection.querySelectorAll('h2, div.card-header').forEach((e) => {
        if (e.tagName.toLowerCase() === 'div') {
            const target = e.getAttribute('data-bs-target').replace('#step', '');
            const li = addTocLink(target, e.querySelector('h3'));

            if (currentSectionLi) {
                if (!subUl) {
                    subUl = document.createElement('ul');
                    currentSectionLi.appendChild(subUl);
                }
                subUl.appendChild(li);
            } else {
                rootUl.appendChild(li);
            }
        } else {
            currentSectionLi = document.createElement('li');
            const strong = document.createElement('strong');
            for (const child of e.childNodes) {
                strong.appendChild(child.cloneNode(true));
            }
            currentSectionLi.appendChild(strong);
            rootUl.appendChild(currentSectionLi);
            subUl = null;
        }
    });

    tocContainer.appendChild(rootUl);
}
