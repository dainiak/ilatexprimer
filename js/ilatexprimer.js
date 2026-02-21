const main = () => {
    let displayLanguage = localStorage.getItem('displayLanguage') || (navigator.languages.includes('ru') ? 'ru' : 'en');
    let displayTheme = localStorage.getItem('theme') || (
        window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    );
    let startCollapsed = true;
    let highlightIntro = false;
    let mathRenderer = localStorage.getItem('mathRenderer') !== 'KaTeX' ? 'MathJax' : 'KaTeX';
    let typesetOnChange = localStorage.getItem('typesetOnChange') !== null ? localStorage.getItem('typesetOnChange') === 'true' : true;
    let singleAceInstance = localStorage.getItem('singleAceInstance') === 'true' || false;
    let keywordIndex = {};
    const aceHighlighter = ace.require('ace/ext/static_highlight');
    const searchInput = document.getElementById('searchInput');
    const loadingToastText = document.getElementById('loadingToastText');

    function setLoadingStatus(text) {
        loadingToastText.textContent = text;
    }

    const aceEditorOptions = {
        theme: 'ace/theme/chrome',
        mode: 'ace/mode/latex',
        minLines: 3,
        maxLines: Infinity,
        fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: '90%',
        wrap: true,
        showGutter: true,
        fadeFoldWidgets: false,
        showFoldWidgets: false,
        showPrintMargin: false
    };

    function attachAce(sourceArea){
        if(sourceArea.editorInstance)
            return;

        const div = document.createElement('div');

        if(typeof sourceArea.originalText != 'string') {
            sourceArea.originalText = sourceArea.textContent;
        }
        div.textContent = sourceArea.textContent.trim();

        sourceArea.innerHTML = '';
        sourceArea.appendChild(div);
        let editor = ace.edit(div);
        sourceArea.editorInstance = editor;

        editor.$blockScrolling = Infinity;
        editor.setOptions(aceEditorOptions);
        editor.commands.removeCommands(["gotoline", "find"]);
        editor.resize();
        editor.gotoLine(1);

        function typesetEditorContent() {
            const rda = editor.container.parentNode.rda;
            rda.querySelectorAll('[data-has-tooltip]').forEach(el => {
                const popover = bootstrap.Popover.getInstance(el);
                popover && popover.dispose();
            });
            const value = editor.getValue().trim();
            localStorage.setItem(`${displayLanguage}-${rda.id.replace('rda', '')}`, value);
            rda.textContent = value.replace(/^\\par\s+/, '');
            preprocessLaTeX(rda);
            mathRenderer === 'MathJax' && MathJax.texReset();
            mathRendererFactory(rda)();
        }

        editor.commands.addCommand({
            name: 'typeset',
            bindKey: 'Ctrl-Enter',
            exec: typesetEditorContent
        });

        editor.on('change', ()=> typesetOnChange && typesetEditorContent());

        editor.customDestroyer = () => {
            const value = editor.getValue().trim();
            sourceArea.originalText = value;
            typesetOnChange && typesetEditorContent();

            if (singleAceInstance) {
                sourceArea.editorInstance = null;
                editor.destroy();
                const container = editor.container;
                container.parentNode.removeChild(container);
                editor.container = null;
                editor.renderer = null;
                editor = null;
                sourceArea.textContent = value;
                ace.config.set('fontSize', '90%');
                ace.config.set('fontFamily', 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace');
                aceHighlighter(sourceArea, aceEditorOptions);
                if(!window.aceStaticStyle) {
                    window.aceStaticStyle = document.querySelector('style#ace_highlight');
                    window.aceStaticStyle.innerHTML = aceStaticStyle.innerHTML.replace(
                        /\bfont-size:[^;]+;/, 'font-size: 90%;'
                    ).replace(
                        /\bfont-family:[^;]+;/,
                        'font-family: Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;'
                    )
                    .replace(
                        '.ace_line {',
                        '.ace_line { line-height: 1.2em;'
                    );
                }
            }
        };
        editor.on('blur', editor.customDestroyer);

        return editor;
    }

    const checkedRadio = (name, value) => {
        const el = document.querySelector(`input[type=radio][name="${name}"][value="${value}"]`);
        if (el) el.checked = true;
    };

    checkedRadio('mathRenderer', mathRenderer);
    checkedRadio('typesetOnChange', typesetOnChange.toString());
    checkedRadio('singleAceInstance', singleAceInstance.toString());

    if (localStorage.getItem('areaWidthRatio') !== null){
        checkedRadio('areaWidthRatio', localStorage.getItem('areaWidthRatio'));
    }

    function setAreaWidthRatio(ratioCode) {
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

    if(localStorage.getItem('areaWidthRatio') !== null)
        setAreaWidthRatio(localStorage.getItem('areaWidthRatio'));

    function reloadWithLanguage(language) {
        displayLanguage = language;
        setUILanguage(displayLanguage);
        localStorage.setItem('displayLanguage', displayLanguage);
        masterReload();
    }

    function onRadioChange(name, handler) {
        document.querySelectorAll(`input[type=radio][name="${name}"]`).forEach(el => {
            el.addEventListener('change', handler);
        });
    }

    function setUIEventHandlers() {
        onRadioChange('singleAceInstance', (e) => {
            singleAceInstance = (e.target.value === 'true');
            localStorage.setItem('singleAceInstance', singleAceInstance);
            if(singleAceInstance)
                document.querySelectorAll('.latex-source-area').forEach(el => el.editorInstance && el.editorInstance.customDestroyer.call());
            else
                document.querySelectorAll('.latex-source-area').forEach(el => attachAce(el));
        });

        onRadioChange('typesetOnChange', (e) => {
            typesetOnChange = (e.target.value === 'true');
            localStorage.setItem('typesetOnChange', typesetOnChange);
        });

        onRadioChange('mathRenderer', (e) => {
            mathRenderer = e.target.value;
            localStorage.setItem('mathRenderer', mathRenderer);
        });

        onRadioChange('areaWidthRatio', (e) => {
            localStorage.setItem('areaWidthRatio', e.target.value.toString());
            setAreaWidthRatio(e.target.value.toString());
        });

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

    function highlightKeywordEverywhere(keyword) {
        if(!(keyword in keywordIndex))
            return;

        function highlightKeywordInFormulas(element, keyword) {
            if(mathRenderer === 'MathJax'){
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

        let stepList = keywordIndex[keyword].steps;
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
                bootstrap.Collapse.getOrCreateInstance(element, {toggle: false}).hide();
            }
        });

        for (let i = 0; i < stepList.length; ++i) {
            let stepSelector = `#step${stepList[i]}`;
            let stepDOMnode = document.querySelector(stepSelector);
            bootstrap.Collapse.getOrCreateInstance(stepDOMnode, {toggle: false}).show();
            highlightKeywordInFormulas(stepDOMnode, keyword);

            let editorInstance = document.querySelector(`${stepSelector} .latex-source-area`).editorInstance || {findAll: () => {}};

            if (keywordIndex[keyword].synonyms) {
                keywordIndex[keyword].synonyms.forEach(synonym => highlightKeywordInFormulas(stepDOMnode, synonym));
                editorInstance.findAll(
                    RegExp(
                        keywordIndex[keyword].synonyms.map(str => str.replace(/[\\$^[{}()?.*|]/g, $0 => '\\'+$0)).join('|'),
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
            firstStep.scrollIntoView({behavior: 'smooth', block: 'start'});
        }
    }


    function removeLaTeXComments(text) {
        return text
            .replace(
                /\\verb".*?"/gm,
                ($0) => $0.replace(/%/g, '\\%')
            ).replace(
                /(\\)?%/gm,
                ($0, $1) => $1 ? $0 : '\ufeff'
            ).replace(
                /\\verb".*?"/gm,
                ($0) => $0.replace(/\\%/g, '%')
            ).replace(
                /\ufeff.*$/um,
                ''
            );
    }

    function processLaTeXText(text) {
        return text
            .replace(/---/g, '—')
            .replace(/--/g, '–')
            .replace(/<</g, '«')
            .replace(/>>/g, '»')
            .replace(/``/g, '\u201c')
            .replace(/''/g, '\u201d')
            .replace(/(\\)?\\('|`|^|"|H|~|c|k|=|b|.|d|r|u|v){(.)}/g, ($0, $1, $2, $3) => {
                if ($1) return $0;

                const accentMap = {
                    "'": '\u0301',
                    '`': '\u0300',
                    '^': '\u0302',
                    '"': '\u0308',
                    'H': '\u030B',
                    '~': '\u0303',
                    'c': '\u0327',
                    'k': '\u0328',
                    '=': '\u0304',
                    'b': '\u0331',
                    '.': '\u0307',
                    'd': '\u0323',
                    'r': '\u030A',
                    'u': '\u0306',
                    'v': '\u030C'
                };

                return $3 + (accentMap[$2] || '');
            })
            .replace(
                /(\\)?\\t{(..)}/g,
                ($0, $1, $2) => $1 ? $0 : $2 + '\u0361'
            ).replace(
                /(\\)?\\l{}/,
                ($0, $1) => $1 ? $0 : '\u0142'
            ).replace(
                /(\\)?\\o(?=[^a-zA-Z])/,
                ($0, $1) => $1 ? $0 : '\u00f8'
            ).replace(
                /(\\)?\\,/g,
                ($0, $1) => $1 ? $0 : ' '
            ).replace(
                /(\\)?\\ /g,
                ($0, $1) => $1 ? $0 : ' '
            ).replace(
                /(\\)?~/g,
                ($0, $1) => $1 ? $0 : ' '
            ).replace(
                /(\\)?\\textbackslash/g,
                ($0, $1) => $1 ? $0 : '\\'
            ).replace(
                /(\\)?\\textasciitilde/g,
                ($0, $1) => $1 ? $0 : '~'
            ).replace(
                /\\%/g,
                '%'
            );
    }

    function processLaTeXTextInElement(element) {
        element.childNodes.forEach((node) => {
            if (node.nodeType === 3) {
                element.replaceChild(document.createTextNode(processLaTeXText(node.textContent)), node);
            }
            else if (node.nodeType === 1 && !node.classList.contains('latex-source-area') && !['script', 'noscript', 'style', 'textarea', 'pre', 'code'].includes(node.nodeName.toLowerCase())) {
                processLaTeXTextInElement(node);
            }
        });
    }

    function parseCommandArgs(text) {
        let closingBrace = '';
        let balancer = 0;
        let command = '';
        let remainder = text;
        let valuePos = 0;
        let value = '';

        for (let i = 0; i < text.length; ++i) {
            let currentSymbol = text.charAt(i);
            if (text.charAt(0) === '\\' && command === '' && !currentSymbol.match(/[a-zA-Z]/) && i > 0) {
                command = text.substring(0, i);
                valuePos = i + 1;

                if (currentSymbol !== '{') {
                    value = '';
                    remainder = text.substring(i);
                    break;
                }
            }
            else if (i === 0 && currentSymbol === '{') {
                command = '';
                valuePos = 1;
            }

            if (closingBrace === '' && currentSymbol === '{') {
                valuePos = i + 1;
                closingBrace = '}';
            }
            if ('{}'.includes(currentSymbol) && (i === 0 || text.charAt(i - 1) !== '\\'))
                balancer += currentSymbol === '{' ? 1 : -1;

            if (balancer === 0 && currentSymbol === closingBrace) {
                value = text.substring(valuePos, i);
                remainder = text.substring(i + 1);
                break;
            }
        }

        if (balancer > 0) {
            value = text.substring(valuePos);
            remainder = '';
        }
        return {
            command: command,
            value: value,
            remainder: remainder
        };
    }

    function flattenElement(element) {
        if (element.tagName.toLowerCase() !== 'span' || element.classList.length !== 0)
            return;
        let children = [];
        element.childNodes.forEach((node) => children.push(node));
        children.forEach((node) => {
            element.removeChild(node);
            element.parentNode.insertBefore(node, element);
        });
        element.parentNode.removeChild(element);
    }

    function createElement(tag, className, textContent) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (textContent !== undefined) el.textContent = textContent;
        return el;
    }

    function preprocessLaTeX(element) {
        let text = element.textContent;
        text = removeLaTeXComments(text);

        text = text
            .replace(/\s*\\begin{enumerate}\s*\\item\s*/g, '\\htmlol{\\htmlli{')
            .replace(/\s*\\end{enumerate}/g, '}}')
            .replace(/\s*\\begin{itemize}\s*\\item/g, '\\htmlul{\\htmlli{')
            .replace(/\s*\\end{itemize}\s*/g, '}}')
            .replace(/\s*\\item\s*(?!")/g, '}\\htmlli{');

        let pos = text.search(/\\html[a-z]+?{/);
        if (pos >= 0) {
            const prefix = text.substring(0, pos);
            const tokens = parseCommandArgs(text.substring(pos));
            element.textContent = '';
            if (prefix) {
                const span = document.createElement('span');
                span.appendChild(document.createTextNode(prefix));
                element.appendChild(span);
            }
            let tag = tokens.command.substring(5);
            const tagEl = document.createElement(tag);
            tagEl.appendChild(document.createTextNode(tokens.value));
            element.appendChild(tagEl);
            element.querySelectorAll(`:scope > ${tag}`).forEach(e => preprocessLaTeX(e));
            if (tokens.remainder) {
                const span = document.createElement('span');
                span.appendChild(document.createTextNode(tokens.remainder));
                element.appendChild(span);
            }
            element.querySelectorAll(':scope > span').forEach(e => preprocessLaTeX(e));
            flattenElement(element);
            return;
        }

        pos = text.search(/\\verb[^a-zA-Z]/);
        if (pos >= 0) {
            let prefix = text.substring(0, pos);
            let verbDelimiter = text.charAt(pos + '\\verb'.length);
            text = text.substring(pos + '\\verb"'.length);
            pos = text.indexOf(verbDelimiter);
            let verbText = text.substring(0, pos);
            let postfix = text.substring(pos + 1);
            let remainderNoBrake = postfix.charAt(0);
            if (['.', ','].includes(remainderNoBrake)) {
                postfix = postfix.substring(1);
            }
            else {
                remainderNoBrake = '';
            }
            element.textContent = '';
            const prefixSpan = document.createElement('span');
            prefixSpan.appendChild(document.createTextNode(prefix));
            element.appendChild(prefixSpan);

            const nobr = document.createElement('nobr');
            const code = document.createElement('code');
            code.appendChild(document.createTextNode(verbText));
            nobr.appendChild(code);
            if (remainderNoBrake) {
                nobr.appendChild(document.createTextNode(remainderNoBrake));
            }
            element.appendChild(nobr);

            const postfixSpan = document.createElement('span');
            postfixSpan.appendChild(document.createTextNode(postfix));
            element.appendChild(postfixSpan);
            element.querySelectorAll(':scope > span').forEach(e => preprocessLaTeX(e));
            flattenElement(element);
            return;
        }

        pos = text.search(/\\(textit|textbf|subsection|href|emph){|\\par[^a-zA-Z]/);
        if (pos >= 0) {
            let prefix = text.substring(0, pos);
            let tokens = parseCommandArgs(text.substring(pos));
            element.textContent = '';
            const prefixSpan = document.createElement('span');
            prefixSpan.appendChild(document.createTextNode(prefix));
            element.appendChild(prefixSpan);

            if (['\\textbf', "\\textit", "\\emph"].includes(tokens.command)) {
                let tag = tokens.command === '\\textbf' ? 'strong' : 'em';
                const tagEl = document.createElement(tag);
                tagEl.appendChild(document.createTextNode(tokens.value));
                element.appendChild(tagEl);
                element.querySelectorAll(`:scope > ${tag}`).forEach(e => preprocessLaTeX(e));
            }
            else if (tokens.command === '\\subsection') {
                const h5 = createElement('h5', 'mt-4');
                h5.appendChild(document.createTextNode(tokens.value));
                element.appendChild(h5);
                element.querySelectorAll(':scope > h5').forEach(e => preprocessLaTeX(e));
            }
            else if (tokens.command === '\\href') {
                const href = tokens.value;
                tokens = parseCommandArgs(tokens.remainder);
                const a = document.createElement('a');
                a.rel = 'external';
                a.href = href;
                a.appendChild(document.createTextNode(tokens.value));
                element.appendChild(a);
                element.querySelectorAll(':scope > a').forEach(e => preprocessLaTeX(e));
            }
            else if (tokens.command === '\\par') {
                element.appendChild(document.createElement('p'));
            }

            const remainderSpan = document.createElement('span');
            remainderSpan.appendChild(document.createTextNode(tokens.remainder));
            element.appendChild(remainderSpan);
            element.querySelectorAll(':scope > span').forEach(e => preprocessLaTeX(e));
            flattenElement(element);
            return;
        }

        text = text.replace(
            /\\TeX(?!\$)/g,
            mathRenderer === 'MathJax' ? '\\(\\TeX\\)' : 'TeX'
        ).replace(
            /\\LaTeX(?!\$)/g,
            mathRenderer === 'MathJax' ? '\\(\\LaTeX\\)' : 'LaTeX'
        )

        const environments = [
            'equation', 'equation*', 'gather', 'gather*',
            'align', 'align*', 'alignat', 'alignat*',
            'multline', 'multline*'
        ];

        environments.forEach(env => {
            text = text.replace(`\\begin{${env}}`, `\\[\\begin{${env}}`).replace(`\\end{${env}}`, `\\end{${env}}\\]`);
        });

        text = text.replace(
            /\\(ref|eqref)\{([^}]+)}(?!\$)/g,
            '\\(\\$1{$2}\\)'
        )

        element.textContent = text;
    }

    function mathRendererFactory(element, performPostprocessing, callback) {
        performPostprocessing = (performPostprocessing !== false);

        function findClosingToken(tokens, start){
            let stack = [];
            for(let i = start; i < tokens.length; ++i){
                const token = tokens[i];
                if (token === '\\(' || token === '\\['){
                    stack.push(token);
                    continue;
                } else if (token === '\\)' || token === '\\]'){
                    if(stack.length === 0)
                        return null;

                    let prevToken = stack.pop();
                    if (!(prevToken === '\\(' && token === '\\)' || prevToken === '\\[' && token === '\\]'))
                        return null;
                } else if(token === '$' || token === '$$'){
                    if(stack.length === 0 || stack[stack.length - 1] !== token)
                        stack.push(token);
                    else
                        stack.pop();
                }
                if(stack.length === 0)
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
                            if(jClosing === null){
                                container.appendChild(document.createTextNode(msgUnbalancedParenthesis + token));
                                break;
                            }

                            let displayMode = ['$$', '\\['].includes(token);
                            let originalSource = tokens.slice(j+1, jClosing).join('');
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
                                    mathRenderer === 'KaTeX' ? '.katex-html'
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

                            if(mathRenderer === 'MathJax') {
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
                                    if(displayMode) {
                                        span.style.display = 'block';
                                        span.style.textAlign = 'center';
                                    }
                                    attachTooltip(span);
                                })
                            }
                            else{
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
                                    span.textContent = msgKatexUnableToDisplayFormula;
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
            (mathRenderer === 'MathJax') && MathJax.texReset();
            processWithRenderer(element);
            performPostprocessing && processLaTeXTextInElement(element);

            if(mathRenderer === 'MathJax' && MathJax.tex2chtml){
                MathJax.startup.document.clear();
                MathJax.startup.document.updateDocument();
            }
            callback && callback.call();
        }
    }

    function processLessonContainer(container, containerFootprint) {
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
                        if (!(keyword in keywordIndex)) {
                            keywordIndex[keyword] = {
                                steps: []
                            };
                        }
                        keywordIndex[keyword].steps.includes(stepIdString) || keywordIndex[keyword].steps.push(stepIdString);

                        if (keywordGroup.length > 1) {
                            if (keywordIndex[keyword].synonyms === undefined) {
                                keywordIndex[keyword].synonyms = [];
                            }
                            keywordGroup.forEach(
                                (synonym) => keywordIndex[keyword].synonyms.includes(synonym) || keywordIndex[keyword].synonyms.push(synonym)
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
            if (startCollapsed) stepHeader.classList.add('collapsed');
            const h4 = createElement('h4', 'h4', headerText);
            stepHeader.appendChild(h4);
            stepCard.appendChild(stepHeader);

            const stepCardBody = createElement('div', 'card-body step-body collapse');
            stepCardBody.id = `step${stepIdString}`;
            if (!startCollapsed) stepCardBody.classList.add('show');

            if (staticPart) {
                const staticPartArea = createElement('div', 'card-text static-part-area');
                staticPartArea.id = `spa${stepIdString}`;
                staticPartArea.textContent = staticPart;
                preprocessLaTeX(staticPartArea);
                stepCardBody.classList.add('force-source-visibility');
                stepCardBody.appendChild(staticPartArea);
            }

            const savedSource = localStorage.getItem(`${displayLanguage}-${stepIdString}`);
            if(savedSource)
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
                if(editor.editorInstance) {
                    editor.editorInstance.resize();
                }
                else {
                    const div = document.createElement('div');
                    div.textContent = editor.originalText;
                    editor.innerHTML = '';
                    editor.appendChild(div);
                    aceHighlighter(div, aceEditorOptions);
                }
            });

            sourceArea.addEventListener('click', () => {
                const newEditor = attachAce(sourceArea);
                newEditor && newEditor.focus();
            });

            sourceArea.originalText = sourceArea.textContent;
            sourceArea.rda = resultDisplayArea;
            if(singleAceInstance)
                aceHighlighter(sourceArea, aceEditorOptions);
            else
                attachAce(sourceArea);
        }
    }

    function loadExternalScriptsAndFinalize(finalizer) {
        const externalScript = document.querySelector(`section[lang="${displayLanguage}"] > script[type="text/latexlesson"][data-src][toload]`);
        if(!externalScript) {
            return finalizer.call();
        }

        const src = `content/${displayLanguage}/tex/${externalScript.dataset['src']}`;
        externalScript.removeAttribute('data-src');
        externalScript.removeAttribute('toload');
        externalScript.setAttribute('toprocess', 'true');

        setLoadingStatus(`${msgLoadingSection} "${src}"…`);

        fetch(src)
            .then(response => {
                return response.ok ? response.text() : `\\section((${msgUnableToLoadThisStep}))}`;
            })
            .then(text => {
                externalScript.textContent = text;
                loadExternalScriptsAndFinalize(finalizer);
            })
            .catch(() => {
                if (!externalScript.textContent.trim()) {
                    externalScript.textContent = `\\section((${msgUnableToLoadThisStep}))}`;
                }
                loadExternalScriptsAndFinalize(finalizer);
            });
    }

    function handleLocationHash(){
        if (!window.location.hash)
            return;
        let stepId = window.location.hash.replace(/^#(step|stepheading)?(?=\d)/, '');
        if (document.getElementById(`stepheading${stepId}`)) {
            const stepEl = document.querySelector(`#step${stepId}.collapse`);
            bootstrap.Collapse.getOrCreateInstance(stepEl, {toggle: false}).show();
            window.location.hash = '';
            window.location.hash = `#stepheading${stepId}`;
            document.getElementById(`step${stepId}`).scrollIntoView();
        }
        else {
            let kw = window.location.hash.substring(1);
            if ((kw in keywordIndex) || ((`\\${kw}`) in keywordIndex)) {
                if (!(kw in keywordIndex)) {
                    kw = `\\${kw}`;
                }
                searchInput.value = kw;
                highlightKeywordEverywhere(kw);
            }
        }
    }

    function buildTableOfContents(){
        let tocHtml = '<ul>';
        let prevLevel = -1;
        const visibleSection = document.querySelector('section.main-content[style*="block"]');
        if (!visibleSection) return;
        visibleSection.querySelectorAll('h2, div.card-header').forEach(e => {
            if(e.tagName.toLowerCase() === 'div'){
                let target = e.getAttribute('data-bs-target').replace('#step', '');
                let heading = e.querySelector('h4').innerHTML;
                if(prevLevel === 0)
                    tocHtml += '<ul>';
                tocHtml += `<li><a class="toc-link" data-target="${target}">${heading}</a></li>`;
                if(prevLevel === -1)
                    prevLevel = 0;
                else
                    prevLevel = 1;
            }
            else {
                if(prevLevel === 1)
                    tocHtml += '</ul></li>';

                tocHtml += `<li><strong>${e.innerHTML}</strong>`;
                prevLevel = 0;
            }
        });
        if(prevLevel === 1)
            tocHtml += '</ul></li>';
        tocHtml += '</ul>';
        document.getElementById('tableofcontents').innerHTML = tocHtml;
        document.querySelectorAll('a.toc-link').forEach((element) => {
            const stepId = element.getAttribute('data-target');
            element.addEventListener('click', () => {
                const stepEl = document.querySelector(`#step${stepId}.collapse`);
                bootstrap.Collapse.getOrCreateInstance(stepEl, {toggle: false}).show();
                window.location.hash = '';
                window.location.hash = `#stepheading${stepId}`;
                const heading = document.getElementById(`stepheading${stepId}`);
                if (heading) {
                    heading.scrollIntoView({behavior: 'smooth', block: 'start'});
                }
            })
        });
    }

    // Vanilla JS autocomplete replacing typeahead + Bloodhound
    function initAutocomplete(inputElement, keywordList) {
        let menu = null;
        let activeIndex = -1;

        function createMenu() {
            if (menu) return menu;
            menu = createElement('div', 'list-group');
            menu.style.position = 'absolute';
            menu.style.zIndex = '1050';
            menu.style.width = inputElement.offsetWidth + 'px';
            menu.style.maxHeight = '300px';
            menu.style.overflowY = 'auto';
            menu.style.display = 'none';
            inputElement.parentNode.style.position = 'relative';
            inputElement.parentNode.appendChild(menu);
            return menu;
        }

        function hideMenu() {
            if (menu) menu.style.display = 'none';
            activeIndex = -1;
        }

        function tokenize(str) {
            return str ? str.toLowerCase().split(/[^a-z\u0430-\u044f\u0451]/i).filter(Boolean) : [];
        }

        function filterKeywords(query) {
            if (!query || query.length < 2) return [];
            const queryTokens = tokenize(query);
            return keywordList.filter(kw => {
                const kwLower = kw.toLowerCase();
                return queryTokens.some(qt => kwLower.includes(qt));
            }).slice(0, 10);
        }

        function renderSuggestions(matches) {
            const m = createMenu();
            m.innerHTML = '';
            activeIndex = -1;
            if (matches.length === 0) {
                m.style.display = 'none';
                return;
            }
            matches.forEach((kw, idx) => {
                const item = createElement('a', 'list-group-item list-group-item-action');
                item.href = '#';
                item.textContent = kw;
                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    inputElement.value = kw;
                    hideMenu();
                    highlightKeywordEverywhere(kw);
                });
                item.addEventListener('mouseenter', () => {
                    setActive(idx);
                });
                m.appendChild(item);
            });
            m.style.display = 'block';
        }

        function setActive(idx) {
            if (!menu) return;
            const items = menu.querySelectorAll('.list-group-item');
            items.forEach(el => el.classList.remove('active'));
            activeIndex = idx;
            if (idx >= 0 && idx < items.length) {
                items[idx].classList.add('active');
            }
        }

        inputElement.addEventListener('input', () => {
            const val = inputElement.value.trim();
            renderSuggestions(filterKeywords(val));
        });

        inputElement.addEventListener('keydown', (e) => {
            if (!menu || menu.style.display === 'none') return;
            const items = menu.querySelectorAll('.list-group-item');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive(Math.min(activeIndex + 1, items.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive(Math.max(activeIndex - 1, 0));
            } else if (e.key === 'Enter' && activeIndex >= 0) {
                e.preventDefault();
                const selected = items[activeIndex].textContent;
                inputElement.value = selected;
                hideMenu();
                highlightKeywordEverywhere(selected);
            } else if (e.key === 'Escape') {
                hideMenu();
            }
        });

        inputElement.addEventListener('blur', () => {
            setTimeout(hideMenu, 200);
        });
    }

    function finalizer() {
        document.querySelectorAll('script[type="text/latexlesson"][toprocess]').forEach((element, index) => {
            element.removeAttribute('toprocess');
            setLoadingStatus(`${msgProcessingSection} ${index}…`);
            processLessonContainer(element, (index + 1).toString());
        });

        setLoadingStatus(msgProcessingMathOnPage);

        mathRendererFactory(document.body, true, () => {
            setLoadingStatus(msgFinishedLoading);
            const loadingToast = document.getElementById('loadingToast');
            loadingToast.style.transition = 'opacity 1s';
            loadingToast.style.opacity = '0';
            setTimeout(() => { loadingToast.style.display = 'none'; }, 1000);
        })();

        if (!window.location.hash && startCollapsed) {
            const intro = document.querySelector('.step-header[data-bs-target="#step1-1"]');
            if(highlightIntro && intro)
                intro.classList.add('highlighted-blinking');

            const bodyClickHandler = () => {
                if (intro) {
                    intro.classList.remove('highlighted-blinking');
                    intro.style.opacity = 1;
                }
            };
            document.body.addEventListener('click', bodyClickHandler, {once: true});
        }

        let keywordIndexList = Object.keys(keywordIndex);

        initAutocomplete(searchInput, keywordIndexList);

        buildTableOfContents();

        document.getElementById('searchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const kw = searchInput.value.trim();
            if (kw) highlightKeywordEverywhere(kw);
        });

        document.querySelectorAll('.highlighted-blinking').forEach(el => {
            el.addEventListener('focus', () => {
                el.classList.remove('highlighted-blinking');
                el.style.opacity = 1;
            });
        });

        document.querySelectorAll('.step-body').forEach(el => {
            el.addEventListener('click', () => {
                el.querySelectorAll('.highlighted-blinking').forEach(child => {
                    child.classList.remove('highlighted-blinking');
                    child.style.transition = 'opacity 0.4s';
                    child.style.opacity = 1;
                });
            });
        });

        document.querySelectorAll('.collapse').forEach(el => {
            el.addEventListener('hide.bs.collapse', () => {
                el.querySelectorAll('[data-has-tooltip]').forEach(tooltipEl => {
                    const popover = bootstrap.Popover.getInstance(tooltipEl);
                    popover && popover.hide();
                });
            });
        });

        handleLocationHash();
    }

    function masterReload(){
        document.querySelectorAll('section.main-content').forEach(el => el.style.display = 'none');
        const activeSection = document.querySelector(`section.main-content[lang="${displayLanguage}"]`);
        if (activeSection) activeSection.style.display = 'block';
        document.querySelectorAll(`section[lang="${displayLanguage}"] > script[type="text/latexlesson"][data-src]`).forEach(s => {
            s.setAttribute('toload', 'true');
        });
        keywordIndex = {};
        loadExternalScriptsAndFinalize(finalizer);
    }

    function initializeDarkThemeSwitch(){
        const darkSwitch = document.getElementById('darkSwitch');
        darkSwitch.checked = (displayTheme === 'dark');

        function applyTheme(theme){
            document.documentElement.setAttribute('data-bs-theme', theme);
            darkSwitch.checked = (theme === 'dark');
            aceEditorOptions.theme = theme === 'dark' ? 'ace/theme/clouds_midnight' : 'ace/theme/chrome';
            document.querySelectorAll('.latex-source-area').forEach(element =>
                element.editorInstance && element.editorInstance.setTheme(aceEditorOptions.theme)
            );
        }

        function setTheme(theme){
            displayTheme = theme;
            localStorage.setItem('theme', displayTheme);
            checkedRadio('theme', displayTheme);
            applyTheme(theme);
        }

        setTheme(displayTheme);
        darkSwitch.onchange = () => {setTheme(darkSwitch.checked ? 'dark' : 'light');};
        onRadioChange('theme', (e) => setTheme(e.target.value.toString()));
    }

    function setScrollToTopButton(){
        let btn = document.getElementById('scrollToTop');
        window.addEventListener('scroll', () => {
            btn.style.display = document.body.scrollTop > 20 || document.documentElement.scrollTop > 20 ? 'block' : 'none';
        });
        btn.addEventListener('click', () => document.body.scrollTop = document.documentElement.scrollTop = 0);
    }

    initializeDarkThemeSwitch();
    setScrollToTopButton();
    setUILanguage();
    setUIEventHandlers();

    document.readyState === "complete" ? masterReload() : window.addEventListener('load', masterReload);
}

document.readyState === "complete" ? main() : window.addEventListener('load', main);
