import { state } from './state.js';
import { attachAce } from './editor.js';
import { setUILanguage } from './i18n.js';
import { highlightKeywordEverywhere } from './search.js';

export function checkedRadio(name, value) {
    const el = document.querySelector(`input[type=radio][name="${name}"][value="${value}"]`);
    if (el) el.checked = true;
}

export function onRadioChange(name, handler) {
    document.querySelectorAll(`input[type=radio][name="${name}"]`).forEach(el => {
        el.addEventListener('change', handler);
    });
}

export function setAreaWidthRatio(ratioCode) {
    document.querySelectorAll('.latex-source-area, .result-display-area').forEach(el => {
        const toRemove = [];
        el.classList.forEach(cls => { if (/^col-md-\d+$/.test(cls)) toRemove.push(cls); });
        toRemove.forEach(cls => el.classList.remove(cls));
    });

    if (ratioCode !== '0') {
        document.querySelectorAll('.latex-source-area').forEach(el => {
            el.classList.add(`col-md-${ratioCode}`);
            el.style.display = '';
            el.dispatchEvent(new Event('resize'));
        });
        document.querySelectorAll('.result-display-area').forEach(el => {
            el.classList.add(`col-md-${12 - parseInt(ratioCode)}`);
        });
    }
    else {
        document.querySelectorAll('.latex-source-area').forEach(el => {
            if (!el.closest('.force-source-visibility')) el.style.display = 'none';
        });
        document.querySelectorAll('.result-display-area').forEach(el => {
            if (!el.closest('.force-source-visibility')) el.classList.add('col-md-12');
        });
    }
}

export function initializeDarkThemeSwitch() {
    const darkSwitch = document.getElementById('darkSwitch');
    darkSwitch.checked = (state.displayTheme === 'dark');

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-bs-theme', theme);
        darkSwitch.checked = (theme === 'dark');
        state.aceEditorOptions.theme = theme === 'dark' ? 'ace/theme/clouds_midnight' : 'ace/theme/chrome';
        document.querySelectorAll('.latex-source-area').forEach(element =>
            element.editorInstance && element.editorInstance.setTheme(state.aceEditorOptions.theme)
        );
    }

    function setTheme(theme) {
        state.displayTheme = theme;
        localStorage.setItem('theme', state.displayTheme);
        checkedRadio('theme', state.displayTheme);
        applyTheme(theme);
    }

    setTheme(state.displayTheme);
    darkSwitch.onchange = () => { setTheme(darkSwitch.checked ? 'dark' : 'light'); };
    onRadioChange('theme', (e) => setTheme(e.target.value.toString()));
}

export function setScrollToTopButton() {
    let btn = document.getElementById('scrollToTop');
    window.addEventListener('scroll', () => {
        btn.style.display = document.body.scrollTop > 20 || document.documentElement.scrollTop > 20 ? 'block' : 'none';
    });
    btn.addEventListener('click', () => document.body.scrollTop = document.documentElement.scrollTop = 0);
}

