function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

/**
 * Minimal markdown for the medical dossier. The input is escaped before any
 * formatting, so raw HTML can never reach `{@html}`. Only http/https links are
 * turned into anchors.
 */
function renderInline(escaped: string): string {
	const code: string[] = [];
	let text = escaped.replace(/`([^`]+)`/g, (_, content: string) => {
		code.push(`<code>${content}</code>`);
		return `\uE000${code.length - 1}\uE000`;
	});

	text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
	text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
	text = text.replace(/_([^_]+)_/g, '<em>$1</em>');
	text = text.replace(
		/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
		'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
	);

	return text.replace(/\uE000(\d+)\uE000/g, (_, index: string) => code[Number(index)] ?? '');
}

export function renderMarkdown(source: string): string {
	const lines = source.replace(/\r\n/g, '\n').split('\n');
	const html: string[] = [];
	let paragraph: string[] = [];
	let list: { type: 'ul' | 'ol'; items: string[] } | null = null;

	function flushParagraph(): void {
		if (paragraph.length === 0) return;
		html.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
		paragraph = [];
	}

	function flushList(): void {
		if (!list) return;
		const items = list.items.map((item) => `<li>${renderInline(item)}</li>`).join('');
		html.push(`<${list.type}>${items}</${list.type}>`);
		list = null;
	}

	for (const rawLine of lines) {
		const line = rawLine.trimEnd();
		if (line.trim() === '') {
			flushParagraph();
			flushList();
			continue;
		}

		const heading = /^(#{1,3})\s+(.*)$/.exec(line);
		if (heading) {
			flushParagraph();
			flushList();
			const level = heading[1].length;
			html.push(`<h${level}>${renderInline(escapeHtml(heading[2]))}</h${level}>`);
			continue;
		}

		const unordered = /^[-*]\s+(.*)$/.exec(line);
		if (unordered) {
			flushParagraph();
			if (!list || list.type !== 'ul') {
				flushList();
				list = { type: 'ul', items: [] };
			}
			list.items.push(escapeHtml(unordered[1]));
			continue;
		}

		const ordered = /^\d+\.\s+(.*)$/.exec(line);
		if (ordered) {
			flushParagraph();
			if (!list || list.type !== 'ol') {
				flushList();
				list = { type: 'ol', items: [] };
			}
			list.items.push(escapeHtml(ordered[1]));
			continue;
		}

		flushList();
		paragraph.push(escapeHtml(line));
	}

	flushParagraph();
	flushList();
	return html.join('\n');
}
