import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
    js.configs.recommended,
    prettier,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                MathJax: 'readonly',
                document: 'readonly',
                window: 'readonly',
                localStorage: 'readonly',
                navigator: 'readonly',
                location: 'readonly',
                history: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                fetch: 'readonly',
                AbortSignal: 'readonly',
                AbortController: 'readonly',
                Event: 'readonly',
                RegExp: 'readonly',
            },
        },
    },
];
