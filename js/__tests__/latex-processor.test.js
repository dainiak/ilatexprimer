import { describe, expect, it } from 'vitest';
import {
    applyFinalTextTransforms,
    createElement,
    extractBracedArg,
    insertParBreaks,
    preprocessLaTeX,
    processLaTeXText,
    readCommandName,
    removeLaTeXComments,
    tokenize,
} from '../latex-processor.js';

describe('removeLaTeXComments', () => {
    it('strips line comments starting with %', () => {
        expect(removeLaTeXComments('hello % world')).toBe('hello ');
    });

    it('preserves escaped \\%', () => {
        expect(removeLaTeXComments('100\\% done')).toBe('100\\% done');
    });

    it('preserves % inside \\verb', () => {
        const input = '\\verb|50%| rest';
        expect(removeLaTeXComments(input)).toBe('\\verb|50%| rest');
    });

    it('strips the first % comment on a line', () => {
        const input = 'a % comment';
        const result = removeLaTeXComments(input);
        expect(result).toBe('a ');
    });
});

describe('processLaTeXText', () => {
    it('converts --- to em dash', () => {
        expect(processLaTeXText('a---b')).toBe('a\u2014b');
    });

    it('converts -- to en dash', () => {
        expect(processLaTeXText('a--b')).toBe('a\u2013b');
    });

    it('converts << and >> to guillemets', () => {
        expect(processLaTeXText('<<hello>>')).toBe('\u00abhello\u00bb');
    });

    it("converts `` and '' to curly double quotes", () => {
        expect(processLaTeXText("``hello''")).toBe('\u201chello\u201d');
    });

    it('applies accent combining characters', () => {
        const result = processLaTeXText("\\'{e}");
        expect(result).toBe('e\u0301');
    });

    it('converts \\textbackslash to backslash', () => {
        expect(processLaTeXText('\\textbackslash')).toBe('\\');
    });

    it('converts \\~ (tilde shorthand) to space', () => {
        expect(processLaTeXText('a~b')).toBe('a b');
    });

    it('converts \\, to thin space', () => {
        expect(processLaTeXText('a\\,b')).toBe('a b');
    });

    it('converts \\ (backslash-space) to space', () => {
        expect(processLaTeXText('a\\ b')).toBe('a b');
    });

    it('converts \\% to literal %', () => {
        expect(processLaTeXText('100\\%')).toBe('100%');
    });
});

describe('extractBracedArg', () => {
    it('extracts a simple braced argument', () => {
        const result = extractBracedArg('{hello}', 0);
        expect(result).toEqual({ content: 'hello', endPos: 7 });
    });

    it('handles nested braces', () => {
        const result = extractBracedArg('{a{b}c}', 0);
        expect(result).toEqual({ content: 'a{b}c', endPos: 7 });
    });

    it('returns null when no opening brace', () => {
        expect(extractBracedArg('hello', 0)).toBeNull();
    });

    it('handles unclosed brace by returning rest of string', () => {
        const result = extractBracedArg('{hello', 0);
        expect(result).toEqual({ content: 'hello', endPos: 6 });
    });

    it('extracts from a given position', () => {
        const result = extractBracedArg('cmd{arg}', 3);
        expect(result).toEqual({ content: 'arg', endPos: 8 });
    });
});

describe('readCommandName', () => {
    it('reads alphabetic command name', () => {
        expect(readCommandName('textbf{x}', 0)).toEqual({ name: 'textbf', endPos: 6 });
    });

    it('stops at non-alpha character', () => {
        expect(readCommandName('cmd123', 0)).toEqual({ name: 'cmd', endPos: 3 });
    });

    it('returns empty name for non-alpha start', () => {
        expect(readCommandName('{text}', 0)).toEqual({ name: '', endPos: 0 });
    });
});

describe('insertParBreaks', () => {
    it('converts double newlines to \\par', () => {
        const result = insertParBreaks('a\n\nb');
        expect(result).toContain('\\par');
    });

    it('does not convert single newlines', () => {
        const result = insertParBreaks('a\nb');
        expect(result).not.toContain('\\par');
    });

    it('skips math inside $...$', () => {
        const result = insertParBreaks('$a\n\nb$');
        expect(result).not.toContain('\\par');
    });

    it('skips math inside $$...$$', () => {
        const result = insertParBreaks('$$a\n\nb$$');
        expect(result).not.toContain('\\par');
    });

    it('skips math inside \\[...\\]', () => {
        const result = insertParBreaks('\\[a\n\nb\\]');
        expect(result).not.toContain('\\par');
    });

    it('skips math inside \\(...\\)', () => {
        const result = insertParBreaks('\\(a\n\nb\\)');
        expect(result).not.toContain('\\par');
    });

    it('skips \\verb content', () => {
        const result = insertParBreaks('\\verb|a\n\nb|');
        expect(result).not.toContain('\\par');
    });

    it('skips math environments', () => {
        const result = insertParBreaks('\\begin{align}a\n\nb\\end{align}');
        expect(result).not.toContain('\\par');
    });
});

