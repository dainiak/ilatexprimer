$(function() {
    var startCollapsed = true;
    var mathRenderer = 'MathJax';
    var typesetOnChange = false;
    var singleAceInstance = false;
    var keywordIndex = {};
    var aceHighlighter = ace.require('ace/ext/static_highlight');

    function setLoadingStatus(text) {
        $('#loadingToast').text(text);
    }


    var aceEditorOptions = {
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

        var div = document.createElement('div');

        if(typeof sourceArea.originalText != 'string') {
            sourceArea.originalText = sourceArea.textContent;
        }
        div.textContent = sourceArea.textContent.trim();

        sourceArea.innerHTML = '';
        sourceArea.appendChild(div);
        var editor = ace.edit(div);
        sourceArea.editorInstance = editor;

        editor.$blockScrolling = Infinity; // To disable annoying ACE warning
        editor.setOptions(aceEditorOptions);
        editor.commands.removeCommands(["gotoline", "find"]);
        editor.resize();
        editor.gotoLine(1);

        function typesetEditorContent() {
            var rda = editor.container.parentNode.rda;
            $(rda).find('[data-has-tooltip]').popover('dispose');
            rda.textContent = editor.getValue().trim().replace(/^\\par\s+/, '');
            preprocessLaTeX(rda);
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
            var value = editor.getValue().trim();
            sourceArea.originalText = value;
            if (typesetOnChange) {
                sourceArea.rda.textContent = value;
                preprocessLaTeX(sourceArea.rda);
                mathRendererFactory(sourceArea.rda)();
            }
            if (singleAceInstance) {
                sourceArea.editorInstance = null;
                editor.destroy();
                var container = editor.container;
                container.parentNode.removeChild(container);
                editor.container = null;
                editor.renderer = null;
                editor = null;
                sourceArea.textContent = value;
                aceHighlighter(sourceArea, aceEditorOptions);
            }
        };
        editor.on('blur', editor.customDestroyer);

        return editor;
    }

    setInterval(function () {
        $('.highlighted-blinking').each(function (index, element) {
            var $e = $(element);
            var opacity = parseFloat($e.css('opacity'));
            opacity = opacity <= 0.3 ? opacity : 1;
            $e.fadeTo(200, 1.2 - opacity);
        });
    }, 300);

    if (mathRenderer == 'MathJax')
        $('input[type=radio][name=mathRenderer][value="MathJax"]')[0].checked = true;
    else
        $('input[type=radio][name=mathRenderer][value="KaTeX"]')[0].checked = true;

    if (typesetOnChange)
        $('input[type=radio][name=autoTypeset][value="onChange"]')[0].checked = true;
    else
        $('input[type=radio][name=autoTypeset][value="onHotkey"]')[0].checked = true;

    if (singleAceInstance)
        $('input[type=radio][name=singleAceInstance][value="true"]')[0].checked = true;
    else
        $('input[type=radio][name=singleAceInstance][value="false"]')[0].checked = true;


    $('input[type=radio][name=singleAceInstance]').change(function () {
        singleAceInstance = (this.value == 'true');
        $('.latex-source-area').each(function(index, element) {
            if(singleAceInstance){
                element.editorInstance.customDestroyer.call();
            }
            else {
                attachAce(element);
            }
        });
    });

    $('input[type=radio][name=autoTypeset]').change(function () {
        typesetOnChange = (this.value == 'onChange');
        if (this.value == 'onChange' && mathRenderer == 'MathJax' && confirm(confirmationSwitchToKaTeX) === true) {
            $('input[type=radio][name=mathRenderer][value="KaTeX"]')[0].checked = true;
            mathRenderer = 'KaTeX';
        }
    });

    $('input[type=radio][name=mathRenderer]').change(function () {
        if (this.value == 'MathJax' && typesetOnChange) {
            mathRenderer = this.value;
            if (confirm(confirmationCtrlEnter) === true) {
                $('input[type=radio][name=autoTypeset][value="onChange"]')[0].checked = false;
                $('input[type=radio][name=autoTypeset][value="onHotkey"]')[0].checked = true;
                typesetOnChange = false;
            }
        }
        else if (this.value == 'KaTeX' && !typesetOnChange) {
            if (confirm(confirmationKaTeXLowerCompatibility) === true) {
                mathRenderer = this.value;
            }
            else {
                $('input[type=radio][name=mathRenderer][value="MathJax"]')[0].checked = true;
            }
        }
        else {
            mathRenderer = this.value;
        }
    });

    $('input[type=radio][name=areaWidthRatio]').change(function () {
        if ((this.value).toString() !== '0') {
            $('.latex-source-area')
                .removeClass('col-md-4')
                .removeClass('col-md-5')
                .removeClass('col-md-6')
                .removeClass('col-md-7')
                .removeClass('col-md-8')
                .addClass('col-md-' + (this.value).toString())
                .show()
                .trigger('resize');
            $('.result-display-area')
                .removeClass('col-md-4')
                .removeClass('col-md-5')
                .removeClass('col-md-6')
                .removeClass('col-md-7')
                .removeClass('col-md-8')
                .addClass('col-md-' + (12 - parseInt(this.value)).toString());
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
    });

    $('#btnCollapseAll').click(function () {
        $('[data-toggle="collapse"]').not('.manual-collapse').addClass('collapsed');
        $('.step-body.collapse').not('.manual-collapse').removeClass('show');
    });
    $('#btnExpandAll').click(function () {
        $('[data-toggle="collapse"]').not('.manual-collapse').removeClass('collapsed');
        $('.step-body.collapse').not('.manual-collapse').addClass('show');
    });

    $('.social-share a').click(function (evt) {
        window.open(
                this.href,
                '',
                'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=600,width=600'
        );
        return false;
    });


    MathJax.Hub.Register.MessageHook("New Math", function (message) {
        var latexSource = MathJax.Hub.getJaxFor(message[1]).originalText.trim();
        var $frame = $('#' + message[1] + '-Frame');

        if (latexSource.startsWith('\\showSourceOnClick')) {
            latexSource = latexSource.replace(/^\\showSourceOnClick\s*/, '').trim();
            $frame.popover({
                content: $('<code></code>').text(latexSource),
                html: true,
                placement: 'bottom',
                trigger: 'click'
            }).css('cursor', 'default').attr('data-has-tooltip', true);
        }
        else {
            $frame.popover({
                content: $('<code></code>').text(latexSource),
                html: true,
                placement: 'bottom',
                trigger: 'hover'
            }).css('cursor', 'default').attr('data-has-tooltip', true);
        }

        $frame.find('a').each(function (index, element) {
            if (element.getAttribute('href').search(/^#step\d/) >= 0) {
                var href = element.getAttribute('href').replace('#step', '#stepheading');
                element.removeAttribute('href');
                $(element).on('click', function () {
                    $(href)[0].scrollIntoView();
                });
            }
            else if (element.getAttribute('href').startsWith('[tooltip]')) {
                var tooltipText = element.getAttribute('href').substring('[tooltip]'.length);
                element.removeAttribute('href');
                $(element).popover({
                    content: tooltipText,
                    placement: 'bottom',
                    trigger: 'click'
                }).css('cursor', 'default').css('color', 'red').attr('data-has-tooltip', true);
            }
        });
    });


    function highlighKeywordEverywhere(keyword) {
        if(!(keyword in keywordIndex))
            return;

        function highlightKeywordInFormulas(element, keyword) {
            var formulas = MathJax.Hub.getAllJax(element);
            for (var j = 0; j < formulas.length; ++j) {
                if (formulas[j].originalText.search(RegExp(keyword.replace(/[\\$^[{}()?.*|]/g, function($0){return '\\'+$0}),'gi')) >= 0) {
                    $('#' + formulas[j].inputID + '-Frame').addClass('highlighted-blinking');
                }
            }
            $(element).find('.katex-html').each(function (i, e) {
                var $e = $(e);
                if ($e.closest('.katex').find('annotation').text().search(keyword) >= 0) {
                    $e.addClass('highlighted-blinking');
                }
            });
        }

        var stepList = keywordIndex[keyword].steps;
        $('.collapse').each(function (index, element) {
            $(element).find('.highlighted-blinking').removeClass('highlighted-blinking').fadeTo(0, 1);
            if (element.id && element.id.toString().match(/^step\d/) && stepList.indexOf(element.id.toString().replace(/^step/, '')) == -1) {
                $(element).collapse('hide');
            }
        });

        for (var i = 0; i < stepList.length; ++i) {
            var stepSelector = '#step' + stepList[i];
            $(stepSelector + '.collapse').collapse('show');
            var stepDOMnode = $(stepSelector)[0];
            highlightKeywordInFormulas(stepDOMnode, keyword);

            var editorInstance = $(stepSelector + ' .latex-source-area')[0].editorInstance || {findAll: function (){}};

            if (keywordIndex[keyword].siblings) {
                for (var j = 0; j < keywordIndex[keyword].siblings.length; ++j) {
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
        var offset = $('#step' + stepList[0]).offset();
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
                .replace(/(\\)?\\('|`|^|"|H|~|c|k|=|b|.|d|r|u|v)\{(.)}/g, function ($0, $1, $2, $3) {
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
                    /(\\)?\\t\{(..)}/g,
                    function ($0, $1, $2) {return $1 ? $0 : $2 + '\u0361'}
                ).replace(
                    /(\\)?\\l\{}/,
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
        for (var i = 0; i < element.childNodes.length; ++i) {
            var node = element.childNodes[i];
            if (node.nodeType === 3) {
                element.replaceChild(document.createTextNode(processLaTeXText(node.textContent)), node);
            }
            else if (node.nodeType === 1 && !node.classList.contains('latex-source-area') && ['script', 'noscript', 'style', 'textarea', 'pre', 'code'].indexOf(node.nodeName.toLowerCase()) < 0) {
                processLaTeXTextInElement(node);
            }
        }
    }

    function parseCommandArgs(text) {
        var closingBrace = '';
        var balancer = 0;
        var command = '';
        var remainder = text;
        var valuePos = 0;
        var value = '';

        for (var i = 0; i < text.length; ++i) {
            var currentSymbol = text.substr(i, 1);
            if (text.substr(0, 1) == '\\' && command == '' && !currentSymbol.match(/[a-zA-Z]/) && i > 0) {
                command = text.substr(0, i);
                valuePos = i + 1;

                if (currentSymbol != '{') {
                    value = '';
                    remainder = text.substring(i);
                    break;
                }
            }
            else if (i == 0 && currentSymbol == '{') {
                command = '';
                valuePos = 1;
            }

            if (closingBrace == '') {
                if (currentSymbol == '{') {
                    valuePos = i + 1;
                    closingBrace = '}';
                }
            }
            if (currentSymbol == '{' && (i == 0 || text.substr(i - 1, 1) != '\\')) {
                ++balancer;
            }
            if (currentSymbol == '}' && (i == 0 || text.substr(i - 1, 1) != '\\')) {
                --balancer;
            }
            if (balancer == 0 && currentSymbol == closingBrace) {
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
        if (element.tagName.toLowerCase() == 'span' && element.classList.length == 0) {
            var children = [];
            for (var i = 0; i < element.childNodes.length; ++i) {
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
        var $element = $(element);
        var text = $element.text();
        text = removeLaTeXComments(text);

        text = text
                .replace(/\s*\\begin\{enumerate}\s*\\item\s*/g, '\\htmlol{\\htmlli{')
                .replace(/\s*\\end\{enumerate}/g, '}}')
                .replace(/\s*\\begin\{itemize}\s*\\item/g, '\\htmlul{\\htmlli{')
                .replace(/\s*\\end\{itemize}\s*/g, '}}')
                .replace(/\s*\\item\s*(?!")/g, '}\\htmlli{');

        var pos = text.search(/\\html[a-z]+?\{/);
        if (pos >= 0) {
            var prefix = text.substring(0, pos);
            var tokens = parseCommandArgs(text.substring(pos));
            $element.text('');
            if (prefix) {
                $element.append($('<span></span>').append(document.createTextNode(prefix)));
            }
            var tag = tokens.command.substring(5);
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

        var pos = text.search(/\\verb[^a-zA-Z]/);
        if (pos >= 0) {
            var prefix = text.substring(0, pos);
            var verbDelimiter = text.substr(pos + '\\verb'.length, 1);
            text = text.substring(pos + '\\verb"'.length);
            pos = text.indexOf(verbDelimiter);
            var verbText = text.substring(0, pos);
            var postfix = text.substring(pos + 1);
            var remainderNoBrake = postfix.substr(0, 1);
            if (remainderNoBrake == '.' || remainderNoBrake == ',') {
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

        pos = text.search(/\\(textit|textbf|href|emph)\{|\\par[^a-zA-Z]/);
        if (pos >= 0) {
            var prefix = text.substring(0, pos);
            var tokens = parseCommandArgs(text.substring(pos));
            $element.text('');
            $element.append($('<span></span>').append(document.createTextNode(prefix)));

            if (tokens.command == '\\textbf' || tokens.command == "\\textit" || tokens.command == "\\emph") {
                var tag = tokens.command == '\\textbf' ? 'strong' : 'em';
                $element
                        .append($('<' + tag + '></' + tag + '>')
                                .append(document.createTextNode(tokens.value)));
                $element.find('> ' + tag).each(function (i, e) {
                    preprocessLaTeX(e)
                });
            }
            else if (tokens.command == '\\href') {
                var href = tokens.value;
                tokens = parseCommandArgs(tokens.remainder);
                $element
                        .append($('<a rel="external" href="' + href + '"></a>')
                                .append(document.createTextNode(tokens.value)));
                $element.find('> a').each(function (i, e) {
                    preprocessLaTeX(e)
                });
            }
            else if (tokens.command == '\\par') {
                $element.append($('<p>'));
            }


            $element.append($('<span></span>').append(document.createTextNode(tokens.remainder)));
            $element.find('> span').each(function (i, e) {
                preprocessLaTeX(e)
            });
            flattenElement(element);
            return;
        }

        $element.text(text
                .replace(/\\TeX(?!\$)/g, mathRenderer == 'MathJax' ? '\\(\\TeX\\)' : 'TeX')
                .replace(/\\LaTeX(?!\$)/g, mathRenderer == 'MathJax' ? '\\(\\LaTeX\\)' : 'LaTeX')
        );
    }

    function mathRendererFactory(element, performPostprocessing, callback) {
        performPostprocessing = (performPostprocessing !== false);

        function processWithKaTeX(element) {
            for (var i = 0; i < element.childNodes.length; ++i) {
                var node = element.childNodes[i];
                if (node.nodeType === 3) {
                    var tokens = node.textContent.split(/(\${1,2}|\\\[|\\]|\\\(|\\\))/);
                    if (tokens.length <= 1) {
                        continue;
                    }
                    var container = document.createElement('span');
                    element.replaceChild(container, node);

                    for (var j = 0; j < tokens.length; ++j) {
                        var token = tokens[j];
                        if (['\\(', '$', '$$', '\\['].indexOf(token) >= 0) {
                            j += 1;
                            if (j >= tokens.length) {
                                break;
                            }
                            var displayMode = ['$$', '\\['].indexOf(token) >= 0;
                            var originalSource = tokens[j].trim();

                            var showTooltipOnClick = false;
                            if (originalSource.startsWith('\\showSourceOnClick')) {
                                originalSource = originalSource.replace(/^\\showSourceOnClick\s*/, '').trim();
                                showTooltipOnClick = true;
                            }

                            ++j;
                            if (j >= tokens.length || tokens[j] != {
                                        '$': '$',
                                        '$$': '$$',
                                        '\\[': '\\]',
                                        '\\(': '\\)'
                                    }[token]) {
                                token = (j >= tokens.length ? '' : tokens[j]);
                                container.appendChild(document.createTextNode(msgUnbalancedParenthesis + token));
                                continue;
                            }
                            var preparedSource = originalSource.replace(/\\operatorname/g, '\\mathrm');
                            var span = document.createElement('span');
                            container.appendChild(span);
                            try {
                                katex.render(preparedSource, span, {
                                    displayMode: displayMode,
                                    throwOnError: true
                                });
                            }
                            catch (e) {
                                $(span).css('color', 'red').text(msgKatexUnableToDisplayFormula);
                            }
                            $(span).popover({
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
                else if (node.nodeType === 1 && ['code', 'pre'].indexOf(node.nodeName.toLowerCase()) == -1) {
                    processWithKaTeX(node);
                }
            }
        }

        if (mathRenderer == 'MathJax') {
            if (performPostprocessing) {
                return function () {
                    if(MathJax.InputJax && MathJax.InputJax.TeX) {
                        MathJax.InputJax.TeX.resetEquationNumbers();
                    }
                    MathJax.Hub.Queue(function () {
                        MathJax.Hub.Typeset(element, function () {
                            processLaTeXTextInElement(element);
                            if (callback) {
                                callback.call();
                            }
                        })
                    });
                }
            }
            else {
                return function () {
                    if(MathJax.InputJax && MathJax.InputJax.TeX) {
                        MathJax.InputJax.TeX.resetEquationNumbers();
                    }
                    MathJax.Hub.Queue(function () {
                        MathJax.Hub.Typeset(element, callback)
                    });
                }
            }
        }
        else {
            return function () {
                processWithKaTeX(element);
                if (performPostprocessing) {
                    processLaTeXTextInElement(element);
                }
                if (callback) {
                    callback.call();
                }
            }
        }
    }

    function processLessonContainer(container, containerFootprint) {
        containerFootprint = containerFootprint || '';
        var $container = $(container);
        var lessonString = $container.text().trim();
        var lessonSteps = lessonString.split(/(^\s*\\section\{.*}\s*$)/m);
        var $lessonContainer = $('<div class="lesson-container"></div>');
        $container.after($lessonContainer);
        container.parentNode.removeChild(container);

        for (var i = 1; i < lessonSteps.length; i += 2) {
            var stepIdString = containerFootprint + '-' + ((i + 1) / 2).toString();
            var headerText = lessonSteps[i].trim();
            headerText = headerText.substring('\\section{'.length, headerText.length - 1);
            var bodyText = lessonSteps[i + 1].trim().replace(/\\index\{([^}]+)}/g, function ($0, $1) {
                var keywords = $1.split(',');
                for (var i = 0; i < keywords.length; ++i) {
                    var siblings = keywords[i].trim().split('=');
                    for (var j = 0; j < siblings.length; ++j) {
                        siblings[j] = siblings[j].trim();
                    }
                    for (j = 0; j < siblings.length; ++j) {
                        var keyword = siblings[j];
                        if (!(keyword in keywordIndex)) {
                            keywordIndex[keyword] = {
                                steps: []
                            };
                        }
                        if (keywordIndex[keyword].steps.indexOf(stepIdString) == -1) {
                            keywordIndex[keyword].steps.push(stepIdString);
                        }
                        if (siblings.length > 1) {
                            if (keywordIndex[keyword].siblings == undefined) {
                                keywordIndex[keyword].siblings = [];
                            }
                            for (var k = 0; k < siblings.length; ++k) {
                                if (keywordIndex[keyword].siblings.indexOf(siblings[k]) == -1) {
                                    keywordIndex[keyword].siblings.push(siblings[k]);
                                }
                            }
                        }
                    }
                }
                return '';
            }).trim().replace(/^\\par\s+/, '');

            var staticPartMatch = bodyText.match(/^\\begin\{staticpart}([\s\S]+?)\\end\{staticpart}([\s\S]*)$/);
            var staticPart = '';
            if (staticPartMatch) {
                staticPart = staticPartMatch[1].trim().replace(/^\\par\s+/, '');
                bodyText = staticPartMatch[2].trim().replace(/^\\par\s+/, '');
            }

            var $stepCard = $('<div class="card step-card mt-2"></div>');

            $stepCard.append(
                $('<div class="card-header step-header"></div>')
                    .attr('id', 'stepheading' + stepIdString)
                    .attr('data-toggle', 'collapse')
                    .attr('data-target', '#step' + stepIdString)
                    .addClass(startCollapsed ? 'collapsed' : '')
                    .append($('<h4 class="h4"></h4>').text(headerText))
            );

            var $stepCardBody = $('<div class="card-body step-body collapse"></div>')
                .attr('id', 'step' + stepIdString)
                .addClass(startCollapsed ? '' : 'show');

            if (staticPart) {
                var $staticPartArea = $('<div class="card-text static-part-area"></div>')
                    .attr('id', 'spa' + stepIdString)
                    .text(staticPart);
                preprocessLaTeX($staticPartArea[0]);
                $stepCardBody
                    .addClass('force-source-visibility')
                    .append($staticPartArea);
            }

            var $sourceArea = $('<div class="card-text latex-source-area col-md-5"></div>')
                .attr('id', 'lsa' + stepIdString)
                .text(bodyText);

            var $resultDisplayArea = $('<div class="card-text result-display-area col-md-7"></div>')
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
                    var div = document.createElement('div');
                    div.textContent = this.originalText;
                    this.innerHTML = '';
                    this.appendChild(div);
                    aceHighlighter(div, aceEditorOptions);
                }
            });

            $sourceArea.click(function(){
                var newEditor = attachAce(this);
                if(newEditor) {
                    newEditor.focus();
                }
            });

            $sourceArea[0].originalText = $sourceArea[0].textContent;
            $sourceArea[0].rda = $resultDisplayArea[0];
            if(singleAceInstance) {
                aceHighlighter($sourceArea[0], aceEditorOptions);
            }
            else {
                attachAce($sourceArea[0]);
            }
        }
    }

    function loadExternalScriptsAndFinalize(finalizer) {
        $('section.main-content').css('display', 'none');
        $('section.main-content[lang="' + browserLanguage + '"]').css('display', 'block');

        var externalScript = document.querySelector('section[lang="' + browserLanguage +  '"] > script[type="text/latexlesson"][data-src]');
        if(!externalScript) {
            return finalizer.call();
        }

        var src = 'content/' + browserLanguage + '/tex/' + externalScript.dataset['src'];
        externalScript.removeAttribute('data-src');

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

    loadExternalScriptsAndFinalize(function() {
        $('script[type="text/latexlesson"]').each(function (index, element) {
            setLoadingStatus(msgProcessingSection + ' ' + index + '…');
            processLessonContainer(element, (index + 1).toString());
        });

        MathJax.Hub.Config({
            elements: document.querySelectorAll(".result-display-area, .static-part-area, h1, h2, h3, h4")
        });

        setLoadingStatus(msgProcessingMathOnPage);

        mathRendererFactory(document.body, true, function () {
            $('#loadingToast').text(msgFinishedLoading).fadeOut(1000);
        })();

        if (!window.location.hash && startCollapsed) {
            var $intro = $('.step-header[data-target="#step1-1"]');
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
            var stepId = window.location.hash.replace(/^#(step|stepheading)?(?=\d)/, '');
            var heading = document.getElementById('step' + stepId);
            if (heading) {
                $('#step' + stepId + '.collapse').collapse('show');
                window.location.hash = '';
                window.location.hash = '#stepheading' + stepId;
            }
            else {
                var kw = window.location.hash.substr(1);
                if ((kw in keywordIndex) || (('\\' + kw) in keywordIndex)) {
                    if (!(kw in keywordIndex)) {
                        kw = '\\' + kw;
                    }
                    $('#searchInput').val(kw);
                    highlighKeywordEverywhere(kw);
                }
            }
        }

        var keywordIndexList = [];
        for (kwd in keywordIndex) {
            keywordIndexList.push(kwd);
        }

        function typeaheadEventHandler() {
            var kw = $('#searchInput').typeahead('val');
            if ($('#searchInput').val() === kw) {
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
        $('.step-body').on('click', function (evt) {
            $(this).find('.highlighted-blinking').removeClass('highlighted-blinking').fadeTo(400, 1);
        });
    });
});