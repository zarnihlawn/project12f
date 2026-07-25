<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		LucideDownload,
		LucideGauge,
		LucideImage,
		LucideRefreshCw,
		LucideSettings2,
		LucideUpload
	} from '@lucide/svelte';
	import HomeNavbar from '$lib/component/public/home/HomeNavbar.svelte';

	const FORMATS = [
		{ id: 'jpeg', label: 'JPEG', ext: 'jpg' },
		{ id: 'png', label: 'PNG', ext: 'png' },
		{ id: 'webp', label: 'WebP', ext: 'webp' },
		{ id: 'avif', label: 'AVIF', ext: 'avif' },
		{ id: 'gif', label: 'GIF', ext: 'gif' },
		{ id: 'tiff', label: 'TIFF', ext: 'tiff' }
	] as const;

	type FormatId = (typeof FORMATS)[number]['id'];

	const MIME_TO_FORMAT: Record<string, FormatId> = {
		'image/jpeg': 'jpeg',
		'image/jpg': 'jpeg',
		'image/png': 'png',
		'image/webp': 'webp',
		'image/avif': 'avif',
		'image/gif': 'gif',
		'image/tiff': 'tiff',
		'image/tif': 'tiff'
	};

	const PRESETS = [
		{
			id: 'maximum',
			label: 'Maximum quality',
			hint: 'Near-original look',
			quality: 92,
			effort: 6,
			lossless: false,
			nearLossless: false,
			palette: false,
			compressionLevel: 6,
			colors: 256
		},
		{
			id: 'balanced',
			label: 'Balanced',
			hint: 'Recommended default',
			quality: 75,
			effort: 4,
			lossless: false,
			nearLossless: false,
			palette: false,
			compressionLevel: 9,
			colors: 256
		},
		{
			id: 'small',
			label: 'Small file',
			hint: 'Aggressive savings',
			quality: 55,
			effort: 5,
			lossless: false,
			nearLossless: false,
			palette: false,
			compressionLevel: 9,
			colors: 256
		},
		{
			id: 'tiny',
			label: 'Tiny',
			hint: 'Smallest practical',
			quality: 40,
			effort: 6,
			lossless: false,
			nearLossless: false,
			palette: true,
			compressionLevel: 9,
			colors: 128
		}
	] as const;

	let file = $state<File | null>(null);
	let sourceFormat = $state<FormatId | null>(null);
	let format = $state<FormatId>('webp');
	let quality = $state(75);
	let effort = $state(4);
	let progressive = $state(true);
	let mozjpeg = $state(true);
	let optimizeScans = $state(true);
	let trellisQuantisation = $state(true);
	let overshootDeringing = $state(true);
	let chromaSubsampling = $state<'4:2:0' | '4:4:4'>('4:2:0');
	let compressionLevel = $state(9);
	let palette = $state(false);
	let colors = $state(256);
	let dither = $state(1);
	let lossless = $state(false);
	let nearLossless = $state(false);
	let smartSubsample = $state(true);
	let stripMetadata = $state(true);
	let maxWidth = $state<number | ''>('');
	let maxHeight = $state<number | ''>('');
	let fit = $state<'inside' | 'cover' | 'contain' | 'fill' | 'outside'>('inside');
	let withoutEnlargement = $state(true);
	let activePreset = $state<string>('balanced');
	let showAdvanced = $state(true);

	let previewUrl = $state<string | null>(null);
	let resultUrl = $state<string | null>(null);
	let resultBlob = $state<Blob | null>(null);
	let resultName = $state('');
	let originalSize = $state(0);
	let compressedSize = $state(0);
	let compressing = $state(false);
	let errorMessage = $state('');
	let dragOver = $state(false);

	const step = $derived(resultUrl ? 3 : file ? 2 : 1);
	const formatLabel = $derived(FORMATS.find((f) => f.id === format)?.label ?? '—');
	const sourceLabel = $derived(FORMATS.find((f) => f.id === sourceFormat)?.label ?? '—');
	const canCompress = $derived(!!file && !compressing);
	const showQuality = $derived(
		(format === 'jpeg' || format === 'webp' || format === 'avif' || format === 'tiff') &&
			!lossless
	);
	const showJpegExtras = $derived(format === 'jpeg');
	const showPngExtras = $derived(format === 'png');
	const showWebpExtras = $derived(format === 'webp');
	const showAvifExtras = $derived(format === 'avif');
	const showGifExtras = $derived(format === 'gif');
	const savingsPct = $derived(
		originalSize > 0 && compressedSize > 0
			? Math.round((1 - compressedSize / originalSize) * 100)
			: null
	);

	function formatBytes(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	}

	function detectFormat(f: File): FormatId | null {
		if (MIME_TO_FORMAT[f.type]) return MIME_TO_FORMAT[f.type];
		const ext = f.name.split('.').pop()?.toLowerCase();
		if (ext === 'jpg' || ext === 'jpeg') return 'jpeg';
		if (ext === 'tif') return 'tiff';
		return FORMATS.find((item) => item.ext === ext)?.id ?? null;
	}

	function clearResult() {
		if (resultUrl) URL.revokeObjectURL(resultUrl);
		resultUrl = null;
		resultBlob = null;
		resultName = '';
		compressedSize = 0;
		originalSize = 0;
	}

	function resetAll() {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		clearResult();
		file = null;
		sourceFormat = null;
		previewUrl = null;
		errorMessage = '';
	}

	function assignFile(next: File | null) {
		clearResult();
		errorMessage = '';
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewUrl = null;
		file = null;
		sourceFormat = null;
		if (!next) return;

		const detected = detectFormat(next);
		if (!detected && next.type && !next.type.startsWith('image/')) {
			errorMessage = 'Unsupported file. Please upload an image.';
			return;
		}

		file = next;
		sourceFormat = detected;
		previewUrl = URL.createObjectURL(next);
		if (detected) format = detected === 'gif' ? 'webp' : detected;
	}

	function onFileInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		assignFile(input.files?.[0] ?? null);
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		assignFile(event.dataTransfer?.files?.[0] ?? null);
	}

	function applyPreset(id: (typeof PRESETS)[number]['id']) {
		const preset = PRESETS.find((p) => p.id === id);
		if (!preset) return;
		activePreset = id;
		quality = preset.quality;
		effort = preset.effort;
		lossless = preset.lossless;
		nearLossless = preset.nearLossless;
		palette = preset.palette;
		compressionLevel = preset.compressionLevel;
		colors = preset.colors;
	}

	function boolField(value: boolean): string {
		return value ? 'true' : 'false';
	}

	async function compress() {
		if (!file) return;
		compressing = true;
		errorMessage = '';
		clearResult();

		try {
			const body = new FormData();
			body.set('image', file);
			body.set('format', format);
			body.set('quality', String(quality));
			body.set('effort', String(effort));
			body.set('progressive', boolField(progressive));
			body.set('mozjpeg', boolField(mozjpeg));
			body.set('optimizeScans', boolField(optimizeScans));
			body.set('trellisQuantisation', boolField(trellisQuantisation));
			body.set('overshootDeringing', boolField(overshootDeringing));
			body.set('chromaSubsampling', chromaSubsampling);
			body.set('compressionLevel', String(compressionLevel));
			body.set('palette', boolField(palette));
			body.set('colors', String(colors));
			body.set('dither', String(dither));
			body.set('lossless', boolField(lossless));
			body.set('nearLossless', boolField(nearLossless));
			body.set('smartSubsample', boolField(smartSubsample));
			body.set('stripMetadata', boolField(stripMetadata));
			body.set('fit', fit);
			body.set('withoutEnlargement', boolField(withoutEnlargement));
			if (maxWidth !== '') body.set('maxWidth', String(maxWidth));
			if (maxHeight !== '') body.set('maxHeight', String(maxHeight));

			const url = `/api/utility/image/compression/to-${format}`;
			const response = await fetch(url, { method: 'POST', body });
			if (!response.ok) {
				const text = await response.text();
				const stripped = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
				throw new Error(stripped.slice(0, 180) || `Compression failed (${response.status})`);
			}

			const blob = await response.blob();
			const disposition = response.headers.get('Content-Disposition') ?? '';
			const match = disposition.match(/filename="?([^"]+)"?/i);
			resultBlob = blob;
			resultUrl = URL.createObjectURL(blob);
			resultName = match?.[1] ?? `compressed.${format === 'jpeg' ? 'jpg' : format}`;
			originalSize = Number(response.headers.get('X-Original-Size') ?? file.size);
			compressedSize = Number(response.headers.get('X-Compressed-Size') ?? blob.size);
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Compression failed';
		} finally {
			compressing = false;
		}
	}

	function download() {
		if (!resultUrl) return;
		const a = document.createElement('a');
		a.href = resultUrl;
		a.download = resultName || 'compressed';
		a.click();
	}
