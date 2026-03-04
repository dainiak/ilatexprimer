import { Popover } from 'bootstrap';
import { messages } from './i18n.js';
import { processLaTeXTextInElement } from './latex-processor.js';

let renderQueue = Promise.resolve();

export function findClosingToken(tokens, start) {
    const stack = [];
    for (let i = start; i < tokens.length; ++i) {
        const token = tokens[i];
        if (token === '\\(' || token === '\\[') {
            stack.push(token);
            continue;
        } else if (token === '\\)' || token === '\\]') {
            if (stack.length === 0) return null;

            const prevToken = stack.pop();
            if (!((prevToken === '\\(' && token === '\\)') || (prevToken === '\\[' && token === '\\]'))) return null;
        } else if (token === '$' || token === '$$') {
            if (stack.length === 0 || stack[stack.length - 1] !== token) stack.push(token);
            else stack.pop();
        }
        if (stack.length === 0) return i;
    }
    return null;
}

export function mathRendererFactory(element, performPostprocessing, callback) {
    performPostprocessing = performPostprocessing !== false;

    function processWithRenderer(element, promises) {
        for (const node of Array.from(element.childNodes)) {
            if (node.nodeType === 3) {
                const tokens = node.textContent.split(/(\${1,2}|\\\[|\\]|\\\(|\\\))/);

                if (tokens.length <= 1) {
                    continue;
                }

                const container = document.createElement('span');
                element.replaceChild(container, node);

                for (let j = 0; j < tokens.length; ++j) {
                    const token = tokens[j];
                    if (['\\(', '$', '$$', '\\['].includes(token)) {
                        const jClosing = findClosingToken(tokens, j);
                        if (jClosing === null) {
                            container.appendChild(document.createTextNode(messages.unbalancedParenthesis + token));
                            break;
                        }

                        const displayMode = ['$$', '\\['].includes(token);
                        let originalSource = tokens.slice(j + 1, jClosing).join('');
                        j = jClosing;

                        let showTooltipOnClick = false;
                        if (originalSource.startsWith('\\showSourceOnClick')) {
                            originalSource = originalSource.replace(/^\\showSourceOnClick\s*/, '').trim();
                            showTooltipOnClick = true;
                        }

                        const preparedSource = originalSource;
                        const span = document.createElement('span');
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
                            const options = { ...(displayMode ? metricsCache.display : metricsCache.inline) };
                            options.display = displayMode;
                            const mjElementPromise = (MathJax.tex2chtmlPromise || MathJax.tex2svgPromise)(
                                preparedSource,
                                options,
                            );

                            promises.push(
                                mjElementPromise
                                    .then((mjElement) => {
                                        const annotation = document.createElement('annotation');
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
                                    }),
                            );
                        }
                    } else {
                        container.appendChild(document.createTextNode(token));
                    }
                }
            } else if (node.nodeType === 1 && !['code', 'pre'].includes(node.nodeName.toLowerCase())) {
                processWithRenderer(node, promises);
            }
        }
    }

    const metricsCache = {};

    return () => {
        renderQueue = renderQueue.then(() => {
            MathJax.texReset();
            metricsCache.inline ??= MathJax.getMetricsFor(document.body, false);
            metricsCache.display ??= MathJax.getMetricsFor(document.body, true);
            const promises = [];
            processWithRenderer(element, promises);
            if (performPostprocessing) processLaTeXTextInElement(element);

            return Promise.all(promises).then(() => {
                if (MathJax.tex2chtml) {
                    MathJax.startup.document.clear();
                    MathJax.startup.document.updateDocument();
                }
                callback?.();
            });
        });
    };
}
