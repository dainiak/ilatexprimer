import { state } from './state.js';
import { preprocessLaTeX, createElement } from './latex-processor.js';
import { attachAce } from './editor.js';
import { messages } from './i18n.js';

const sourceToResult = new WeakMap();

export function getResultDisplayArea(sourceArea) {
    return sourceToResult.get(sourceArea);
}

export function setLoadingStatus(text) {
    state.loadingToastText.textContent = text;
}

export function processLessonContainer(container, containerFootprint) {
    containerFootprint = containerFootprint || '';
    const lessonString = container.textContent.trim();
    const lessonSteps = lessonString.split(/(^\s*\\section{.*?}\s*$)/m);
    const lessonContainer = createElement('div', 'lesson-container');
    container.replaceWith(lessonContainer);

    for (let i = 1; i < lessonSteps.length; i += 2) {
        const stepIdString = `${containerFootprint}-${(i + 1) / 2}`;
        let headerText = lessonSteps[i].trim();
        headerText = headerText.substring('\\section{'.length, headerText.length - 1);
        let bodyText = (lessonSteps[i + 1] ?? '')
            .trim()
            .replace(/\\index{([^}]+)}/g, ($0, $1) => {
                $1.split(',').forEach((keywordGroup) => {
                    keywordGroup = keywordGroup
                        .trim()
                        .split('=')
                        .map((s) => s.trim());
                    keywordGroup.forEach((keyword) => {
                        if (!(keyword in state.keywordIndex)) {
                            state.keywordIndex[keyword] = {
                                steps: new Set(),
                            };
                        }
                        state.keywordIndex[keyword].steps.add(stepIdString);

                        if (keywordGroup.length > 1) {
                            if (!state.keywordIndex[keyword].synonyms) {
                                state.keywordIndex[keyword].synonyms = new Set();
                            }
                            keywordGroup.forEach((synonym) => {
                                state.keywordIndex[keyword].synonyms.add(synonym);
                            });
                        }
                    });
                });
                return '';
            })
            .trim()
            .replace(/^\\par\s+/, '');

        const staticPartMatch = bodyText.match(/^\\begin{staticpart}([\s\S]+?)\\end{staticpart}([\s\S]*)$/);
        let staticPart = '';
        if (staticPartMatch) {
            staticPart = staticPartMatch[1].trim().replace(/^\\par\s+/, '');
            bodyText = staticPartMatch[2].trim().replace(/^\\par\s+/, '');
        }

        const stepCard = createElement('div', 'card step-card mt-2');

        const stepHeader = createElement('div', 'card-header step-header');
        stepHeader.id = `stepheading${stepIdString}`;
        stepHeader.setAttribute('role', 'button');
        stepHeader.setAttribute('tabindex', '0');
        stepHeader.setAttribute('data-bs-toggle', 'collapse');
        stepHeader.setAttribute('data-bs-target', `#step${stepIdString}`);
        stepHeader.setAttribute('aria-expanded', state.startCollapsed ? 'false' : 'true');
        stepHeader.setAttribute('aria-controls', `step${stepIdString}`);
        if (state.startCollapsed) stepHeader.classList.add('collapsed');
        stepHeader.addEventListener('keydown', (e) => {
            if (e.key === ' ') {
                e.preventDefault();
                stepHeader.click();
            }
        });
        const h3 = createElement('h3', 'h4', headerText);
        stepHeader.appendChild(h3);
        stepCard.appendChild(stepHeader);

        const stepCardBody = createElement('div', 'card-body step-body collapse');
        stepCardBody.id = `step${stepIdString}`;
        stepCardBody.setAttribute('role', 'region');
        stepCardBody.setAttribute('aria-labelledby', `stepheading${stepIdString}`);
        if (!state.startCollapsed) stepCardBody.classList.add('show');

        stepCardBody.addEventListener('show.bs.collapse', () => {
            stepHeader.setAttribute('aria-expanded', 'true');
        });
        stepCardBody.addEventListener('hide.bs.collapse', () => {
            stepHeader.setAttribute('aria-expanded', 'false');
        });

        if (staticPart) {
            const staticPartArea = createElement('div', 'card-text static-part-area');
            staticPartArea.id = `spa${stepIdString}`;
            staticPartArea.textContent = staticPart;
            preprocessLaTeX(staticPartArea);
            stepCardBody.classList.add('force-source-visibility');
            stepCardBody.appendChild(staticPartArea);
        }

        const savedSource = localStorage.getItem(`${state.displayLanguage}-${stepIdString}`);
        if (savedSource) bodyText = savedSource;

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

        let resizeTimer = null;
        sourceArea.addEventListener('resize', (e) => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const editor = e.target;
                if (editor.editorInstance) {
                    editor.editorInstance.resize();
                } else {
                    const div = document.createElement('div');
                    div.textContent = editor.originalText;
                    editor.innerHTML = '';
                    editor.appendChild(div);
                    state.aceHighlighter(div, state.aceEditorOptions);
                }
            }, 150);
        });

        sourceArea.addEventListener('click', () => {
            attachAce(sourceArea)?.focus();
        });

        sourceArea.originalText = sourceArea.textContent;
        sourceToResult.set(sourceArea, resultDisplayArea);
        if (state.singleAceInstance) state.aceHighlighter(sourceArea, state.aceEditorOptions);
        else attachAce(sourceArea);
    }
}

export async function loadExternalScriptsAndFinalize(finalizer) {
    state.loadAbortController?.abort();
    const controller = new AbortController();
    state.loadAbortController = controller;

    const scripts = document.querySelectorAll(
        `section[lang="${state.displayLanguage}"] > script[type="text/latexlesson"][data-src][data-toload]`,
    );

    await Promise.all(
        [...scripts].map(async (externalScript) => {
            const src = `content/${state.displayLanguage}/tex/${externalScript.dataset.src}`;
            externalScript.removeAttribute('data-src');
            externalScript.removeAttribute('data-toload');
            externalScript.setAttribute('data-toprocess', 'true');

            setLoadingStatus(`${messages.loadingSection} "${src}"\u2026`);

            try {
                const response = await fetch(src, { signal: controller.signal });
                externalScript.textContent = response.ok
                    ? await response.text()
                    : `\\section{(${messages.unableToLoadThisStep})}`;
            } catch (err) {
                if (err.name === 'AbortError') return;
                console.error(`Failed to load ${src}:`, err);
                if (!externalScript.textContent.trim()) {
                    externalScript.textContent = `\\section{(${messages.unableToLoadThisStep})}`;
                }
            }
        }),
    );

    if (controller.signal.aborted) return;
    finalizer();
}
