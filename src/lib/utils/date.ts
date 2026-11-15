export function formatDate(iso: string): string {
	const date = new Date(`${iso}T00:00:00`);

	if (Number.isNaN(date.getTime())) return iso;

	return new Intl.DateTimeFormat('en', {
		day: '2-digit',
		month: 'short',
		year: 'numeric'
	}).format(date);
}