describe('tokenize', () => {
    it('produces TEXT tokens for plain text', () => {
        const tokens = tokenize('hello world');
        expect(tokens).toEqual([{ type: 'TEXT', content: 'hello world' }]);
    });

    it('tokenizes \\verb', () => {
        const tokens = tokenize('\\verb|code|');
        expect(tokens).toEqual([{ type: 'VERB', content: 'code', punctuation: '' }]);
    });

    it('captures trailing punctuation after \\verb', () => {
        const tokens = tokenize('\\verb|code|.');
        expect(tokens).toEqual([{ type: 'VERB', content: 'code', punctuation: '.' }]);
    });

    it('tokenizes \\textbf', () => {
        const tokens = tokenize('\\textbf{bold}');
        expect(tokens).toHaveLength(1);
        expect(tokens[0]).toEqual({ type: 'COMMAND', name: 'textbf', args: ['bold'] });
    });

    it('tokenizes \\emph', () => {
        const tokens = tokenize('\\emph{italic}');
        expect(tokens).toHaveLength(1);
        expect(tokens[0]).toEqual({ type: 'COMMAND', name: 'emph', args: ['italic'] });
    });

    it('tokenizes \\begin{enumerate} and \\item', () => {
        const tokens = tokenize('\\begin{enumerate}\\item a\\end{enumerate}');
        expect(tokens[0]).toEqual({ type: 'LIST_BEGIN', env: 'enumerate' });
        expect(tokens[1]).toEqual({ type: 'ITEM' });
        expect(tokens[tokens.length - 1]).toEqual({ type: 'LIST_END', env: 'enumerate' });
    });

    it('tokenizes math environments as MATH_ENV', () => {
        const tokens = tokenize('\\begin{align}x=1\\end{align}');
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe('MATH_ENV');
        expect(tokens[0].content).toContain('\\begin{align}');
    });

    it('tokenizes \\par as a command', () => {
        const tokens = tokenize('a\n\nb');
        const parToken = tokens.find((t) => t.type === 'COMMAND' && t.name === 'par');
        expect(parToken).toBeDefined();
    });

    it('handles text before and after commands', () => {
        const tokens = tokenize('before \\textbf{bold} after');
        expect(tokens).toHaveLength(3);
        expect(tokens[0]).toEqual({ type: 'TEXT', content: 'before ' });
        expect(tokens[1]).toEqual({ type: 'COMMAND', name: 'textbf', args: ['bold'] });
        expect(tokens[2]).toEqual({ type: 'TEXT', content: ' after' });
    });
});

describe('applyFinalTextTransforms', () => {
    it('wraps \\TeX in math delimiters', () => {
        expect(applyFinalTextTransforms('Use \\TeX today')).toBe('Use \\(\\TeX\\) today');
    });

    it('wraps \\LaTeX in math delimiters', () => {
        expect(applyFinalTextTransforms('Use \\LaTeX today')).toBe('Use \\(\\LaTeX\\) today');
    });

    it('wraps \\ref{} in math delimiters', () => {
        expect(applyFinalTextTransforms('see \\ref{eq1}')).toBe('see \\(\\ref{eq1}\\)');
    });

    it('wraps \\eqref{} in math delimiters', () => {
        expect(applyFinalTextTransforms('see \\eqref{eq1}')).toBe('see \\(\\eqref{eq1}\\)');
    });
});

describe('preprocessLaTeX (DOM)', () => {
    it('tokenizes and renders content into an element', () => {
        const el = document.createElement('div');
        el.textContent = 'Hello \\textbf{world}';
        preprocessLaTeX(el);
        const strong = el.querySelector('strong');
        expect(strong).not.toBeNull();
        expect(strong.textContent).toBe('world');
    });

    it('renders \\verb as <code>', () => {
        const el = document.createElement('div');
        el.textContent = '\\verb|code|';
        preprocessLaTeX(el);
        const code = el.querySelector('code');
        expect(code).not.toBeNull();
        expect(code.textContent).toBe('code');
    });

    it('renders \\begin{enumerate} as <ol> with <li>', () => {
        const el = document.createElement('div');
        el.textContent = '\\begin{enumerate}\\item First\\item Second\\end{enumerate}';
        preprocessLaTeX(el);
        const ol = el.querySelector('ol');
        expect(ol).not.toBeNull();
        const items = ol.querySelectorAll('li');
        expect(items).toHaveLength(2);
    });
});

describe('createElement', () => {
    it('creates an element with tag, class and text', () => {
        const el = createElement('span', 'my-class', 'hello');
        expect(el.tagName).toBe('SPAN');
        expect(el.className).toBe('my-class');
        expect(el.textContent).toBe('hello');
    });

    it('creates an element with no class or text', () => {
        const el = createElement('div');
        expect(el.tagName).toBe('DIV');
        expect(el.className).toBe('');
        expect(el.textContent).toBe('');
    });
});
