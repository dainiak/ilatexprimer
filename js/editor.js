import { state } from './state.js';
import { preprocessLaTeX } from './latex-processor.js';
import { mathRendererFactory } from './math-renderer.js';

let aceStaticStyle = null;

export function attachAce(sourceArea) {
    if (sourceArea.editorInstance)
        return;

    const div = document.createElement('div');

    if (typeof sourceArea.originalText != 'string') {
        sourceArea.originalText = sourceArea.textContent;
    }
    div.textContent = sourceArea.textContent.trim();

    sourceArea.innerHTML = '';
    sourceArea.appendChild(div);
    let editor = ace.edit(div);
    sourceArea.editorInstance = editor;

    editor.$blockScrolling = Infinity;
    editor.setOptions(state.aceEditorOptions);
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
        localStorage.setItem(`${state.displayLanguage}-${rda.id.replace('rda', '')}`, value);
        rda.textContent = value.replace(/^\\par\s+/, '');
        preprocessLaTeX(rda);
        state.mathRenderer === 'MathJax' && MathJax.texReset();
        mathRendererFactory(rda)();
    }

    editor.commands.addCommand({
        name: 'typeset',
        bindKey: 'Ctrl-Enter',
        exec: typesetEditorContent
    });

    editor.on('change', () => state.typesetOnChange && typesetEditorContent());

    editor.customDestroyer = () => {
        const value = editor.getValue().trim();
        sourceArea.originalText = value;
        state.typesetOnChange && typesetEditorContent();

        if (state.singleAceInstance) {
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
            state.aceHighlighter(sourceArea, state.aceEditorOptions);
            if (!aceStaticStyle) {
                aceStaticStyle = document.querySelector('style#ace_highlight');
                aceStaticStyle.innerHTML = aceStaticStyle.innerHTML.replace(
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
