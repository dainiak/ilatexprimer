export function removeLaTeXComments(text) {
    return text
        .replace(/\\verb".*?"/gm, ($0) => $0.replace(/%/g, '\\%'))
        .replace(/(\\)?%/gm, ($0, $1) => ($1 ? $0 : '\ufeff'))
        .replace(/\\verb".*?"/gm, ($0) => $0.replace(/\\%/g, '%'))
        .replace(/\ufeff.*$/mu, '');
}

export function processLaTeXText(text) {
    return text
        .replace(/---/g, '\u2014')
        .replace(/--/g, '\u2013')
        .replace(/<</g, '\u00ab')
        .replace(/>>/g, '\u00bb')
        .replace(/``/g, '\u201c')
        .replace(/''/g, '\u201d')
        .replace(/(\\)?\\('|`|^|"|H|~|c|k|=|b|.|d|r|u|v){(.)}/g, ($0, $1, $2, $3) => {
            if ($1) return $0;

            const accentMap = {
                "'": '\u0301',
                '`': '\u0300',
                '^': '\u0302',
                '"': '\u0308',
                H: '\u030B',
                '~': '\u0303',
                c: '\u0327',
                k: '\u0328',
                '=': '\u0304',
                b: '\u0331',
                '.': '\u0307',
                d: '\u0323',
                r: '\u030A',
                u: '\u0306',
                v: '\u030C',
            };

            return $3 + (accentMap[$2] || '');
        })
        .replace(/(\\)?\\t{(..)}/g, ($0, $1, $2) => ($1 ? $0 : $2 + '\u0361'))
        .replace(/(\\)?\\l{}/, ($0, $1) => ($1 ? $0 : '\u0142'))
        .replace(/(\\)?\\o(?=[^a-zA-Z])/, ($0, $1) => ($1 ? $0 : '\u00f8'))
        .replace(/(\\)?\\,/g, ($0, $1) => ($1 ? $0 : ' '))
        .replace(/(\\)?\\ /g, ($0, $1) => ($1 ? $0 : ' '))
        .replace(/(\\)?~/g, ($0, $1) => ($1 ? $0 : ' '))
        .replace(/(\\)?\\textbackslash/g, ($0, $1) => ($1 ? $0 : '\\'))
        .replace(/(\\)?\\textasciitilde/g, ($0, $1) => ($1 ? $0 : '~'))
        .replace(/\\%/g, '%');
}

export function processLaTeXTextInElement(element) {
    element.childNodes.forEach((node) => {
        if (node.nodeType === 3) {
            element.replaceChild(document.createTextNode(processLaTeXText(node.textContent)), node);
        } else if (
            node.nodeType === 1 &&
            !node.classList.contains('latex-source-area') &&
            !['script', 'noscript', 'style', 'textarea', 'pre', 'code'].includes(node.nodeName.toLowerCase())
        ) {
            processLaTeXTextInElement(node);
        }
    });
}

export function createElement(tag, className, textContent) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (textContent !== undefined) el.textContent = textContent;
    return el;
}

// --- Tokenizer internals ---

const MATH_ENVIRONMENTS = [
    'equation',
    'equation*',
    'gather',
    'gather*',
    'align',
    'align*',
    'alignat',
    'alignat*',
    'multline',
    'multline*',
];

const LIST_ENVIRONMENTS = ['enumerate', 'itemize'];

const COMMAND_REGISTRY = {
    textbf: { tag: 'strong', args: 1, recurse: true },
    textit: { tag: 'em', args: 1, recurse: true },
    emph: { tag: 'em', args: 1, recurse: true },
    subsection: { tag: 'h4', args: 1, recurse: true, className: 'mt-4' },
    par: { tag: 'p', args: 0 },
    href: { tag: 'a', args: 2, recurse: true, handler: 'href' },
    htmlol: { tag: 'ol', args: 1, recurse: true },
    htmlul: { tag: 'ul', args: 1, recurse: true },
    htmlli: { tag: 'li', args: 1, recurse: true },
    htmlblockquote: { tag: 'blockquote', args: 1, recurse: true },
};