</script>

<svelte:head>
	<title>Image Compression · project12f</title>
</svelte:head>

<HomeNavbar />

<div class="min-h-screen bg-base-200/40">
	<div class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
		<div class="breadcrumbs text-sm">
			<ul>
				<li><a href={resolve('/')}>Home</a></li>
				<li><a href={resolve('/(public)/(service)/utilities/image')}>Images</a></li>
				<li>Compression</li>
			</ul>
		</div>

		<section class="hero rounded-box bg-base-100 shadow-sm">
			<div class="hero-content w-full flex-col items-start gap-4 py-8 lg:flex-row lg:justify-between">
				<div class="max-w-xl">
					<div class="mb-3 flex flex-wrap gap-2">
						<span class="badge badge-primary badge-outline">Utilities</span>
						<span class="badge badge-secondary badge-outline">Sharp</span>
						<span class="badge badge-accent badge-outline">Tunable</span>
					</div>
					<h1 class="text-3xl font-bold tracking-tight md:text-4xl">Image compression</h1>
					<p class="mt-2 text-base-content/70">
						Shrink images with format-specific controls: quality, effort, chroma, palette,
						resize limits, metadata stripping, and more.
					</p>
				</div>
				<div class="stats bg-base-200 shadow-sm">
					<div class="stat place-items-center py-3">
						<div class="stat-figure text-primary"><LucideGauge class="size-8" /></div>
						<div class="stat-title">Output</div>
						<div class="stat-value text-2xl text-primary">{formatLabel}</div>
						<div class="stat-desc">via /compression/to-{format}</div>
					</div>
				</div>
			</div>
		</section>

		<ul class="steps steps-horizontal w-full">
			<li class="step" class:step-primary={step >= 1}>Upload</li>
			<li class="step" class:step-primary={step >= 2}>Tune</li>
			<li class="step" class:step-primary={step >= 3}>Download</li>
		</ul>

		{#if errorMessage}
			<div role="alert" class="alert alert-error shadow-sm">
				<span>{errorMessage}</span>
				<button class="btn btn-ghost btn-sm" onclick={() => (errorMessage = '')}>Dismiss</button>
			</div>
		{/if}

		<div class="grid gap-6 lg:grid-cols-5">
			<!-- Upload -->
			<div class="card bg-base-100 shadow-sm lg:col-span-2">
				<div class="card-body gap-4">
					<h2 class="card-title"><LucideUpload class="size-5" /> Source</h2>

					<div
						class={[
							'flex min-h-48 flex-col items-center justify-center gap-3 rounded-box border-2 border-dashed px-4 py-8 transition',
							dragOver
								? 'border-primary bg-primary/10'
								: 'border-base-300 bg-base-200/50 hover:border-primary/50'
						]}
						role="button"
						tabindex="0"
						ondragover={(e) => {
							e.preventDefault();
							dragOver = true;
						}}
						ondragleave={() => (dragOver = false)}
						ondrop={onDrop}
					>
						<LucideImage class="size-10 opacity-40" />
						<input
							type="file"
							class="file-input file-input-bordered file-input-primary w-full max-w-xs"
							accept="image/*"
							onchange={onFileInput}
						/>
					</div>

					{#if file && previewUrl}
						<figure class="overflow-hidden rounded-box border border-base-300 bg-base-200">
							<img src={previewUrl} alt="Source" class="max-h-52 w-full object-contain" />
						</figure>
						<div class="flex flex-wrap gap-2">
							<span class="badge badge-primary">{sourceLabel}</span>
							<span class="badge badge-outline">{formatBytes(file.size)}</span>
						</div>
						<p class="truncate text-sm" title={file.name}>{file.name}</p>
						<button class="btn btn-ghost btn-sm w-fit" onclick={resetAll}>
							<LucideRefreshCw class="size-4" /> Clear
						</button>
					{/if}
				</div>
			</div>

			<!-- Options -->
			<div class="card bg-base-100 shadow-sm lg:col-span-3">
				<div class="card-body gap-5">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<h2 class="card-title"><LucideSettings2 class="size-5" /> Compression options</h2>
						<button
							class="btn btn-ghost btn-sm"
							onclick={() => (showAdvanced = !showAdvanced)}
						>
							{showAdvanced ? 'Hide' : 'Show'} advanced
						</button>
					</div>

					<!-- Presets -->
					<div>
						<p class="mb-2 text-sm font-medium opacity-70">Presets</p>
						<div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
							{#each PRESETS as preset}
								<button
									type="button"
									class={[
										'btn h-auto flex-col items-start gap-0.5 py-3 text-left',
										activePreset === preset.id ? 'btn-primary' : 'btn-outline'
									]}
									onclick={() => applyPreset(preset.id)}
								>
									<span class="font-semibold">{preset.label}</span>
									<span class="text-xs font-normal opacity-70">{preset.hint}</span>
								</button>
							{/each}
						</div>
					</div>

					<div class="grid gap-4 md:grid-cols-2">
						<fieldset class="fieldset">
							<legend class="fieldset-legend">Output format</legend>
							<select class="select select-bordered w-full" bind:value={format}>
								{#each FORMATS as item}
									<option value={item.id}>{item.label}</option>
								{/each}
							</select>
						</fieldset>

						{#if showQuality}
							<fieldset class="fieldset">
								<legend class="fieldset-legend flex justify-between">
									<span>Quality</span>
									<span class="badge badge-outline">{quality}</span>
								</legend>
								<input type="range" min="1" max="100" class="range range-primary" bind:value={quality} />
							</fieldset>
						{/if}

						<fieldset class="fieldset">
							<legend class="fieldset-legend flex justify-between">
								<span>Effort / CPU</span>
								<span class="badge badge-outline">{effort}</span>
							</legend>
							<input type="range" min="0" max="9" class="range range-secondary" bind:value={effort} />
							<p class="label text-xs opacity-60">Higher = slower, often smaller</p>
						</fieldset>

						<label class="label cursor-pointer justify-start gap-3 rounded-box border border-base-300 px-4 py-3">
							<input type="checkbox" class="toggle toggle-primary" bind:checked={stripMetadata} />
							<span>
								<span class="font-medium">Strip metadata</span>
								<span class="block text-xs opacity-60">Remove EXIF / ICC when possible</span>
							</span>
						</label>
					</div>

					<!-- Resize -->
					<div class="rounded-box border border-base-300 p-4">
						<p class="mb-3 font-medium">Resize limits (optional)</p>
						<div class="grid gap-3 md:grid-cols-3">
							<fieldset class="fieldset">
								<legend class="fieldset-legend">Max width (px)</legend>
								<input
									type="number"
									min="1"
									class="input input-bordered w-full"
									placeholder="No limit"
									bind:value={maxWidth}
								/>
							</fieldset>
							<fieldset class="fieldset">
								<legend class="fieldset-legend">Max height (px)</legend>
								<input
									type="number"
									min="1"
									class="input input-bordered w-full"
									placeholder="No limit"
									bind:value={maxHeight}
								/>
							</fieldset>
							<fieldset class="fieldset">
								<legend class="fieldset-legend">Fit</legend>
								<select class="select select-bordered w-full" bind:value={fit}>
									<option value="inside">Inside</option>
									<option value="cover">Cover</option>
									<option value="contain">Contain</option>
									<option value="fill">Fill</option>
									<option value="outside">Outside</option>
								</select>
							</fieldset>
						</div>
						<label class="label mt-3 cursor-pointer justify-start gap-3">
							<input
								type="checkbox"
								class="checkbox checkbox-primary checkbox-sm"
								bind:checked={withoutEnlargement}
							/>
							<span class="label-text">Don't enlarge smaller images</span>
						</label>
					</div>

					{#if showAdvanced}
						<div class="divider">Format-specific tuning</div>

						{#if showJpegExtras}
							<div class="grid gap-3 md:grid-cols-2">
								<label class="label cursor-pointer justify-start gap-3 rounded-box bg-base-200 px-3 py-2">
									<input type="checkbox" class="checkbox checkbox-sm" bind:checked={progressive} />
									<span>Progressive JPEG</span>
								</label>
								<label class="label cursor-pointer justify-start gap-3 rounded-box bg-base-200 px-3 py-2">
									<input type="checkbox" class="checkbox checkbox-sm" bind:checked={mozjpeg} />
									<span>MozJPEG encoder</span>
								</label>
								<label class="label cursor-pointer justify-start gap-3 rounded-box bg-base-200 px-3 py-2">
									<input type="checkbox" class="checkbox checkbox-sm" bind:checked={optimizeScans} />
									<span>Optimize scans</span>
								</label>
								<label class="label cursor-pointer justify-start gap-3 rounded-box bg-base-200 px-3 py-2">
									<input
										type="checkbox"
										class="checkbox checkbox-sm"
										bind:checked={trellisQuantisation}
									/>
									<span>Trellis quantisation</span>
								</label>
								<label class="label cursor-pointer justify-start gap-3 rounded-box bg-base-200 px-3 py-2">
									<input
										type="checkbox"
										class="checkbox checkbox-sm"
										bind:checked={overshootDeringing}
									/>
									<span>Overshoot deringing</span>
								</label>
								<fieldset class="fieldset">
									<legend class="fieldset-legend">Chroma subsampling</legend>
									<select class="select select-bordered w-full" bind:value={chromaSubsampling}>
										<option value="4:2:0">4:2:0 (smaller)</option>
										<option value="4:4:4">4:4:4 (sharper color)</option>
									</select>
								</fieldset>
							</div>
						{/if}

						{#if showPngExtras}
							<div class="grid gap-3 md:grid-cols-2">
								<fieldset class="fieldset">
									<legend class="fieldset-legend flex justify-between">
										<span>PNG compression level</span>
										<span class="badge badge-outline">{compressionLevel}</span>
									</legend>
									<input
										type="range"
										min="0"
										max="9"
										class="range range-primary"
										bind:value={compressionLevel}
									/>
								</fieldset>
								<label class="label cursor-pointer justify-start gap-3 rounded-box bg-base-200 px-3 py-2">
									<input type="checkbox" class="checkbox checkbox-sm" bind:checked={progressive} />
									<span>Interlaced / progressive</span>
								</label>
								<label class="label cursor-pointer justify-start gap-3 rounded-box bg-base-200 px-3 py-2">
									<input type="checkbox" class="checkbox checkbox-sm" bind:checked={palette} />
									<span>Palette (8-bit) PNG</span>
								</label>
								{#if palette}
									<fieldset class="fieldset">
										<legend class="fieldset-legend flex justify-between">
											<span>Colors</span>
											<span class="badge badge-outline">{colors}</span>
										</legend>
										<input type="range" min="2" max="256" class="range" bind:value={colors} />
									</fieldset>
									<fieldset class="fieldset">
										<legend class="fieldset-legend flex justify-between">
											<span>Dither</span>
											<span class="badge badge-outline">{dither}</span>
										</legend>
										<input
											type="range"
											min="0"
											max="1"
											step="0.05"
											class="range"
											bind:value={dither}
										/>
									</fieldset>
								{/if}
							</div>
						{/if}

						{#if showWebpExtras}
							<div class="grid gap-3 md:grid-cols-2">
								<label class="label cursor-pointer justify-start gap-3 rounded-box bg-base-200 px-3 py-2">
									<input type="checkbox" class="checkbox checkbox-sm" bind:checked={lossless} />
									<span>Lossless WebP</span>
								</label>
								<label class="label cursor-pointer justify-start gap-3 rounded-box bg-base-200 px-3 py-2">
									<input type="checkbox" class="checkbox checkbox-sm" bind:checked={nearLossless} />
									<span>Near-lossless</span>
								</label>
								<label class="label cursor-pointer justify-start gap-3 rounded-box bg-base-200 px-3 py-2">
									<input type="checkbox" class="checkbox checkbox-sm" bind:checked={smartSubsample} />
									<span>Smart subsample</span>
								</label>
							</div>
						{/if}

						{#if showAvifExtras}
							<div class="grid gap-3 md:grid-cols-2">
								<label class="label cursor-pointer justify-start gap-3 rounded-box bg-base-200 px-3 py-2">
									<input type="checkbox" class="checkbox checkbox-sm" bind:checked={lossless} />
									<span>Lossless AVIF</span>
								</label>
								<fieldset class="fieldset">
									<legend class="fieldset-legend">Chroma subsampling</legend>
									<select class="select select-bordered w-full" bind:value={chromaSubsampling}>
										<option value="4:2:0">4:2:0 (smaller)</option>
										<option value="4:4:4">4:4:4 (sharper color)</option>
									</select>
								</fieldset>
							</div>
						{/if}

						{#if showGifExtras}
							<div class="grid gap-3 md:grid-cols-2">
								<fieldset class="fieldset">
									<legend class="fieldset-legend flex justify-between">
										<span>Colors</span>
										<span class="badge badge-outline">{colors}</span>
									</legend>
									<input type="range" min="2" max="256" class="range" bind:value={colors} />
								</fieldset>
								<fieldset class="fieldset">
									<legend class="fieldset-legend flex justify-between">
										<span>Dither</span>
										<span class="badge badge-outline">{dither}</span>
									</legend>
									<input
										type="range"
										min="0"
										max="1"
										step="0.05"
										class="range"
										bind:value={dither}
									/>
								</fieldset>
							</div>
						{/if}

						{#if format === 'tiff'}
							<label class="label cursor-pointer justify-start gap-3 rounded-box bg-base-200 px-3 py-2">
								<input type="checkbox" class="checkbox checkbox-sm" bind:checked={lossless} />
								<span>Lossless TIFF (LZW) — off uses JPEG compression inside TIFF</span>
							</label>
						{/if}
					{/if}

					<div class="card-actions">
						<button class="btn btn-primary w-full" disabled={!canCompress} onclick={compress}>
							{#if compressing}
								<span class="loading loading-spinner"></span>
								Compressing…
							{:else}
								Compress image
							{/if}
						</button>
					</div>
					{#if compressing}
						<progress class="progress progress-primary w-full"></progress>
					{/if}
				</div>
			</div>
		</div>

		{#if resultUrl && resultBlob}
			<div class="card bg-base-100 shadow-sm">
				<div class="card-body gap-4">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<h2 class="card-title"><LucideDownload class="size-5" /> Result</h2>
						<div class="flex flex-wrap gap-2">
							<span class="badge badge-success">{formatLabel}</span>
							<span class="badge badge-outline">{formatBytes(compressedSize || resultBlob.size)}</span>
							{#if savingsPct != null}
								<span class={['badge', savingsPct >= 0 ? 'badge-primary' : 'badge-warning']}>
									{savingsPct >= 0 ? `${savingsPct}% smaller` : `${Math.abs(savingsPct)}% larger`}
								</span>
							{/if}
						</div>
					</div>

					<div class="stats w-full bg-base-200 shadow-sm">
						<div class="stat">
							<div class="stat-title">Original</div>
							<div class="stat-value text-xl">{formatBytes(originalSize || file?.size || 0)}</div>
						</div>
						<div class="stat">
							<div class="stat-title">Compressed</div>
							<div class="stat-value text-xl text-primary">
								{formatBytes(compressedSize || resultBlob.size)}
							</div>
						</div>
						<div class="stat">
							<div class="stat-title">Saved</div>
							<div class="stat-value text-xl text-secondary">
								{formatBytes(
									Math.max(0, (originalSize || file?.size || 0) - (compressedSize || resultBlob.size))
								)}
							</div>
						</div>
					</div>

					<div class="grid gap-4 md:grid-cols-2">
						<figure class="overflow-hidden rounded-box border border-base-300 bg-base-200">
							<img src={resultUrl} alt="Compressed preview" class="max-h-80 w-full object-contain" />
						</figure>
						<div class="flex flex-col justify-between gap-4">
							<div>
								<p class="font-medium">{resultName}</p>
								<p class="mt-1 text-sm text-base-content/60">
									API <code class="text-primary">/api/utility/image/compression/to-{format}</code>
								</p>
							</div>
							<div class="join join-vertical sm:join-horizontal">
								<button class="btn btn-secondary join-item" onclick={download}>
									<LucideDownload class="size-4" /> Download
								</button>
								<button class="btn btn-ghost join-item" onclick={compress} disabled={compressing}>
									Compress again
								</button>
								<button class="btn btn-outline join-item" onclick={resetAll}>New file</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
