export interface SharedTransitionState {
	astronautId: number | null;
	areaId: string | null;
}

export const sharedTransition = $state<SharedTransitionState>({
	astronautId: null,
	areaId: null
});

export function resetSharedTransition(): void {
	sharedTransition.astronautId = null;
	sharedTransition.areaId = null;
}
