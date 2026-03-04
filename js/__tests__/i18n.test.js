import { beforeEach, describe, expect, it } from 'vitest';
import { messages, setUILanguage } from '../i18n.js';

describe('i18n translation data', () => {
    it('en and ru locales have identical key sets', async () => {
        await import('../i18n.js');
        setUILanguage('en');
        const enMessages = { ...messages };
        setUILanguage('ru');
        const ruMessages = { ...messages };

        // Both should have the same keys populated (non-empty)
        for (const key of Object.keys(enMessages)) {
            expect(ruMessages).toHaveProperty(key);
        }
        for (const key of Object.keys(ruMessages)) {
            expect(enMessages).toHaveProperty(key);
        }
    });

    it('messages object has expected keys', () => {
        const expectedKeys = [
            'unbalancedParenthesis',
            'processingMathOnPage',
            'loadingSection',
            'processingSection',
            'unableToLoadThisStep',
            'finishedLoading',
            'searchResults',
        ];
        for (const key of expectedKeys) {
            expect(messages).toHaveProperty(key);
        }
    });
});

describe('setUILanguage', () => {
    beforeEach(() => {
        document.documentElement.lang = '';
        document.title = '';
    });

    it('populates messages fields for English', () => {
        setUILanguage('en');
        expect(messages.unbalancedParenthesis).toContain('Unbalanced');
        expect(messages.finishedLoading).toContain('Finished');
        expect(messages.loadingSection).toBeTruthy();
        expect(messages.processingSection).toBeTruthy();
        expect(messages.processingMathOnPage).toBeTruthy();
        expect(messages.searchResults).toBeTruthy();
    });

    it('populates messages fields for Russian', () => {
        setUILanguage('ru');
        expect(messages.unbalancedParenthesis).toContain('Несбалансированные');
        expect(messages.finishedLoading).toContain('Загрузка');
        expect(messages.loadingSection).toBeTruthy();
        expect(messages.processingSection).toBeTruthy();
    });

    it('sets document language attribute', () => {
        setUILanguage('en');
        expect(document.documentElement.lang).toBe('en');
        setUILanguage('ru');
        expect(document.documentElement.lang).toBe('ru');
    });

    it('sets document title', () => {
        setUILanguage('en');
        expect(document.title).toContain('LaTeX');
        setUILanguage('ru');
        expect(document.title).toContain('LaTeX');
    });
});