function extractBracedArg(text, pos) {
    if (pos >= text.length || text[pos] !== '{') {
        return null;
    }
    let depth = 0;
    for (let i = pos; i < text.length; i++) {
        const ch = text[i];
        if ((ch === '{' || ch === '}') && (i === 0 || text[i - 1] !== '\\')) {
            depth += ch === '{' ? 1 : -1;
            if (depth === 0) {
                return { content: text.substring(pos + 1, i), endPos: i + 1 };
            }
        }
    }
    return { content: text.substring(pos + 1), endPos: text.length };
}

function readCommandName(text, pos) {
    let end = pos;
    while (end < text.length && /[a-zA-Z]/.test(text[end])) {
        end++;
    }
    return { name: text.substring(pos, end), endPos: end };
}

function tokenize(text) {
    const tokens = [];
    let textStart = 0;
    let i = 0;

    function flushText(end) {
        if (end > textStart) {
            tokens.push({ type: 'TEXT', content: text.substring(textStart, end) });
        }
    }

    while (i < text.length) {
        if (text[i] !== '\\') {
            i++;
            continue;
        }

        const cmdStart = i;
        const { name, endPos } = readCommandName(text, i + 1);

        if (!name) {
            // Non-alphabetic sequence after \  (e.g. \[, \(, \\, \,)
            i += 2;
            continue;
        }

        // \verb — opaque content up to matching delimiter
        if (name === 'verb') {
            if (endPos < text.length && !/[a-zA-Z]/.test(text[endPos])) {
                const delimiter = text[endPos];
                const contentStart = endPos + 1;
                const delimEnd = text.indexOf(delimiter, contentStart);
                if (delimEnd >= 0) {
                    flushText(cmdStart);
                    const verbContent = text.substring(contentStart, delimEnd);
                    let afterVerb = delimEnd + 1;
                    let punctuation = '';
                    if (afterVerb < text.length && (text[afterVerb] === '.' || text[afterVerb] === ',')) {
                        punctuation = text[afterVerb];
                        afterVerb++;
                    }
                    tokens.push({ type: 'VERB', content: verbContent, punctuation });
                    i = afterVerb;
                    textStart = i;
                    continue;
                }
            }
            i = endPos;
            continue;
        }

        // \begin / \end
        if (name === 'begin' || name === 'end') {
            const argResult = extractBracedArg(text, endPos);
            if (argResult) {
                const envName = argResult.content;

                if (LIST_ENVIRONMENTS.includes(envName)) {
                    flushText(cmdStart);
                    tokens.push({
                        type: name === 'begin' ? 'LIST_BEGIN' : 'LIST_END',
                        env: envName,
                    });
                    i = argResult.endPos;
                    textStart = i;
                    continue;
                }

                if (MATH_ENVIRONMENTS.includes(envName) && name === 'begin') {
                    const endTag = `\\end{${envName}}`;
                    const endIdx = text.indexOf(endTag, argResult.endPos);
                    if (endIdx >= 0) {
                        flushText(cmdStart);
                        const fullContent = text.substring(cmdStart, endIdx + endTag.length);
                        tokens.push({ type: 'MATH_ENV', content: `\\[${fullContent}\\]` });
                        i = endIdx + endTag.length;
                        textStart = i;
                        continue;
                    }
                }

                i = argResult.endPos;
                continue;
            }
            i = endPos;
            continue;
        }

        // \item
        if (name === 'item') {
            flushText(cmdStart);
            tokens.push({ type: 'ITEM' });
            i = endPos;
            textStart = i;
            continue;
        }

        // Registered commands
        if (COMMAND_REGISTRY[name]) {
            const spec = COMMAND_REGISTRY[name];

            if (spec.args === 0) {
                flushText(cmdStart);
                tokens.push({ type: 'COMMAND', name, args: [] });
                i = endPos;
                textStart = i;
                continue;
            }

            const args = [];
            let argPos = endPos;
            let valid = true;
            for (let a = 0; a < spec.args; a++) {
                const arg = extractBracedArg(text, argPos);
                if (arg) {
                    args.push(arg.content);
                    argPos = arg.endPos;
                } else {
                    valid = false;
                    break;
                }
            }

            if (valid) {
                flushText(cmdStart);
                tokens.push({ type: 'COMMAND', name, args });
                i = argPos;
                textStart = i;
                continue;
            }

            i = endPos;
            continue;
        }

        // Unknown command — leave in text buffer for MathJax
        i = endPos;
    }

    flushText(text.length);
    return tokens;
}

