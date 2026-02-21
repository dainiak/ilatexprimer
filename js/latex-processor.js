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

export function parseCommandArgs(text) {
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
        } else if (i === 0 && currentSymbol === '{') {
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
        remainder: remainder,
    };
}

export function flattenElement(element) {
    if (element.tagName.toLowerCase() !== 'span' || element.classList.length !== 0) return;
    let children = [];
    element.childNodes.forEach((node) => children.push(node));
    children.forEach((node) => {
        element.removeChild(node);
        element.parentNode.insertBefore(node, element);
    });
    element.parentNode.removeChild(element);
}

export function createElement(tag, className, textContent) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (textContent !== undefined) el.textContent = textContent;
    return el;
}

export function preprocessLaTeX(element) {
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
        element.querySelectorAll(`:scope > ${tag}`).forEach((e) => preprocessLaTeX(e));
        if (tokens.remainder) {
            const span = document.createElement('span');
            span.appendChild(document.createTextNode(tokens.remainder));
            element.appendChild(span);
        }
        element.querySelectorAll(':scope > span').forEach((e) => preprocessLaTeX(e));
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
        } else {
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
        element.querySelectorAll(':scope > span').forEach((e) => preprocessLaTeX(e));
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

        if (['\\textbf', '\\textit', '\\emph'].includes(tokens.command)) {
            let tag = tokens.command === '\\textbf' ? 'strong' : 'em';
            const tagEl = document.createElement(tag);
            tagEl.appendChild(document.createTextNode(tokens.value));
            element.appendChild(tagEl);
            element.querySelectorAll(`:scope > ${tag}`).forEach((e) => preprocessLaTeX(e));
        } else if (tokens.command === '\\subsection') {
            const h4 = createElement('h4', 'mt-4');
            h4.appendChild(document.createTextNode(tokens.value));
            element.appendChild(h4);
            element.querySelectorAll(':scope > h4').forEach((e) => preprocessLaTeX(e));
        } else if (tokens.command === '\\href') {
            const href = tokens.value;
            tokens = parseCommandArgs(tokens.remainder);
            const a = document.createElement('a');
            a.rel = 'external';
            a.href = href;
            a.appendChild(document.createTextNode(tokens.value));
            element.appendChild(a);
            element.querySelectorAll(':scope > a').forEach((e) => preprocessLaTeX(e));
        } else if (tokens.command === '\\par') {
            element.appendChild(document.createElement('p'));
        }

        const remainderSpan = document.createElement('span');
        remainderSpan.appendChild(document.createTextNode(tokens.remainder));
        element.appendChild(remainderSpan);
        element.querySelectorAll(':scope > span').forEach((e) => preprocessLaTeX(e));
        flattenElement(element);
        return;
    }

    text = text.replace(/\\TeX(?!\$)/g, '\\(\\TeX\\)').replace(/\\LaTeX(?!\$)/g, '\\(\\LaTeX\\)');

    const environments = [
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

    environments.forEach((env) => {
        text = text.replace(`\\begin{${env}}`, `\\[\\begin{${env}}`).replace(`\\end{${env}}`, `\\end{${env}}\\]`);
    });

    text = text.replace(/\\(ref|eqref)\{([^}]+)}(?!\$)/g, '\\(\\$1{$2}\\)');

    element.textContent = text;
}
