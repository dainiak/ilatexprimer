import { state } from './state.js';
import { processLaTeXTextInElement } from './latex-processor.js';
import { messages } from './i18n.js';

export function mathRendererFactory(element, performPostprocessing, callback) {
    performPostprocessing = (performPostprocessing !== false);

    function findClosingToken(tokens, start) {
        let stack = [];
        for (let i = start; i < tokens.length; ++i) {
            const token = tokens[i];
            if (token === '\\(' || token === '\\[') {
                stack.push(token);
                continue;
            } else if (token === '\\)' || token === '\\]') {
                if (stack.length === 0)
                    return null;

                let prevToken = stack.pop();
                if (!(prevToken === '\\(' && token === '\\)' || prevToken === '\\[' && token === '\\]'))
                    return null;
            } else if (token === '$' || token === '$$') {
                if (stack.length === 0 || stack[stack.length - 1] !== token)
                    stack.push(token);
                else
                    stack.pop();
            }
            if (stack.length === 0)
                return i;
        }
        return null;
    }

    function processWithRenderer(element) {
        for (let i = 0; i < element.childNodes.length; ++i) {
            const node = element.childNodes[i];
            if (node.nodeType === 3) {
                const tokens = node.textContent.split(/(\${1,2}|\\\[|\\]|\\\(|\\\))/);

                if (tokens.length <= 1) {
                    continue;
                }

                let container = document.createElement('span');
                element.replaceChild(container, node);

                for (let j = 0; j < tokens.length; ++j) {
                    const token = tokens[j];
                    if (['\\(', '$', '$$', '\\['].includes(token)) {
                        const jClosing = findClosingToken(tokens, j);
                        if (jClosing === null) {
                            container.appendChild(document.createTextNode(messages.unbalancedParenthesis + token));
                            break;
                        }

                        let displayMode = ['$$', '\\['].includes(token);
                        let originalSource = tokens.slice(j + 1, jClosing).join('');
                        j = jClosing;

                        let showTooltipOnClick = false;
                        if (originalSource.startsWith('\\showSourceOnClick')) {
                            originalSource = originalSource.replace(/^\\showSourceOnClick\s*/, '').trim();
                            showTooltipOnClick = true;
                        }

                        let preparedSource = originalSource;
                        let span = document.createElement('span');
                        container.appendChild(span);

                        const attachTooltip = (span) => {
                            const tooltipHost = span.querySelector(
                                state.mathRenderer === 'KaTeX' ? '.katex-html'
                                    : MathJax && MathJax.tex2svg ? 'svg' : 'mjx-container'
                            );
                            if (!tooltipHost) return;
                            const codeEl = document.createElement('code');
                            codeEl.textContent = originalSource;
                            new bootstrap.Popover(tooltipHost, {
                                content: codeEl.outerHTML,
                                html: true,
                                placement: 'bottom',
                                trigger: showTooltipOnClick ? 'click' : 'hover'
                            });
                            tooltipHost.style.cursor = 'default';
                            tooltipHost.setAttribute('data-has-tooltip', 'true');
                        }

                        if (state.mathRenderer === 'MathJax') {
                            let options = MathJax.getMetricsFor(document.body, displayMode);
                            options.display = displayMode;
                            let mjElementPromise = (MathJax.tex2chtmlPromise || MathJax.tex2svgPromise)(
                                preparedSource,
                                options
                            );

                            mjElementPromise.then((mjElement) => {
                                let annotation = document.createElement('annotation');
                                annotation.setAttribute('encoding', 'application/x-tex');
                                annotation.style.display = 'none';
                                annotation.innerText = originalSource;
                                mjElement.appendChild(annotation);
                                span.appendChild(mjElement);
                                if (displayMode) {
                                    span.style.display = 'block';
                                    span.style.textAlign = 'center';
                                }
                                attachTooltip(span);
                            })
                        }
                        else {
                            try {
                                katex.render(preparedSource, span, {
                                    displayMode: displayMode,
                                    throwOnError: false
                                });
                                const annotation = span.querySelector('annotation[encoding="application/x-tex"]');
                                if (annotation) annotation.textContent = originalSource;
                            }
                            catch (e) {
                                span.style.color = 'red';
                                span.textContent = messages.katexUnableToDisplayFormula;
                            }

                            attachTooltip(span);
                        }
                    }
                    else {
                        container.appendChild(document.createTextNode(token));
                    }
                }
            }
            else if (node.nodeType === 1 && !['code', 'pre'].includes(node.nodeName.toLowerCase())) {
                processWithRenderer(node);
            }
        }
    }

    return () => {
        (state.mathRenderer === 'MathJax') && MathJax.texReset();
        processWithRenderer(element);
        performPostprocessing && processLaTeXTextInElement(element);

        if (state.mathRenderer === 'MathJax' && MathJax.tex2chtml) {
            MathJax.startup.document.clear();
            MathJax.startup.document.updateDocument();
        }
        callback && callback.call();
    }
}