function applyFinalTextTransforms(text) {
    return text
        .replace(/\\TeX(?!\$)/g, '\\(\\TeX\\)')
        .replace(/\\LaTeX(?!\$)/g, '\\(\\LaTeX\\)')
        .replace(/\\(ref|eqref)\{([^}]+)}(?!\$)/g, '\\(\\$1{$2}\\)');
}

function renderTokens(tokens, parent) {
    let i = 0;
    while (i < tokens.length) {
        const token = tokens[i];

        switch (token.type) {
            case 'TEXT': {
                const transformed = applyFinalTextTransforms(token.content);
                if (transformed) {
                    parent.appendChild(document.createTextNode(transformed));
                }
                i++;
                break;
            }

            case 'VERB': {
                const nobr = document.createElement('nobr');
                const code = document.createElement('code');
                code.appendChild(document.createTextNode(token.content));
                nobr.appendChild(code);
                if (token.punctuation) {
                    nobr.appendChild(document.createTextNode(token.punctuation));
                }
                parent.appendChild(nobr);
                i++;
                break;
            }

            case 'COMMAND': {
                const spec = COMMAND_REGISTRY[token.name];
                if (spec.handler === 'href') {
                    const a = document.createElement('a');
                    a.rel = 'external';
                    a.href = token.args[0];
                    if (token.args[1]) {
                        renderTokens(tokenize(token.args[1]), a);
                    }
                    parent.appendChild(a);
                } else {
                    const el = document.createElement(spec.tag);
                    if (spec.className) el.className = spec.className;
                    if (spec.args > 0 && spec.recurse && token.args[0]) {
                        renderTokens(tokenize(token.args[0]), el);
                    }
                    parent.appendChild(el);
                }
                i++;
                break;
            }

            case 'LIST_BEGIN': {
                const tag = token.env === 'enumerate' ? 'ol' : 'ul';
                const list = document.createElement(tag);
                i++;

                // Collect tokens until matching LIST_END
                let depth = 1;
                const innerTokens = [];
                while (i < tokens.length && depth > 0) {
                    if (tokens[i].type === 'LIST_BEGIN') {
                        depth++;
                        innerTokens.push(tokens[i]);
                    } else if (tokens[i].type === 'LIST_END') {
                        depth--;
                        if (depth > 0) {
                            innerTokens.push(tokens[i]);
                        }
                    } else {
                        innerTokens.push(tokens[i]);
                    }
                    i++;
                }

                // Split by top-level ITEM boundaries
                const items = [];
                let currentItem = [];
                let itemDepth = 0;
                let seenItem = false;
                for (const t of innerTokens) {
                    if (t.type === 'LIST_BEGIN') {
                        itemDepth++;
                        currentItem.push(t);
                    } else if (t.type === 'LIST_END') {
                        itemDepth--;
                        currentItem.push(t);
                    } else if (t.type === 'ITEM' && itemDepth === 0) {
                        if (seenItem) {
                            items.push(currentItem);
                        }
                        currentItem = [];
                        seenItem = true;
                    } else {
                        currentItem.push(t);
                    }
                }
                if (seenItem) {
                    items.push(currentItem);
                }

                for (const itemTokens of items) {
                    const li = document.createElement('li');
                    renderTokens(itemTokens, li);
                    list.appendChild(li);
                }
                parent.appendChild(list);
                break;
            }

            case 'MATH_ENV': {
                parent.appendChild(document.createTextNode(token.content));
                i++;
                break;
            }

            default:
                i++;
                break;
        }
    }
}

export function preprocessLaTeX(element) {
    const text = removeLaTeXComments(element.textContent);
    const tokens = tokenize(text);
    element.textContent = '';
    renderTokens(tokens, element);
}
