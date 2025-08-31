const main = () => {
    const $ = window.$;

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
    const $searchInput = $('#searchInput');
    const $loadingToastText = $('#loadingToastText');

    function setLoadingStatus(text) {
        $loadingToastText.text(text);
    }

    const aceEditorOptions = {
        theme: 'ace/theme/chrome',
        mode: 'ace/mode/latex',
        minLines: 3,
        maxLines: Infinity,
        fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', // mimic Bootstrap
        fontSize: '90%', // mimic Bootstrap
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
            $(rda).find('[data-has-tooltip]').popover('dispose');
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

    $(`input[type=radio][name=mathRenderer][value="${mathRenderer}"]`)[0].checked = true;
    $(`input[type=radio][name=typesetOnChange][value="${typesetOnChange.toString()}"]`)[0].checked = true;
    $(`input[type=radio][name=singleAceInstance][value="${singleAceInstance.toString()}"]`)[0].checked = true;

    if (localStorage.getItem('areaWidthRatio') !== null){
        $(`input[type=radio][name=areaWidthRatio][value="${localStorage.getItem('areaWidthRatio')}"]`)[0].checked = true;
    }

    function setAreaWidthRatio(ratioCode) {
        ['.latex-source-area', '.result-display-area'].forEach(selector => {
            $(selector).removeClass((_, className) => (className.match(/(^|\s)col-md-\d+/g) || []).join(' '));
        });

        if (ratioCode !== '0') {
            $('.latex-source-area').addClass(`col-md-${ratioCode}`).show().trigger('resize');
            $('.result-display-area').addClass(`col-md-${12 - parseInt(ratioCode)}`);
        }
        else {
            $('.latex-source-area').not('.force-source-visibility .latex-source-area').hide();
            $('.result-display-area').not('.force-source-visibility .result-display-area').addClass('col-md-12');
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

    function setUIEventHandlers() {
        $('input[type=radio][name=singleAceInstance]').on('change', (e) => {
            singleAceInstance = (e.target.value === 'true');
            localStorage.setItem('singleAceInstance', singleAceInstance);
            if(singleAceInstance)
                $('.latex-source-area').each((_, element) => element.editorInstance.customDestroyer.call());
            else
                $('.latex-source-area').each((_, element) => attachAce(element));
        });

        $('input[type=radio][name=typesetOnChange]').on('change', (e) => {
            typesetOnChange = (e.target.value === 'true');
            localStorage.setItem('typesetOnChange', typesetOnChange);
        });

        $('input[type=radio][name=mathRenderer]').on('change', (e) => {
            mathRenderer = e.target.value;
            localStorage.setItem('mathRenderer', mathRenderer);
        });

        $('input[type=radio][name=areaWidthRatio]').on('change', (e) => {
            localStorage.setItem('areaWidthRatio', e.target.value.toString());
            setAreaWidthRatio(e.target.value.toString());
        });

        $('input[type=radio][name=displayLanguage]').on('change', (e) => reloadWithLanguage((e.target.value).toString()));
        $('.language-flag').on('click', (e)=> {reloadWithLanguage(e.target.dataset['language'])});

        $('#btnCollapseAll').on('click', ()=> {
            $(document.body).find('[data-has-tooltip]').popover('hide');
            $('[data-toggle="collapse"]').not('.manual-collapse').addClass('collapsed');
            $('.step-body.collapse').not('.manual-collapse').removeClass('show');
        });
        $('#btnExpandAll').on('click', () => {
            $('[data-toggle="collapse"]').not('.manual-collapse').removeClass('collapsed');
            $('.step-body.collapse').not('.manual-collapse').addClass('show');
        });

        $('#btnResetLocalStorage').on('click', () => {localStorage.clear(); location.reload();});

        $('.social-share a').on('click', (e) => {
            window.open(
                e.target.href,
                '',
                'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=600,width=600'
            );
            return false;
        });
    }

    function highlightKeywordEverywhere(keyword) {
        if(!(keyword in keywordIndex))
            return;

        function highlightKeywordInFormulas(element, keyword) {
            if(mathRenderer === 'MathJax'){
                $(element).find('annotation[encoding="application/x-tex"]').each((_, e) => {
                    let $e = $(e);
                    $e.text().includes(keyword) && $e.parent().addClass('highlighted-blinking');
                });
            }
            else {
                $(element).find('.katex-html').each((_, e)=> {
                    let $e = $(e);
                    if ($e.closest('.katex').find('annotation[encoding="application/x-tex"]').text().includes(keyword)) {
                        $e.addClass('highlighted-blinking');
                    }
                });
            }
        }

        let stepList = keywordIndex[keyword].steps;
        $('.collapse').each((_, element) => {
            $(element).find('.highlighted-blinking').removeClass('highlighted-blinking').fadeTo(0, 1);
            if (element.id && element.id.toString().match(/^step\d/) && !stepList.includes(element.id.toString().replace(/^step/, ''))) {
                $(element).find('[data-has-tooltip]').popover('hide');
                $(element).collapse('hide');
            }
        });

        for (let i = 0; i < stepList.length; ++i) {
            let stepSelector = `#step${stepList[i]}`;
            let stepDOMnode = document.querySelector(stepSelector);
            $(stepDOMnode).collapse('show');
            highlightKeywordInFormulas(stepDOMnode, keyword);

            let editorInstance = $(`${stepSelector} .latex-source-area`)[0].editorInstance || {findAll: () => {}};

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
        let offset = $(`#step${stepList[0]}`).offset();
        $('html, body').animate({
            scrollTop: offset.top,
            scrollLeft: offset.left
        });
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
            .replace(/``/g, '“')
            .replace(/''/g, '”')
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
                ($0, $1) => $1 ? $0 : 'ł'
            ).replace(
                /(\\)?\\o(?=[^a-zA-Z])/,
                ($0, $1) => $1 ? $0 : 'ø'
            ).replace(
                /(\\)?\\,/g,
                ($0, $1) => $1 ? $0 : ' '
            ).replace(
                /(\\)?\\ /g,
                ($0, $1) => $1 ? $0 : ' '
            ).replace(
                /(\\)?~/g,
                ($0, $1) => $1 ? $0 : ' '
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

    function preprocessLaTeX(element) {
        const $element = $(element);
        let text = $element.text();
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
            $element.text('');
            if (prefix) {
                $element.append($('<span></span>').append(document.createTextNode(prefix)));
            }
            let tag = tokens.command.substring(5);
            $element
                .append($(`<${tag}></${tag}>`)
                    .append(document.createTextNode(tokens.value)));
            $element.find(`> ${tag}`).each((i, e) => preprocessLaTeX(e));
            if (tokens.remainder) {
                $element.append($('<span></span>').append(document.createTextNode(tokens.remainder)));
            }
            $element.find('> span').each((i, e) => preprocessLaTeX(e));
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
            $element.text('');
            $element.append($('<span></span>').append(document.createTextNode(prefix)));
            if (remainderNoBrake) {
                $element.append(
                    $('<nobr></nobr>').append(
                        $('<code></code>').append(document.createTextNode(verbText))
                    ).append(
                        document.createTextNode(remainderNoBrake)
                    )
                );
            }
            else {
                $element.append($('<nobr></nobr>').append($('<code></code>').append(document.createTextNode(verbText))));
            }

            $element.append($('<span></span>').append(document.createTextNode(postfix)));
            $element.find('> span').each((i, e)=> preprocessLaTeX(e));
            flattenElement(element);
            return;
        }

        pos = text.search(/\\(textit|textbf|subsection|href|emph){|\\par[^a-zA-Z]/);
        if (pos >= 0) {
            let prefix = text.substring(0, pos);
            let tokens = parseCommandArgs(text.substring(pos));
            $element.text('');
            $element.append($('<span></span>').append(document.createTextNode(prefix)));

            if (['\\textbf', "\\textit", "\\emph"].includes(tokens.command)) {
                let tag = tokens.command === '\\textbf' ? 'strong' : 'em';
                $element
                    .append($(`<${tag}></${tag}>`)
                        .append(document.createTextNode(tokens.value)));
                $element.find(`> ${tag}`).each((_, e) => preprocessLaTeX(e));
            }
            else if (tokens.command === '\\subsection') {
                $element.append($('<h5 class="mt-4"></h5>').append(document.createTextNode(tokens.value)));
                $element.find('> h5').each((i, e) => preprocessLaTeX(e));
            }
            else if (tokens.command === '\\href') {
                const href = tokens.value;
                tokens = parseCommandArgs(tokens.remainder);
                $element
                    .append($(`<a rel="external" href="${href}"></a>`)
                        .append(document.createTextNode(tokens.value)));
                $element.find('> a').each((i, e) => preprocessLaTeX(e));
            }
            else if (tokens.command === '\\par') {
                $element.append($('<p>'));
            }


            $element.append($('<span></span>').append(document.createTextNode(tokens.remainder)));
            $element.find('> span').each((i, e) => preprocessLaTeX(e));
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
            'multline', 'multline*' // Add more environments if needed
        ];

        // multline is not supported by KaTeX yet
        environments.forEach(env => {
            text = text.replace(`\\begin{${env}}`, `\\[\\begin{${env}}`).replace(`\\end{${env}}`, `\\end{${env}}\\]`);
        });

        text = text.replace(
            /\\(ref|eqref)\{([^}]+)}(?!\$)/g,
            '\\(\\$1{$2}\\)'
        )

        $element.text(text);
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
                                const $span = $(span);
                                const $tooltipHost = $span.find(
                                    mathRenderer === 'KaTeX' ? '.katex-html'
                                        : MathJax && MathJax.tex2svg ? 'svg' : 'mjx-container'
                                );
                                $tooltipHost.popover({
                                    content: $('<code></code>').text(originalSource),
                                    html: true,
                                    placement: 'bottom',
                                    trigger: showTooltipOnClick ? 'click' : 'hover'
                                }).css('cursor', 'default').attr('data-has-tooltip', true);
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
                                    $(span).find('annotation[encoding="application/x-tex"]').text(originalSource);
                                }
                                catch (e) {
                                    $(span).css('color', 'red').text(msgKatexUnableToDisplayFormula);
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
        const $container = $(container);
        const lessonString = $container.text().trim();
        const lessonSteps = lessonString.split(/(^\s*\\section{.*}\s*$)/m);
        const $lessonContainer = $('<div class="lesson-container"></div>');
        $container.after($lessonContainer);
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

            const $stepCard = $('<div class="card step-card mt-2"></div>');

            $stepCard.append(
                $('<div class="card-header step-header"></div>')
                    .attr('id', `stepheading${stepIdString}`)
                    .attr('data-toggle', 'collapse')
                    .attr('data-target', `#step${stepIdString}`)
                    .addClass(startCollapsed ? 'collapsed' : '')
                    .append($('<h4 class="h4"></h4>').text(headerText))
            );

            const $stepCardBody = $('<div class="card-body step-body collapse"></div>')
                .attr('id', `step${stepIdString}`)
                .addClass(startCollapsed ? '' : 'show');

            if (staticPart) {
                const $staticPartArea = $('<div class="card-text static-part-area"></div>')
                    .attr('id', `spa${stepIdString}`)
                    .text(staticPart);
                preprocessLaTeX($staticPartArea[0]);
                $stepCardBody
                    .addClass('force-source-visibility')
                    .append($staticPartArea);
            }

            const savedSource = localStorage.getItem(`${displayLanguage}-${stepIdString}`);
            if(savedSource)
                bodyText = savedSource;

            const $sourceArea = $('<div class="card-text latex-source-area col-md-5"></div>')
                .attr('id', `lsa${stepIdString}`)
                .text(bodyText);

            const $resultDisplayArea = $('<div class="card-text result-display-area col-md-7"></div>')
                .attr('id', `rda${stepIdString}`)
                .text(bodyText);

            preprocessLaTeX($resultDisplayArea[0]);

            $stepCard.append(
                $stepCardBody.append(
                    $('<div class="row"></div>')
                        .append($resultDisplayArea)
                        .append($sourceArea)
                )
            );

            $lessonContainer.append($stepCard);

            $sourceArea.on('resize', (e) => {
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

            $sourceArea.off('click').on('click', () => {
                const newEditor = attachAce($sourceArea[0]);
                newEditor && newEditor.focus();
            });

            $sourceArea[0].originalText = $sourceArea[0].textContent;
            $sourceArea[0].rda = $resultDisplayArea[0];
            if(singleAceInstance)
                aceHighlighter($sourceArea[0], aceEditorOptions);
            else
                attachAce($sourceArea[0]);
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

        setLoadingStatus(`${msgLoadingSection} “${src}”…`);

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
            $(`#step${stepId}.collapse`).collapse('show');
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
                $searchInput.val(kw);
                highlightKeywordEverywhere(kw);
            }
        }
    }

    function buildTableOfContents(){
        let tocHtml = '<ul>';
        let prevLevel = -1;
        $('section.main-content[style*="block"] h2, section.main-content[style*="block"] div.card-header').each((_, e) => {
            if(e.tagName.toLowerCase() === 'div'){
                let target = e.getAttribute('data-target').replace('#step', '');
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
        $('#tableofcontents').html(tocHtml);
        document.querySelectorAll('a.toc-link').forEach((element) => {
            const stepId = element.getAttribute('data-target');
            element.addEventListener('click', () => {
                $(`#step${stepId}.collapse`).collapse('show');
                window.location.hash = '';
                window.location.hash = `#stepheading${stepId}`;
                let offset = $(`#stepheading${stepId}`).offset();
                $('html, body').animate({
                    scrollTop: offset.top,
                    scrollLeft: offset.left
                });
            })
        });
    }

    function finalizer() {
        $('script[type="text/latexlesson"][toprocess]').each((index, element) => {
            element.removeAttribute('toprocess');
            setLoadingStatus(`${msgProcessingSection} ${index}…`);
            processLessonContainer(element, (index + 1).toString());
        });

        setLoadingStatus(msgProcessingMathOnPage);

        mathRendererFactory(document.body, true, () => {
            setLoadingStatus(msgFinishedLoading);
            $('#loadingToast').fadeOut(1000);
        })();

        if (!window.location.hash && startCollapsed) {
            const $intro = $('.step-header[data-target="#step1-1"]');
            if(highlightIntro)
                $intro.addClass('highlighted-blinking');

            $(document.body).off('click').on('click', () => {
                $intro.removeClass('highlighted-blinking').fadeTo(0, 1);
                $('.fa.fa-search').removeClass('highlighted-blinking').fadeTo(0, 1);
            });
            const $searchIcon = $('.fa.fa-search');
            $searchInput.off('click').on('click', () => {$searchIcon.removeClass('highlighted-blinking').fadeTo(0, 1)});
            $searchIcon.addClass('highlighted-blinking');
        }

        let keywordIndexList = [];
        for (let kwd in keywordIndex) {
            keywordIndexList.push(kwd);
        }

        function typeaheadEventHandler() {
            const kw = $searchInput.typeahead('val');
            if ($searchInput.val() === kw) {
                highlightKeywordEverywhere(kw);
            }
        }

        function typeaheadTokenizer(str) {
            return str ? str.split(/[^a-zабвгдеёжзиклмнопрстуфхцчшщьыъэюя]/i) : []
        }

        $searchInput.typeahead(
            {
                highlight: true,
                hint: false,
                minLength: 2,
                classNames: {
                    input: 'form-control',
                    hint: 'form-control',
                    menu: 'list-group',
                    suggestion: 'list-group-item',
                    cursor: 'active'
                }
            },
            {
                name: 'keywords',
                source: new Bloodhound({
                    datumTokenizer: typeaheadTokenizer,
                    queryTokenizer: typeaheadTokenizer,
                    local: keywordIndexList
                })
            }
        ).on('typeahead:select', typeaheadEventHandler);

        buildTableOfContents();

        $('#searchForm').off('submit').on('submit', () => {typeaheadEventHandler(); return false});

        $('.highlighted-blinking').off('focus').on('focus', (e) => {
            $(e.target).removeClass('highlighted-blinking').fadeTo(0, 1);
        });
        $('.step-body').off('click').on('click', (e) => {$(e.target).find('.highlighted-blinking').removeClass('highlighted-blinking').fadeTo(400, 1)});
        $('.collapse').on('hide.bs.collapse', (e) => {$(e.target).find('[data-has-tooltip]').popover('hide')});

        handleLocationHash();
    }

    function masterReload(){
        $('section.main-content').css('display', 'none');
        $(`section.main-content[lang="${displayLanguage}"]`).css('display', 'block');
        for(let s of document.querySelectorAll(`section[lang="${displayLanguage}"] > script[type="text/latexlesson"][data-src]`)){
            s.setAttribute('toload', 'true');
        }
        keywordIndex = {};
        loadExternalScriptsAndFinalize(finalizer);
    }

    function initializeDarkThemeSwitch(){
        // Adapted from https://www.cssscript.com/dark-mode-switcher-bootstrap/
        const darkSwitch = document.getElementById('darkSwitch');
        darkSwitch.checked = (displayTheme === 'dark');

        function applyTheme(theme){
            document.body.setAttribute('data-theme', theme);
            darkSwitch.checked = (theme === 'dark');
            aceEditorOptions.theme = theme === 'dark' ? 'ace/theme/clouds_midnight' : 'ace/theme/chrome';
            $('.latex-source-area').each((_, element) =>
                element.editorInstance && element.editorInstance.setTheme(aceEditorOptions.theme)
            );
        }

        function setTheme(theme){
            displayTheme = theme;
            localStorage.setItem('theme', displayTheme);
            $(`input[type=radio][name=theme][value="${displayTheme}"]`)[0].checked = true;
            applyTheme(theme);
        }

        setTheme(displayTheme);
        darkSwitch.onchange = () => {setTheme(darkSwitch.checked ? 'dark' : 'light');};
        $('input[type=radio][name=theme]').on('change', (e) => setTheme(e.target.value.toString()));
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