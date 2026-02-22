import { Popover } from 'bootstrap';
import { processLaTeXTextInElement } from './latex-processor.js';
import { messages } from './i18n.js';

export function mathRendererFactory(element, performPostprocessing, callback) {
    performPostprocessing = performPostprocessing !== false;

    function findClosingToken(tokens, start) {
        let stack = [];
        for (let i = start; i < tokens.length; ++i) {
            const token = tokens[i];
            if (token === '\\(' || token === '\\[') {
                stack.push(token);
                continue;
            } else if (token === '\\)' || token === '\\]') {
                if (stack.length === 0) return null;

                let prevToken = stack.pop();
                if (!((prevToken === '\\(' && token === '\\)') || (prevToken === '\\[' && token === '\\]')))
                    return null;
            } else if (token === '$' || token === '$$') {
                if (stack.length === 0 || stack[stack.length - 1] !== token) stack.push(token);
                else stack.pop();
            }
            if (stack.length === 0) return i;
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
                        let span = document.createElement(displayMode ? 'div' : 'span');
                        if (displayMode) {
                            span.style.overflowX = 'auto';
                            span.style.width="100%";
                        }
                        container.appendChild(span);

                        const attachTooltip = (span) => {
                            const tooltipHost = span.querySelector('mjx-container') || span.querySelector('svg');
                            if (!tooltipHost) return;
                            const codeEl = document.createElement('code');
                            codeEl.textContent = originalSource;
                            new Popover(tooltipHost, {
                                content: codeEl.outerHTML,
                                html: true,
                                placement: 'bottom',
                                trigger: showTooltipOnClick ? 'click' : 'hover',
                                container: 'body',
                            });
                            tooltipHost.style.cursor = showTooltipOnClick ? 'pointer' : 'default';
                            tooltipHost.setAttribute('data-has-tooltip', 'true');
                        };

                        {
                            let options = MathJax.getMetricsFor(document.body, displayMode);
                            options.display = displayMode;
                            let mjElementPromise = (MathJax.tex2chtmlPromise || MathJax.tex2svgPromise)(
                                preparedSource,
                                options,
                            );

                            mjElementPromise
                                .then((mjElement) => {
                                    let annotation = document.createElement('annotation');
                                    annotation.setAttribute('encoding', 'application/x-tex');
                                    annotation.style.display = 'none';
                                    annotation.innerText = originalSource;
                                    mjElement.appendChild(annotation);
                                    span.appendChild(mjElement);
                                    attachTooltip(span);
                                })
                                .catch((err) => {
                                    span.appendChild(document.createTextNode(preparedSource));
                                    console.warn('MathJax rendering failed:', err);
                                });
                        }
                    } else {
                        container.appendChild(document.createTextNode(token));
                    }
                }
            } else if (node.nodeType === 1 && !['code', 'pre'].includes(node.nodeName.toLowerCase())) {
                processWithRenderer(node);
            }
        }
    }

    return () => {
        MathJax.texReset();
        processWithRenderer(element);
        if (performPostprocessing) processLaTeXTextInElement(element);

        if (MathJax.tex2chtml) {
            MathJax.startup.document.clear();
            MathJax.startup.document.updateDocument();
        }
        callback?.call();
    };
}
