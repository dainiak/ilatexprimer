$(function() {
    let displayLanguage = localStorage.getItem('displayLanguage') || (navigator.languages.indexOf('ru') >= 0 ? 'ru' : 'en');
    let displayTheme = localStorage.getItem('theme') || (
        window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    );
    let startCollapsed = true;
    let highlightIntro = false;
    let mathRenderer = localStorage.getItem('mathRenderer') !== 'KaTeX' ? 'MathJax' : 'KaTeX';
    let typesetOnChange = localStorage.getItem('typesetOnChange') !== null ? localStorage.getItem('typesetOnChange') === 'true' : true;
    let singleAceInstance = localStorage.getItem('singleAceInstance') === 'true' || false;
    let keywordIndex = {};
    let aceHighlighter = ace.require('ace/ext/static_highlight');

    function setLoadingStatus(text) {
        $('#loadingToast').text(text);
    }

    let aceEditorOptions = {
        theme: 'ace/theme/chrome',
        mode: 'ace/mode/latex',
        minLines: 3,
        maxLines: Infinity,
        fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', // mimic Bootstrap
        fontSize: '90%', // mimic Bootstrap
        wrap: true,
        showGutter: true,
        fadeFoldWidgets: false,
        showPrintMargin: false
    };

    function attachAce(sourceArea){
        if(sourceArea.editorInstance)
            return;

        let div = document.createElement('div');

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
            let rda = editor.container.parentNode.rda;
            $(rda).find('[data-has-tooltip]').popover('dispose');
            let value = editor.getValue().trim();
            localStorage.setItem(displayLanguage + '-' + rda.id.replace('rda', ''), value);
            rda.textContent = value.replace(/^\\par\s+/, '');
            preprocessLaTeX(rda);
            if(mathRenderer === 'MathJax') {
                MathJax.texReset();
            }
            mathRendererFactory(rda)();
        }

        editor.commands.addCommand({
            name: 'typeset',
            bindKey: 'Ctrl-Enter',
            exec: typesetEditorContent
        });

        editor.on('change', function () {
            if (typesetOnChange)
                typesetEditorContent();
        });

        editor.customDestroyer = function () {
            let value = editor.getValue().trim();
            sourceArea.originalText = value;
            if (typesetOnChange) {
                typesetEditorContent();
            }
            if (singleAceInstance) {
                sourceArea.editorInstance = null;
                editor.destroy();
                let container = editor.container;
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

    setInterval(function () {
        $('.highlighted-blinking').each(function(index, element) {
            let $e = $(element);
            let opacity = parseFloat($e.css('opacity'));
            opacity = opacity <= 0.3 ? opacity : 1;
            $e.fadeTo(200, 1.2 - opacity);
        });
    }, 300);

    $('input[type=radio][name=mathRenderer][value="' + mathRenderer + '"]')[0].checked = true;
    $('input[type=radio][name=typesetOnChange][value="' + typesetOnChange.toString() + '"]')[0].checked = true;
    $('input[type=radio][name=singleAceInstance][value="' + singleAceInstance.toString() + '"]')[0].checked = true;
    $('input[type=radio][name=theme][value="' + displayTheme + '"]')[0].checked = true;

    if (localStorage.getItem('areaWidthRatio') !== null){
        $('input[type=radio][name=areaWidthRatio][value="' + localStorage.getItem('areaWidthRatio') +'"]')[0].checked = true;
    }

    $('input[type=radio][name=singleAceInstance]').change(function () {
        singleAceInstance = (this.value === 'true');
        localStorage.setItem('singleAceInstance', singleAceInstance);
        $('.latex-source-area').each(function(index, element) {
            if(singleAceInstance)
                element.editorInstance.customDestroyer.call();
            else
                attachAce(element);
        });
    });

    $('input[type=radio][name=typesetOnChange]').change(function () {
        typesetOnChange = (this.value === 'true');
        localStorage.setItem('typesetOnChange', typesetOnChange);
    });

    $('input[type=radio][name=mathRenderer]').change(function () {
        mathRenderer = this.value;
        localStorage.setItem('mathRenderer', mathRenderer);
    });

    function setAreaWidthRatio(ratioCode) {
        if (ratioCode !== '0') {
            $('.latex-source-area')
                .removeClass('col-md-4')
                .removeClass('col-md-5')
                .removeClass('col-md-6')
                .removeClass('col-md-7')
                .removeClass('col-md-8')
                .removeClass('col-md-12')
                .addClass('col-md-' + ratioCode)
                .show()
                .trigger('resize');
            $('.result-display-area')
                .removeClass('col-md-4')
                .removeClass('col-md-5')
                .removeClass('col-md-6')
                .removeClass('col-md-7')
                .removeClass('col-md-8')
                .removeClass('col-md-12')
                .addClass('col-md-' + (12 - parseInt(ratioCode)).toString());
        }
        else {
            $('.latex-source-area').not('.force-source-visibility .latex-source-area')
                .removeClass('col-md-4')
                .removeClass('col-md-5')
                .removeClass('col-md-6')
                .removeClass('col-md-7')
                .removeClass('col-md-8')
                .hide();
            $('.result-display-area').not('.force-source-visibility .result-display-area')
                .removeClass('col-md-4')
                .removeClass('col-md-5')
                .removeClass('col-md-6')
                .removeClass('col-md-7')
                .removeClass('col-md-8')
                .addClass('col-md-12');
        }
    }

    if(localStorage.getItem('areaWidthRatio') !== null)
        setAreaWidthRatio(localStorage.getItem('areaWidthRatio'));

    $('input[type=radio][name=areaWidthRatio]').change(function(){
        localStorage.setItem('areaWidthRatio', this.value.toString());
        setAreaWidthRatio(this.value.toString());
    });

    $('input[type=radio][name=displayLanguage]').change(function () {
        displayLanguage = (this.value).toString();
        setUILanguage(displayLanguage);
        localStorage.setItem('displayLanguage', displayLanguage);
        masterReload();
    });

    $('#btnCollapseAll').click(function () {
        $(document.body).find('[data-has-tooltip]').popover('hide');
        $('[data-toggle="collapse"]').not('.manual-collapse').addClass('collapsed');
        $('.step-body.collapse').not('.manual-collapse').removeClass('show');
    });
    $('#btnExpandAll').click(function () {
        $('[data-toggle="collapse"]').not('.manual-collapse').removeClass('collapsed');
        $('.step-body.collapse').not('.manual-collapse').addClass('show');
    });

    $('#btnResetLocalStorage').click(function () {
        localStorage.clear();
        location.reload();
    });

    $('.social-share a').click(function () {
        window.open(
                this.href,
                '',
                'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=600,width=600'
        );
        return false;
    });

    function highlighKeywordEverywhere(keyword) {
        if(!(keyword in keywordIndex))
            return;

        function highlightKeywordInFormulas(element, keyword) {
            if(mathRenderer === 'MathJax'){
                $(element).find('annotation[encoding="application/x-tex"]').each(function (i, e) {
                    let $e = $(e);
                    if ($e.text().includes(keyword)) {
                        $e.parent().addClass('highlighted-blinking');
                    }
                });
            }
            else {
                $(element).find('.katex-html').each(function (i, e) {
                    let $e = $(e);
                    if ($e.closest('.katex').find('annotation[encoding="application/x-tex"]').text().includes(keyword)) {
                        $e.addClass('highlighted-blinking');
                    }
                });
            }
        }

        let stepList = keywordIndex[keyword].steps;
        $('.collapse').each(function (index, element) {
            $(element).find('.highlighted-blinking').removeClass('highlighted-blinking').fadeTo(0, 1);
            if (element.id && element.id.toString().match(/^step\d/) && !stepList.includes(element.id.toString().replace(/^step/, ''))) {
                $(element).find('[data-has-tooltip]').popover('hide');
                $(element).collapse('hide');
            }
        });

        for (let i = 0; i < stepList.length; ++i) {
            let stepSelector = '#step' + stepList[i];
            $(stepSelector + '.collapse').collapse('show');
            let stepDOMnode = $(stepSelector)[0];
            highlightKeywordInFormulas(stepDOMnode, keyword);

            let editorInstance = $(stepSelector + ' .latex-source-area')[0].editorInstance || {findAll: function (){}};

            if (keywordIndex[keyword].siblings) {
                for (let j = 0; j < keywordIndex[keyword].siblings.length; ++j) {
                    highlightKeywordInFormulas(stepDOMnode, keywordIndex[keyword].siblings[j]);
                }
                editorInstance.findAll(RegExp($.map(keywordIndex[keyword].siblings, function(str){return str.replace(/[\\$^[{}()?.*|]/g, function($0){return '\\'+$0})}).join('|'), 'gi'), {
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
        let offset = $('#step' + stepList[0]).offset();
        $('html, body').animate({
            scrollTop: offset.top,
            scrollLeft: offset.left
        });
    }


    function removeLaTeXComments(text) {
        return text
            .replace(
                /\\verb".*?"/gm,
                function ($0) {return $0.replace(/%/g, '\\%')}
            ).replace(
                /(\\)?%/gm,
                function ($0, $1) {return $1 ? $0 : '\ufeff';}
            ).replace(
                /\\verb".*?"/gm,
                function ($0) {return $0.replace(/\\%/g, '%')
            }).replace(
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
                .replace(/(\\)?\\('|`|^|"|H|~|c|k|=|b|.|d|r|u|v){(.)}/g, function ($0, $1, $2, $3) {
                    if ($1) return $0;
                    switch ($2) {
                        case "'":
                            return $3 + '\u0301';
                        case '`':
                            return $3 + '\u0300';
                        case '^':
                            return $3 + '\u0302';
                        case '"':
                            return $3 + '\u0308';
                        case 'H':
                            return $3 + '\u030B';
                        case '~':
                            return $3 + '\u0303';
                        case 'c':
                            return $3 + '\u0327';
                        case 'k':
                            return $3 + '\u0328';
                        case '=':
                            return $3 + '\u0304';
                        case 'b':
                            return $3 + '\u0331';
                        case '.':
                            return $3 + '\u0307';
                        case 'd':
                            return $3 + '\u0323';
                        case 'r':
                            return $3 + '\u030A';
                        case 'u':
                            return $3 + '\u0306';
                        case 'v':
                            return $3 + '\u030C';
                        default:
                            return $3;
                    }
                })
                .replace(
                    /(\\)?\\t{(..)}/g,
                    function ($0, $1, $2) {return $1 ? $0 : $2 + '\u0361'}
                ).replace(
                    /(\\)?\\l{}/,
                    function ($0, $1) {return $1 ? $0 : 'ł'}
                ).replace(
                    /(\\)?\\o(?=[^a-zA-Z])/,
                    function ($0, $1) {return $1 ? $0 : 'ø'}
                ).replace(
                    /(\\)?\\,/g,
                    function ($0, $1) {return $1 ? $0 : ' '}
                ).replace(
                    /(\\)?\\ /g,
                    function ($0, $1) {return $1 ? $0 : ' '}
                ).replace(
                    /(\\)?~/g,
                    function ($0, $1) {return $1 ? $0 : ' '}
                ).replace(
                    /(\\)?\\textbackslash/g,
                    function ($0, $1) {return $1 ? $0 : '\\'}
                ).replace(
                    /(\\)?\\textasciitilde/g,
                    function ($0, $1) {return $1 ? $0 : '~'}
                ).replace(
                    /\\%/g,
                    '%'
                );
    }

    function processLaTeXTextInElement(element) {
        for (let i = 0; i < element.childNodes.length; ++i) {
            let node = element.childNodes[i];
            if (node.nodeType === 3) {
                element.replaceChild(document.createTextNode(processLaTeXText(node.textContent)), node);
            }
            else if (node.nodeType === 1 && !node.classList.contains('latex-source-area') && ['script', 'noscript', 'style', 'textarea', 'pre', 'code'].indexOf(node.nodeName.toLowerCase()) < 0) {
                processLaTeXTextInElement(node);
            }
        }
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

            if (closingBrace === '') {
                if (currentSymbol === '{') {
                    valuePos = i + 1;
                    closingBrace = '}';
                }
            }
            if ((currentSymbol === '{' || currentSymbol === '}') && (i === 0 || text.charAt(i - 1) !== '\\'))
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
        if (element.tagName.toLowerCase() === 'span' && element.classList.length === 0) {
            let children = [];
            for (let i = 0; i < element.childNodes.length; ++i) {
                children.push(element.childNodes[i]);
            }
            for (i = 0; i < children.length; ++i) {
                element.removeChild(children[i]);
                element.parentNode.insertBefore(children[i], element);
            }
            element.parentNode.removeChild(element);
        }
    }

    function preprocessLaTeX(element) {
        let $element = $(element);
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
            let prefix = text.substring(0, pos);
            let tokens = parseCommandArgs(text.substring(pos));
            $element.text('');
            if (prefix) {
                $element.append($('<span></span>').append(document.createTextNode(prefix)));
            }
            let tag = tokens.command.substring(5);
            $element
                    .append($('<' + tag + '></' + tag + '>')
                            .append(document.createTextNode(tokens.value)));
            $element.find('> ' + tag).each(function (i, e) {
                preprocessLaTeX(e)
            });
            if (tokens.remainder) {
                $element.append($('<span></span>').append(document.createTextNode(tokens.remainder)));
            }
            $element.find('> span').each(function (i, e) {
                preprocessLaTeX(e)
            });
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
            if (remainderNoBrake === '.' || remainderNoBrake === ',') {
                postfix = postfix.substring(1);
            }
            else {
                remainderNoBrake = '';
            }
            $element.text('');
            $element.append($('<span></span>').append(document.createTextNode(prefix)));
            if (remainderNoBrake) {
                $element
                        .append($('<nobr></nobr>')
                                .append($('<code></code>')
                                        .append(document.createTextNode(verbText)))
                                .append(document.createTextNode(remainderNoBrake)));
            }
            else {
                $element
                        .append($('<nobr></nobr>')
                                .append($('<code></code>')
                                        .append(document.createTextNode(verbText))));
            }

            $element.append($('<span></span>').append(document.createTextNode(postfix)));
            $element.find('> span').each(function (i, e) {
                preprocessLaTeX(e)
            });
            flattenElement(element);
            return;
        }

        pos = text.search(/\\(textit|textbf|href|emph){|\\par[^a-zA-Z]/);
        if (pos >= 0) {
            let prefix = text.substring(0, pos);
            let tokens = parseCommandArgs(text.substring(pos));
            $element.text('');
            $element.append($('<span></span>').append(document.createTextNode(prefix)));

            if (['\\textbf', "\\textit", "\\emph"].includes(tokens.command)) {
                let tag = tokens.command === '\\textbf' ? 'strong' : 'em';
                $element
                        .append($('<' + tag + '></' + tag + '>')
                                .append(document.createTextNode(tokens.value)));
                $element.find('> ' + tag).each(function (i, e) {
                    preprocessLaTeX(e)
                });
            }
            else if (tokens.command === '\\href') {
                let href = tokens.value;
                tokens = parseCommandArgs(tokens.remainder);
                $element
                        .append($('<a rel="external" href="' + href + '"></a>')
                                .append(document.createTextNode(tokens.value)));
                $element.find('> a').each(function (i, e) {
                    preprocessLaTeX(e)
                });
            }
            else if (tokens.command === '\\par') {
                $element.append($('<p>'));
            }


            $element.append($('<span></span>').append(document.createTextNode(tokens.remainder)));
            $element.find('> span').each(function (i, e) {
                preprocessLaTeX(e)
            });
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
        text = text.replace(
            '\\begin{equation',
            '\\[\\begin{equation'
        ).replace(
            '\\end{equation}',
            '\\end{equation}\\]'
        ).replace(
            '\\end{equation*}',
            '\\end{equation*}\\]'
        ).replace(
            '\\begin{gather',
            '\\[\\begin{gather'
        ).replace(
            '\\end{gather}',
            '\\end{gather}\\]'
        ).replace(
            '\\end{gather*}',
            '\\end{gather*}\\]'
        ).replace(
            '\\begin{align',
            '\\[\\begin{align'
        ).replace(
            '\\end{align}',
            '\\end{align}\\]'
        ).replace(
            '\\end{align*}',
            '\\end{align*}\\]'
        ).replace( // multline is not supported by KaTeX yet
            '\\begin{multline',
            '\\[\\begin{multline'
        ).replace(
            '\\end{multline}',
            '\\end{multline}\\]'
        ).replace(
            '\\end{multline*}',
            '\\end{multline*}\\]'
        )

        text = text.replace(
            /\\ref\{([^}]+)}(?!\$)/g,
            '\\(\\ref{$1}\\)'
        ).replace(
            /\\eqref\{([^}]+)}(?!\$)/g,
            '\\(\\eqref{$1}\\)'
        )

        $element.text(text);
    }

    function mathRendererFactory(element, performPostprocessing, callback) {
        performPostprocessing = (performPostprocessing !== false);

        function findClosingToken(tokens, start){
            let stack = [];
            for(let i = start; i < tokens.length; ++i){
                let token = tokens[i];
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
                let node = element.childNodes[i];
                if (node.nodeType === 3) {
                    let tokens = node.textContent.split(/(\${1,2}|\\\[|\\]|\\\(|\\\))/);

                    if (tokens.length <= 1) {
                        continue;
                    }

                    let container = document.createElement('span');
                    element.replaceChild(container, node);

                    for (let j = 0; j < tokens.length; ++j) {
                        let token = tokens[j];
                        if (['\\(', '$', '$$', '\\['].includes(token)) {
                            let jClosing = findClosingToken(tokens, j);
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

                            if(mathRenderer === 'MathJax') {
                                let options = MathJax.getMetricsFor(document.body, displayMode);
                                options.display = displayMode;
                                let mjElement = (MathJax.tex2svg || MathJax.tex2chtml)(
                                    preparedSource,
                                    options
                                );

                                let annotation = document.createElement('annotation');
                                annotation.setAttribute('encoding', 'application/x-tex');
                                annotation.style.display = 'none';
                                annotation.innerText = originalSource;
                                mjElement.appendChild(annotation);
                                span.appendChild(mjElement);
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
                            }
                            let $span = $(span);
                            let $tooltipHost = $span.find(
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

        return function () {
            if(mathRenderer === 'MathJax') {
                MathJax.texReset();
            }
            processWithRenderer(element);
            if (performPostprocessing) {
                processLaTeXTextInElement(element);
            }
            if(mathRenderer === 'MathJax' && MathJax.tex2chtml){
                MathJax.startup.document.clear();
                MathJax.startup.document.updateDocument();
            }
            if (callback) {
                callback.call();
            }
        }
    }

    function processLessonContainer(container, containerFootprint) {
        containerFootprint = containerFootprint || '';
        let $container = $(container);
        let lessonString = $container.text().trim();
        let lessonSteps = lessonString.split(/(^\s*\\section{.*}\s*$)/m);
        let $lessonContainer = $('<div class="lesson-container"></div>');
        $container.after($lessonContainer);
        container.parentNode.removeChild(container);

        for (let i = 1; i < lessonSteps.length; i += 2) {
            let stepIdString = containerFootprint + '-' + ((i + 1) / 2).toString();
            let headerText = lessonSteps[i].trim();
            headerText = headerText.substring('\\section{'.length, headerText.length - 1);
            let bodyText = lessonSteps[i + 1].trim().replace(/\\index{([^}]+)}/g, function ($0, $1) {
                let keywords = $1.split(',');
                for (let i = 0; i < keywords.length; ++i) {
                    let siblings = keywords[i].trim().split('=');
                    for (let j = 0; j < siblings.length; ++j) {
                        siblings[j] = siblings[j].trim();
                    }
                    for (j = 0; j < siblings.length; ++j) {
                        let keyword = siblings[j];
                        if (!(keyword in keywordIndex)) {
                            keywordIndex[keyword] = {
                                steps: []
                            };
                        }
                        if (!keywordIndex[keyword].steps.includes(stepIdString)) {
                            keywordIndex[keyword].steps.push(stepIdString);
                        }
                        if (siblings.length > 1) {
                            if (keywordIndex[keyword].siblings === undefined) {
                                keywordIndex[keyword].siblings = [];
                            }
                            for (let k = 0; k < siblings.length; ++k) {
                                if (!keywordIndex[keyword].siblings.includes(siblings[k])) {
                                    keywordIndex[keyword].siblings.push(siblings[k]);
                                }
                            }
                        }
                    }
                }
                return '';
            }).trim().replace(/^\\par\s+/, '');

            let staticPartMatch = bodyText.match(/^\\begin{staticpart}([\s\S]+?)\\end{staticpart}([\s\S]*)$/);
            let staticPart = '';
            if (staticPartMatch) {
                staticPart = staticPartMatch[1].trim().replace(/^\\par\s+/, '');
                bodyText = staticPartMatch[2].trim().replace(/^\\par\s+/, '');
            }

            let $stepCard = $('<div class="card step-card mt-2"></div>');

            $stepCard.append(
                $('<div class="card-header step-header"></div>')
                    .attr('id', 'stepheading' + stepIdString)
                    .attr('data-toggle', 'collapse')
                    .attr('data-target', '#step' + stepIdString)
                    .addClass(startCollapsed ? 'collapsed' : '')
                    .append(
                        $('<h4 class="h4"></h4>').text(headerText)
                    )
            );

            let $stepCardBody = $('<div class="card-body step-body collapse"></div>')
                .attr('id', 'step' + stepIdString)
                .addClass(startCollapsed ? '' : 'show');

            if (staticPart) {
                let $staticPartArea = $('<div class="card-text static-part-area"></div>')
                    .attr('id', 'spa' + stepIdString)
                    .text(staticPart);
                preprocessLaTeX($staticPartArea[0]);
                $stepCardBody
                    .addClass('force-source-visibility')
                    .append($staticPartArea);
            }

            let savedSource = localStorage.getItem(displayLanguage + '-' + stepIdString);
            if(savedSource)
                bodyText = savedSource;

            let $sourceArea = $('<div class="card-text latex-source-area col-md-5"></div>')
                .attr('id', 'lsa' + stepIdString)
                .text(bodyText);

            let $resultDisplayArea = $('<div class="card-text result-display-area col-md-7"></div>')
                .attr('id', 'rda' + stepIdString)
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

            $sourceArea.on('resize', function () {
                if(this.editorInstance) {
                    this.editorInstance.resize();
                }
                else {
                    let div = document.createElement('div');
                    div.textContent = this.originalText;
                    this.innerHTML = '';
                    this.appendChild(div);
                    aceHighlighter(div, aceEditorOptions);
                }
            });

            $sourceArea.click(function(){
                let newEditor = attachAce(this);
                if(newEditor)
                    newEditor.focus();
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
        let externalScript = document.querySelector('section[lang="' + displayLanguage +  '"] > script[type="text/latexlesson"][data-src][toload]');
        if(!externalScript) {
            return finalizer.call();
        }

        let src = 'content/' + displayLanguage + '/tex/' + externalScript.dataset['src'];
        externalScript.removeAttribute('data-src');
        externalScript.removeAttribute('toload');
        externalScript.setAttribute('toprocess', 'true');

        setLoadingStatus(msgLoadingSection + ' “' + src + '”…');

        $.ajax({
            url: src,
            dataType: 'text',
            success: function(response){
                $(externalScript).text(response);
                loadExternalScriptsAndFinalize(finalizer);
            },
            error: function(){
                if(!externalScript.text().trim()){
                    $(externalScript).text('\\section((' + msgUnableToLoadThisStep + '))}');
                }
                loadExternalScriptsAndFinalize(finalizer);
            }
        });
    }

    function finalizer() {
        $('script[type="text/latexlesson"][toprocess]').each(function (index, element) {
            element.removeAttribute('toprocess');
            setLoadingStatus(msgProcessingSection + ' ' + index + '…');
            processLessonContainer(element, (index + 1).toString());
        });

        setLoadingStatus(msgProcessingMathOnPage);

        mathRendererFactory(document.body, true, function () {
            $('#loadingToast').text(msgFinishedLoading).fadeOut(1000);
        })();

        if (!window.location.hash && startCollapsed) {
            let $intro = $('.step-header[data-target="#step1-1"]');
            if(highlightIntro)
                $intro.addClass('highlighted-blinking');

            $(document.body).on('click', function () {
                $intro.removeClass('highlighted-blinking').fadeTo(0, 1);
                $('.fa.fa-search').removeClass('highlighted-blinking').fadeTo(0, 1);
            });
            $('#searchInput').on('click', function () {
                $('.fa.fa-search').removeClass('highlighted-blinking').fadeTo(0, 1);
            });
            $('.fa.fa-search').addClass('highlighted-blinking');
        }

        if (window.location.hash) {
            let stepId = window.location.hash.replace(/^#(step|stepheading)?(?=\d)/, '');
            let heading = document.getElementById('step' + stepId);
            if (heading) {
                $('#step' + stepId + '.collapse').collapse('show');
                window.location.hash = '';
                window.location.hash = '#stepheading' + stepId;
            }
            else {
                let kw = window.location.hash.substring(1);
                if ((kw in keywordIndex) || (('\\' + kw) in keywordIndex)) {
                    if (!(kw in keywordIndex)) {
                        kw = '\\' + kw;
                    }
                    $('#searchInput').val(kw);
                    highlighKeywordEverywhere(kw);
                }
            }
        }

        let keywordIndexList = [];
        for (let kwd in keywordIndex) {
            keywordIndexList.push(kwd);
        }

        function typeaheadEventHandler() {
            let si = $('#searchInput');
            let kw = si.typeahead('val');
            if (si.val() === kw) {
                highlighKeywordEverywhere(kw);
            }
        }

        function typeaheadTokenizer(str) {
            return str ? str.split(/[^a-zабвгдеёжзиклмнопрстуфхцчшщьыъэюя]/i) : []
        }

        $('#searchInput').typeahead(
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

        $('#searchForm').on('submit', function() {typeaheadEventHandler(); return false})

        $('.highlighted-blinking').on('focus', function () {
            $(this).removeClass('highlighted-blinking').fadeTo(0, 1);
        });
        $('.step-body').on('click', function () {
            $(this).find('.highlighted-blinking').removeClass('highlighted-blinking').fadeTo(400, 1);
        });
        $('.collapse').on('hide.bs.collapse', function () {
            $(this).find('[data-has-tooltip]').popover('hide');
        });

        // Build table of contents
        let tocHtml = '<ul>';
        let prevLevel = -1;
        $('section.main-content[style*="block"] h2, section.main-content[style*="block"] div.card-header').each(function(){
            if(this.tagName.toLowerCase() === 'div'){
                let target = this.getAttribute('data-target').replace('#step', '');
                let heading = this.querySelector('h4').innerHTML;
                if(prevLevel === 0)
                    tocHtml += '<ul>';
                tocHtml += '<li><a class="toc-link" data-target="' + target + '">' + heading + '</a></li>';
                if(prevLevel === -1)
                    prevLevel = 0;
                else
                    prevLevel = 1;
            }
            else {
                if(prevLevel === 1)
                    tocHtml += '</ul></li>';
                
                tocHtml += '<li><strong>' + this.innerHTML + '</strong>';
                prevLevel = 0;
            }
        });
        if(prevLevel === 1)
            tocHtml += '</ul></li>';
        tocHtml += '</ul>';
        $('#tableofcontents').html(tocHtml);
        document.querySelectorAll('a.toc-link').forEach(function(element){
            let stepId = element.getAttribute('data-target');
            element.addEventListener('click', function(){
                $('#step' + stepId + '.collapse').collapse('show');
                window.location.hash = '';
                window.location.hash = '#stepheading' + stepId;
            })
        });
    }

    function masterReload(){
        $('section.main-content').css('display', 'none');
        $('section.main-content[lang="' + displayLanguage + '"]').css('display', 'block');
        for(let s of document.querySelectorAll('section[lang="' + displayLanguage +  '"] > script[type="text/latexlesson"][data-src]')){
            s.setAttribute('toload', 'true');
        }
        loadExternalScriptsAndFinalize(finalizer);
    }

    function initializeDarkThemeSwitch(){
        // Adapted from https://www.cssscript.com/dark-mode-switcher-bootstrap/
        let themeChangeHandlers = [];
        function applyTheme(theme){
            document.body.setAttribute('data-theme', theme);
            for(let handler of themeChangeHandlers)
                handler(theme);

            aceEditorOptions.theme = theme === 'dark' ? 'ace/theme/clouds_midnight' : 'ace/theme/chrome';
            $('.latex-source-area').each(function(index, element) {
                if(element.editorInstance){
                    element.editorInstance.setOption(
                        'theme', 
                        aceEditorOptions.theme
                    );
                }
            });
        }

        function getTheme(){
            return displayTheme;
        }

        function setTheme(theme){
            displayTheme = theme;
            localStorage.setItem('theme', displayTheme);
            $('input[type=radio][name=theme][value="' + displayTheme + '"]')[0].checked = true;
            applyTheme(theme);
        }

        function initTheme() {
            applyTheme(getTheme());
        }

        initTheme();

        let darkSwitch = document.getElementById('darkSwitch');
        darkSwitch.checked = getTheme() === 'dark';
        darkSwitch.onchange = function(){
            setTheme(darkSwitch.checked ? 'dark' : 'light');
        };
        $('input[type=radio][name=theme]').change(function () {
            setTheme(this.value.toString());
        });

        themeChangeHandlers.push(
            theme => darkSwitch.checked = theme === 'dark'
        );
    }

    $(function(){
        initializeDarkThemeSwitch();
        setUILanguage('ru');
        masterReload();
    });
});