export function setUIEventHandlers(masterReload) {
    onRadioChange('singleAceInstance', (e) => {
        state.singleAceInstance = (e.target.value === 'true');
        localStorage.setItem('singleAceInstance', state.singleAceInstance);
        if (state.singleAceInstance)
            document.querySelectorAll('.latex-source-area').forEach(el => el.editorInstance && el.editorInstance.customDestroyer.call());
        else
            document.querySelectorAll('.latex-source-area').forEach(el => attachAce(el));
    });

    onRadioChange('typesetOnChange', (e) => {
        state.typesetOnChange = (e.target.value === 'true');
        localStorage.setItem('typesetOnChange', state.typesetOnChange);
    });

    onRadioChange('mathRenderer', (e) => {
        state.mathRenderer = e.target.value;
        localStorage.setItem('mathRenderer', state.mathRenderer);
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

    document.querySelectorAll('.language-flag').forEach(el => {
        el.addEventListener('click', (e) => reloadWithLanguage(e.target.dataset['language']));
    });

    document.getElementById('btnCollapseAll').addEventListener('click', () => {
        document.body.querySelectorAll('[data-has-tooltip]').forEach(el => {
            const popover = bootstrap.Popover.getInstance(el);
            popover && popover.hide();
        });
        document.querySelectorAll('[data-bs-toggle="collapse"]').forEach(el => {
            if (!el.classList.contains('manual-collapse')) el.classList.add('collapsed');
        });
        document.querySelectorAll('.step-body.collapse').forEach(el => {
            if (!el.classList.contains('manual-collapse')) el.classList.remove('show');
        });
    });

    document.getElementById('btnExpandAll').addEventListener('click', () => {
        document.querySelectorAll('[data-bs-toggle="collapse"]').forEach(el => {
            if (!el.classList.contains('manual-collapse')) el.classList.remove('collapsed');
        });
        document.querySelectorAll('.step-body.collapse').forEach(el => {
            if (!el.classList.contains('manual-collapse')) el.classList.add('show');
        });
    });

    document.getElementById('btnResetLocalStorage').addEventListener('click', () => {
        localStorage.clear();
        location.reload();
    });

    document.querySelectorAll('.social-share a').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            window.open(
                el.href,
                '',
                'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=600,width=600'
            );
        });
    });
}

export function handleLocationHash() {
    if (!window.location.hash)
        return;
    let stepId = window.location.hash.replace(/^#(step|stepheading)?(?=\d)/, '');
    if (document.getElementById(`stepheading${stepId}`)) {
        const stepEl = document.querySelector(`#step${stepId}.collapse`);
        bootstrap.Collapse.getOrCreateInstance(stepEl, { toggle: false }).show();
        window.location.hash = '';
        window.location.hash = `#stepheading${stepId}`;
        document.getElementById(`step${stepId}`).scrollIntoView();
    }
    else {
        let kw = window.location.hash.substring(1);
        if ((kw in state.keywordIndex) || ((`\\${kw}`) in state.keywordIndex)) {
            if (!(kw in state.keywordIndex)) {
                kw = `\\${kw}`;
            }
            state.searchInput.value = kw;
            highlightKeywordEverywhere(kw);
        }
    }
}

export function buildTableOfContents() {
    let tocHtml = '<ul>';
    let prevLevel = -1;
    const visibleSection = document.querySelector('section.main-content[style*="block"]');
    if (!visibleSection) return;
    visibleSection.querySelectorAll('h2, div.card-header').forEach(e => {
        if (e.tagName.toLowerCase() === 'div') {
            let target = e.getAttribute('data-bs-target').replace('#step', '');
            let heading = e.querySelector('h4').innerHTML;
            if (prevLevel === 0)
                tocHtml += '<ul>';
            tocHtml += `<li><a href="#" class="toc-link" data-target="${target}">${heading}</a></li>`;
            if (prevLevel === -1)
                prevLevel = 0;
            else
                prevLevel = 1;
        }
        else {
            if (prevLevel === 1)
                tocHtml += '</ul></li>';

            tocHtml += `<li><strong>${e.innerHTML}</strong>`;
            prevLevel = 0;
        }
    });
    if (prevLevel === 1)
        tocHtml += '</ul></li>';
    tocHtml += '</ul>';
    document.getElementById('tableofcontents').innerHTML = tocHtml;
    document.querySelectorAll('a.toc-link').forEach((element) => {
        const stepId = element.getAttribute('data-target');
        element.addEventListener('click', (e) => {
            e.preventDefault();
            const stepEl = document.querySelector(`#step${stepId}.collapse`);
            if (!stepEl) return;
            bootstrap.Collapse.getOrCreateInstance(stepEl, { toggle: false }).show();
            history.replaceState(null, '', `#stepheading${stepId}`);
            const heading = document.getElementById(`stepheading${stepId}`);
            if (heading) {
                heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        })
    });
}
