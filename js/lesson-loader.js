import { state } from './state.js';
import { preprocessLaTeX, createElement } from './latex-processor.js';
import { attachAce } from './editor.js';
import { messages } from './i18n.js';

export function setLoadingStatus(text) {
    state.loadingToastText.textContent = text;
}

export function processLessonContainer(container, containerFootprint) {
    containerFootprint = containerFootprint || '';
    const lessonString = container.textContent.trim();
    const lessonSteps = lessonString.split(/(^\s*\\section{.*}\s*$)/m);
    const lessonContainer = createElement('div', 'lesson-container');
    container.after(lessonContainer);
    container.parentNode.removeChild(container);

    for (let i = 1; i < lessonSteps.length; i += 2) {
        const stepIdString = containerFootprint + '-' + ((i + 1) / 2).toString();
        let headerText = lessonSteps[i].trim();
        headerText = headerText.substring('\\section{'.length, headerText.length - 1);
        let bodyText = lessonSteps[i + 1].trim().replace(/\\index{([^}]+)}/g, ($0, $1) => {
            $1.split(',').forEach((keywordGroup) => {
                keywordGroup = keywordGroup.trim().split('=').map((s) => s.trim());
                keywordGroup.forEach((keyword) => {
                    if (!(keyword in state.keywordIndex)) {
                        state.keywordIndex[keyword] = {
                            steps: []
                        };
                    }
                    state.keywordIndex[keyword].steps.includes(stepIdString) || state.keywordIndex[keyword].steps.push(stepIdString);

                    if (keywordGroup.length > 1) {
                        if (state.keywordIndex[keyword].synonyms === undefined) {
                            state.keywordIndex[keyword].synonyms = [];
                        }
                        keywordGroup.forEach(
                            (synonym) => state.keywordIndex[keyword].synonyms.includes(synonym) || state.keywordIndex[keyword].synonyms.push(synonym)
                        );
                    }
                });
            });
            return '';
        }).trim().replace(/^\\par\s+/, '');

        const staticPartMatch = bodyText.match(/^\\begin{staticpart}([\s\S]+?)\\end{staticpart}([\s\S]*)$/);
        let staticPart = '';
        if (staticPartMatch) {
            staticPart = staticPartMatch[1].trim().replace(/^\\par\s+/, '');
            bodyText = staticPartMatch[2].trim().replace(/^\\par\s+/, '');
        }

        const stepCard = createElement('div', 'card step-card mt-2');

        const stepHeader = createElement('div', 'card-header step-header');
        stepHeader.id = `stepheading${stepIdString}`;
        stepHeader.setAttribute('data-bs-toggle', 'collapse');
        stepHeader.setAttribute('data-bs-target', `#step${stepIdString}`);
        if (state.startCollapsed) stepHeader.classList.add('collapsed');
        const h4 = createElement('h4', 'h4', headerText);
        stepHeader.appendChild(h4);
        stepCard.appendChild(stepHeader);

        const stepCardBody = createElement('div', 'card-body step-body collapse');
        stepCardBody.id = `step${stepIdString}`;
        if (!state.startCollapsed) stepCardBody.classList.add('show');

        if (staticPart) {
            const staticPartArea = createElement('div', 'card-text static-part-area');
            staticPartArea.id = `spa${stepIdString}`;
            staticPartArea.textContent = staticPart;
            preprocessLaTeX(staticPartArea);
            stepCardBody.classList.add('force-source-visibility');
            stepCardBody.appendChild(staticPartArea);
        }

        const savedSource = localStorage.getItem(`${state.displayLanguage}-${stepIdString}`);
        if (savedSource)
            bodyText = savedSource;

        const sourceArea = createElement('div', 'card-text latex-source-area col-md-5');
        sourceArea.id = `lsa${stepIdString}`;
        sourceArea.textContent = bodyText;

        const resultDisplayArea = createElement('div', 'card-text result-display-area col-md-7');
        resultDisplayArea.id = `rda${stepIdString}`;
        resultDisplayArea.textContent = bodyText;

        preprocessLaTeX(resultDisplayArea);

        const row = createElement('div', 'row');
        row.appendChild(resultDisplayArea);
        row.appendChild(sourceArea);
        stepCardBody.appendChild(row);
        stepCard.appendChild(stepCardBody);
        lessonContainer.appendChild(stepCard);

        sourceArea.addEventListener('resize', (e) => {
            const editor = e.target;
            if (editor.editorInstance) {
                editor.editorInstance.resize();
            }
            else {
                const div = document.createElement('div');
                div.textContent = editor.originalText;
                editor.innerHTML = '';
                editor.appendChild(div);
                state.aceHighlighter(div, state.aceEditorOptions);
            }
        });

        sourceArea.addEventListener('click', () => {
            const newEditor = attachAce(sourceArea);
            newEditor && newEditor.focus();
        });

        sourceArea.originalText = sourceArea.textContent;
        sourceArea.rda = resultDisplayArea;
        if (state.singleAceInstance)
            state.aceHighlighter(sourceArea, state.aceEditorOptions);
        else
            attachAce(sourceArea);
    }
}

export function loadExternalScriptsAndFinalize(finalizer) {
    const externalScript = document.querySelector(`section[lang="${state.displayLanguage}"] > script[type="text/latexlesson"][data-src][toload]`);
    if (!externalScript) {
        return finalizer.call();
    }

    const src = `content/${state.displayLanguage}/tex/${externalScript.dataset['src']}`;
    externalScript.removeAttribute('data-src');
    externalScript.removeAttribute('toload');
    externalScript.setAttribute('toprocess', 'true');

    setLoadingStatus(`${messages.loadingSection} "${src}"\u2026`);

    fetch(src)
        .then(response => {
            return response.ok ? response.text() : `\\section((${messages.unableToLoadThisStep}))}`;
        })
        .then(text => {
            externalScript.textContent = text;
            loadExternalScriptsAndFinalize(finalizer);
        })
        .catch(() => {
            if (!externalScript.textContent.trim()) {
                externalScript.textContent = `\\section((${messages.unableToLoadThisStep}))}`;
            }
            loadExternalScriptsAndFinalize(finalizer);
        });
}
