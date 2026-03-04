import { describe, expect, it } from 'vitest';
import { findClosingToken } from '../math-renderer.js';

describe('findClosingToken', () => {
    it('finds closing \\) for \\(', () => {
        const tokens = ['\\(', 'x+1', '\\)'];
        expect(findClosingToken(tokens, 0)).toBe(2);
    });

    it('finds closing \\] for \\[', () => {
        const tokens = ['\\[', 'x+1', '\\]'];
        expect(findClosingToken(tokens, 0)).toBe(2);
    });

    it('finds closing $ for $', () => {
        const tokens = ['$', 'x', '$'];
        expect(findClosingToken(tokens, 0)).toBe(2);
    });

    it('finds closing $$ for $$', () => {
        const tokens = ['$$', 'x', '$$'];
        expect(findClosingToken(tokens, 0)).toBe(2);
    });

    it('handles nested \\( inside \\[', () => {
        const tokens = ['\\[', '\\(', 'x', '\\)', '\\]'];
        expect(findClosingToken(tokens, 0)).toBe(4);
    });

    it('handles nested $ inside \\(', () => {
        const tokens = ['\\(', '$', 'x', '$', '\\)'];
        expect(findClosingToken(tokens, 0)).toBe(4);
    });

    it('returns null for unbalanced \\)', () => {
        const tokens = ['\\)', 'x'];
        expect(findClosingToken(tokens, 0)).toBeNull();
    });

    it('returns null for mismatched delimiters', () => {
        const tokens = ['\\(', 'x', '\\]'];
        expect(findClosingToken(tokens, 0)).toBeNull();
    });

    it('returns null when no closing token found', () => {
        const tokens = ['\\(', 'x'];
        expect(findClosingToken(tokens, 0)).toBeNull();
    });

    it('works with start offset', () => {
        const tokens = ['text', '\\(', 'x', '\\)'];
        expect(findClosingToken(tokens, 1)).toBe(3);
    });

    it('handles plain text tokens between delimiters', () => {
        const tokens = ['$', 'a', '+', 'b', '$'];
        expect(findClosingToken(tokens, 0)).toBe(4);
    });
});
