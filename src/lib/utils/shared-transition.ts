export interface SharedTransitionTarget {
	astronautId: number | null;
	areaId: string | null;
}

const crewDetail = /^\/crew\/(\d+)(?:\/|$)/;
const measurementsList = /^\/crew\/\d+\/measurements\/?$/;
const measurementsArea = /^\/crew\/\d+\/measurements\/([^/]+)\/?$/;

/**
 * Returns the item that should be shared between the two pages, or `null`
 * when the navigation is not one of the list/detail pairs we animate.
 */
export function resolveSharedTransition(from: URL, to: URL): SharedTransitionTarget | null {
	const fromCrew = crewDetail.exec(from.pathname);
	const toCrew = crewDetail.exec(to.pathname);

	if (from.pathname === '/' && toCrew) {
		return { astronautId: Number(toCrew[1]), areaId: null };
	}
	if (to.pathname === '/' && fromCrew) {
		return { astronautId: Number(fromCrew[1]), areaId: null };
	}

	const fromArea = measurementsArea.exec(from.pathname);
	const toArea = measurementsArea.exec(to.pathname);

	if (measurementsList.test(from.pathname) && toArea) {
		return { astronautId: null, areaId: toArea[1] };
	}
	if (measurementsList.test(to.pathname) && fromArea) {
		return { astronautId: null, areaId: fromArea[1] };
	}

	return null;
}

export function astronautAvatarName(id: number): string {
	return `astronaut-avatar-${id}`;
}

export function astronautNameName(id: number): string {
	return `astronaut-name-${id}`;
}

export function areaIconName(id: string): string {
	return `area-icon-${id}`;
}

export function areaTitleName(id: string): string {
	return `area-title-${id}`;
}
