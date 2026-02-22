import ace from 'ace-builds';
import { Popover } from 'bootstrap';
import { state, MONOSPACE_FONT_FAMILY } from './state.js';
import { preprocessLaTeX } from './latex-processor.js';
import { mathRendererFactory } from './math-renderer.js';
import { getResultDisplayArea } from './lesson-loader.js';

let aceStaticStyle = null;

export function attachAce(sourceArea) {
    if (sourceArea.editorInstance) return;

    const div = document.createElement('div');

    if (typeof sourceArea.originalText !== 'string') {
        sourceArea.originalText = sourceArea.textContent;
    }
    div.textContent = sourceArea.textContent.trim();

    sourceArea.innerHTML = '';
    sourceArea.appendChild(div);
    let editor = ace.edit(div);
    sourceArea.editorInstance = editor;

    editor.$blockScrolling = Infinity;
    editor.setOptions(state.aceEditorOptions);
    editor.commands.removeCommands(['gotoline', 'find']);
    editor.resize();
    editor.gotoLine(1);

    function typesetEditorContent() {
        const rda = getResultDisplayArea(editor.container.parentNode);
        rda.querySelectorAll('[data-has-tooltip]').forEach((el) => {
            Popover.getInstance(el)?.dispose();
        });
        const value = editor.getValue().trim();
        localStorage.setItem(`${state.displayLanguage}-${rda.id.replace('rda', '')}`, value);
        rda.textContent = value.replace(/^\\par\s+/, '');
        preprocessLaTeX(rda);
        MathJax.texReset();
        mathRendererFactory(rda)();
    }

    editor.commands.addCommand({
        name: 'typeset',
        bindKey: 'Ctrl-Enter',
        exec: typesetEditorContent,
    });

    editor.on('change', () => {
        if (state.typesetOnChange) typesetEditorContent();
    });

    editor.customDestroyer = () => {
        const value = editor.getValue().trim();
        sourceArea.originalText = value;
        if (state.typesetOnChange) typesetEditorContent();

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
            ace.config.set('fontFamily', MONOSPACE_FONT_FAMILY);
            state.aceHighlighter(sourceArea, state.aceEditorOptions);
            if (!aceStaticStyle) {
                aceStaticStyle = true;
                const overrideStyle = document.createElement('style');
                overrideStyle.textContent = `
                    .ace_static_highlight .ace_line {
                        font-size: 90%;
                        font-family: Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                        line-height: 1.2em;
                    }
                `;
                document.head.appendChild(overrideStyle);
            }
        }
    };
    editor.on('blur', editor.customDestroyer);

    return editor;
}
