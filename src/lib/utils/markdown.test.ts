import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '#lib/utils/markdown.js';

describe('renderMarkdown', () => {
	it('escapes raw HTML', () => {
		expect(renderMarkdown('<script>alert(1)</script>')).toBe(
			'<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>'
		);
	});

	it('renders headings and paragraphs', () => {
		expect(renderMarkdown('# History\n\nFirst line\nsecond line')).toBe(
			'<h1>History</h1>\n<p>First line second line</p>'
		);
	});

	it('renders bold, italic and inline code', () => {
		expect(renderMarkdown('**Bold** and *italic* and `code`')).toBe(
			'<p><strong>Bold</strong> and <em>italic</em> and <code>code</code></p>'
		);
	});

	it('renders unordered and ordered lists', () => {
		expect(renderMarkdown('- one\n- two\n\n1. first\n2. second')).toBe(
			'<ul><li>one</li><li>two</li></ul>\n<ol><li>first</li><li>second</li></ol>'
		);
	});

	it('only links http and https URLs', () => {
		expect(renderMarkdown('[site](https://example.com)')).toBe(
			'<p><a href="https://example.com" target="_blank" rel="noopener noreferrer">site</a></p>'
		);
		expect(renderMarkdown('[bad](javascript:alert(1))')).toBe('<p>[bad](javascript:alert(1))</p>');
	});

	it('does not format inside inline code', () => {
		expect(renderMarkdown('`**not bold**`')).toBe('<p><code>**not bold**</code></p>');
	});
});
