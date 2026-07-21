<script lang="ts">
	let {
		loadingReason = 'Loading',
		loadingProgress = 0
	}: {
		loadingReason?: string;
		/** 0–100 — three draw steps: core → orbit 1 → orbit 2 */
		loadingProgress?: number;
	} = $props();

	const progress = $derived(Math.min(100, Math.max(0, loadingProgress)) / 100);

	/** How far through step `index` (0–2), clamped to 0–1. */
	function stepProgress(index: number): number {
		const start = index / 3;
		const end = (index + 1) / 3;
		return Math.min(1, Math.max(0, (progress - start) / (end - start)));
	}

	/**
	 * Maps local 0–1 progress to stroke-dashoffset when pathLength="1".
	 * 1 = fully hidden, 0 = fully drawn.
	 */
	function dashOffset(t: number): number {
		return 1 - Math.min(1, Math.max(0, t));
	}

	/** Within an orbit step: draw the arc first, then the satellite. */
	function orbitArcT(t: number): number {
		return Math.min(1, Math.max(0, t / 0.65));
	}
	function orbitSatT(t: number): number {
		return Math.min(1, Math.max(0, (t - 0.65) / 0.35));
	}

	const coreT = $derived(stepProgress(0));
	const orbit1T = $derived(stepProgress(1));
	const orbit2T = $derived(stepProgress(2));
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-base-100/40 backdrop-blur-md"
	role="status"
	aria-live="polite"
	aria-busy="true"
>
	<div class="flex flex-col items-center gap-5">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="#F62440"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="size-30 animate-[spin_3s_linear_infinite]"
			aria-hidden="true"
		>
			<!-- Step 1: draw center -->
			<circle
				cx="12"
				cy="12"
				r="3"
				pathLength="1"
				stroke-dasharray="1"
				stroke-dashoffset={dashOffset(coreT)}
			/>

			<!-- Step 2: draw first arc, then its satellite -->
			<path
				d="M20.341 6.484A10 10 0 0 1 10.266 21.85"
				pathLength="1"
				stroke-dasharray="1"
				stroke-dashoffset={dashOffset(orbitArcT(orbit1T))}
			/>
			<circle
				cx="19"
				cy="5"
				r="2"
				pathLength="1"
				stroke-dasharray="1"
				stroke-dashoffset={dashOffset(orbitSatT(orbit1T))}
			/>

			<!-- Step 3: draw second arc, then its satellite -->
			<path
				d="M3.659 17.516A10 10 0 0 1 13.74 2.152"
				pathLength="1"
				stroke-dasharray="1"
				stroke-dashoffset={dashOffset(orbitArcT(orbit2T))}
			/>
			<circle
				cx="5"
				cy="19"
				r="2"
				pathLength="1"
				stroke-dasharray="1"
				stroke-dashoffset={dashOffset(orbitSatT(orbit2T))}
			/>
		</svg>

		<p class="text-2xl italic opacity-60">
			{loadingReason}
			{Math.round(loadingProgress)}% ...
		</p>
	</div>
</div>
