<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		LucideArrowRightLeft,
		LucideDownload,
		LucideImage,
		LucideRefreshCw,
		LucideUpload
	} from '@lucide/svelte';
	import SeoHead from '$lib/component/seo/SeoHead.svelte';
	import { breadcrumbJsonLd, softwareAppJsonLd, webPageJsonLd } from '$lib/seo/jsonld';

	let { data } = $props();

	const title = 'Image conversion';
	const description =
		'Convert JPEG, PNG, WebP, AVIF, GIF, and TIFF online with project12f. Upload any supported image, pick a target format, and download instantly.';

	const FORMATS = [
		{ id: 'jpeg', label: 'JPEG', mime: 'image/jpeg', ext: 'jpg' },
		{ id: 'png', label: 'PNG', mime: 'image/png', ext: 'png' },
		{ id: 'webp', label: 'WebP', mime: 'image/webp', ext: 'webp' },
		{ id: 'avif', label: 'AVIF', mime: 'image/avif', ext: 'avif' },
		{ id: 'gif', label: 'GIF', mime: 'image/gif', ext: 'gif' },
		{ id: 'tiff', label: 'TIFF', mime: 'image/tiff', ext: 'tiff' }
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

	let file = $state<File | null>(null);
	let fromFormat = $state<FormatId | null>(null);
	let toFormat = $state<FormatId>('webp');
	let quality = $state(80);
	let previewUrl = $state<string | null>(null);
	let resultUrl = $state<string | null>(null);
	let resultBlob = $state<Blob | null>(null);
	let resultName = $state('');
	let converting = $state(false);
	let errorMessage = $state('');
	let dragOver = $state(false);

	const step = $derived(resultUrl ? 3 : file ? 2 : 1);
	const lossy = $derived(toFormat === 'jpeg' || toFormat === 'webp' || toFormat === 'avif');
	const fromLabel = $derived(FORMATS.find((f) => f.id === fromFormat)?.label ?? '—');
	const toLabel = $derived(FORMATS.find((f) => f.id === toFormat)?.label ?? '—');
	const canConvert = $derived(!!file && !!fromFormat && !!toFormat && !converting);

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
	}

	function resetAll() {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		clearResult();
		file = null;
		fromFormat = null;
		previewUrl = null;
		errorMessage = '';
		quality = 80;
	}

	function assignFile(next: File | null) {
		clearResult();
		errorMessage = '';
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewUrl = null;
		file = null;
		fromFormat = null;

		if (!next) return;

		const detected = detectFormat(next);
		if (!detected) {
			errorMessage = 'Unsupported image type. Use JPEG, PNG, WebP, AVIF, GIF, or TIFF.';
			return;
		}

		file = next;
		fromFormat = detected;
		previewUrl = URL.createObjectURL(next);
		if (toFormat === detected) {
			toFormat = detected === 'webp' ? 'png' : 'webp';
		}
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

	async function convert() {
		if (!file || !fromFormat) return;

		converting = true;
		errorMessage = '';
		clearResult();

		try {
			const body = new FormData();
			body.set('image', file);
			body.set('quality', String(quality));

			const url = `/api/utility/image/conversion/from-${fromFormat}/to-${toFormat}`;
			const response = await fetch(url, { method: 'POST', body });
			if (!response.ok) {
				const text = await response.text();
				const stripped = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
				throw new Error(stripped.slice(0, 180) || `Conversion failed (${response.status})`);
			}

			const blob = await response.blob();
			const disposition = response.headers.get('Content-Disposition') ?? '';
			const match = disposition.match(/filename="?([^"]+)"?/i);
			resultBlob = blob;
			resultUrl = URL.createObjectURL(blob);
			resultName = match?.[1] ?? `converted.${toFormat === 'jpeg' ? 'jpg' : toFormat}`;
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Conversion failed';
		} finally {
			converting = false;
		}
	}

	function download() {
		if (!resultUrl || !resultBlob) return;
		const a = document.createElement('a');
		a.href = resultUrl;
		a.download = resultName || 'converted';
		a.click();
	}
</script>

<SeoHead
	siteOrigin={data.siteOrigin}
	{title}
	{description}
	path="/utilities/image/conversion"
	jsonLd={[
		webPageJsonLd({
			origin: data.siteOrigin,
			path: '/utilities/image/conversion',
			title,
			description
		}),
		softwareAppJsonLd({
			origin: data.siteOrigin,
			path: '/utilities/image/conversion',
			name: 'project12f Image Conversion',
			description
		}),
		breadcrumbJsonLd(data.siteOrigin, [
			{ name: 'Home', path: '/home' },
			{ name: 'Image utilities', path: '/utilities/image' },
			{ name: 'Conversion', path: '/utilities/image/conversion' }
		])
	]}
/>

<div class="bg-base-200/40">
	<div class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
		<div class="breadcrumbs text-sm">
			<ul>
				<li><a href={resolve('/')}>Home</a></li>
				<li><a href={resolve('/(public)/(service)/utilities/image')}>Images</a></li>
				<li>Conversion</li>
			</ul>
		</div>

		<section class="hero rounded-box bg-base-100 shadow-sm">
			<div class="hero-content w-full flex-col items-start gap-4 py-8 lg:flex-row lg:justify-between">
				<div class="max-w-xl">
					<div class="mb-3 flex flex-wrap gap-2">
						<span class="badge badge-primary badge-outline">Utilities</span>
						<span class="badge badge-secondary badge-outline">Sharp</span>
						<span class="badge badge-accent badge-outline">Any → Any</span>
					</div>
					<h1 class="text-3xl font-bold tracking-tight md:text-4xl">Image conversion</h1>
					<p class="mt-2 text-base-content/70">
						Convert between JPEG, PNG, WebP, AVIF, GIF, and TIFF. Upload any supported
						image, pick a target format, and download the result.
					</p>
				</div>
				<div class="stats stats-vertical w-full max-w-xs bg-base-200 shadow-sm lg:stats-horizontal lg:max-w-none lg:w-auto">
					<div class="stat place-items-center py-3">
						<div class="stat-title">Formats</div>
						<div class="stat-value text-2xl text-primary">{FORMATS.length}</div>
					</div>
					<div class="stat place-items-center py-3">
						<div class="stat-title">Routes</div>
						<div class="stat-value text-2xl text-secondary">
							{FORMATS.length * (FORMATS.length - 1)}+
						</div>
					</div>
				</div>
			</div>
		</section>

		<ul class="steps steps-horizontal w-full">
			<li class="step" class:step-primary={step >= 1}>Upload</li>
			<li class="step" class:step-primary={step >= 2}>Convert</li>
			<li class="step" class:step-primary={step >= 3}>Download</li>
		</ul>

		{#if errorMessage}
			<div role="alert" class="alert alert-error shadow-sm">
				<span>{errorMessage}</span>
				<button class="btn btn-ghost btn-sm" onclick={() => (errorMessage = '')}>Dismiss</button>
			</div>
		{/if}

		<div class="grid gap-6 lg:grid-cols-5">
			<div class="card bg-base-100 shadow-sm lg:col-span-3">
				<div class="card-body gap-5">
					<h2 class="card-title">
						<LucideUpload class="size-5" />
						Source image
					</h2>

					<div
						class={[
							'flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 rounded-box border-2 border-dashed px-6 py-10 transition',
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
						<p class="text-center text-sm text-base-content/70">
							Drag & drop an image here, or choose a file
						</p>
						<input
							type="file"
							class="file-input file-input-bordered file-input-primary w-full max-w-md"
							accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/tiff,.jpg,.jpeg,.png,.webp,.avif,.gif,.tif,.tiff"
							onchange={onFileInput}
						/>
						<div class="flex flex-wrap justify-center gap-2">
							{#each FORMATS as format}
								<span class="badge badge-ghost badge-sm">{format.label}</span>
							{/each}
						</div>
					</div>

					{#if file && previewUrl}
						<div class="divider">Preview</div>
						<div class="flex flex-col gap-4 md:flex-row">
							<figure class="overflow-hidden rounded-box border border-base-300 bg-base-200">
								<img
									src={previewUrl}
									alt="Source preview"
									class="max-h-64 w-full object-contain"
								/>
							</figure>
							<div class="flex flex-1 flex-col gap-2">
								<div class="flex flex-wrap gap-2">
									<span class="badge badge-primary">{fromLabel}</span>
									<span class="badge badge-outline">{formatBytes(file.size)}</span>
								</div>
								<p class="truncate text-sm font-medium" title={file.name}>{file.name}</p>
								<p class="text-xs text-base-content/60">{file.type || 'type unknown'}</p>
								<button class="btn btn-ghost btn-sm w-fit" onclick={resetAll}>
									<LucideRefreshCw class="size-4" />
									Clear
								</button>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<div class="card bg-base-100 shadow-sm lg:col-span-2">
				<div class="card-body gap-4">
					<h2 class="card-title">
						<LucideArrowRightLeft class="size-5" />
						Target format
					</h2>

					<fieldset class="fieldset w-full">
						<legend class="fieldset-legend">Convert to</legend>
						<select class="select select-bordered w-full" bind:value={toFormat}>
							{#each FORMATS as format}
								<option value={format.id} disabled={format.id === fromFormat}>
									{format.label}
									{format.id === fromFormat ? '(same as source)' : ''}
								</option>
							{/each}
						</select>
					</fieldset>

					{#if lossy}
						<fieldset class="fieldset w-full">
							<legend class="fieldset-legend flex w-full items-center justify-between gap-2">
								<span>Quality</span>
								<span class="badge badge-outline">{quality}</span>
							</legend>
							<input
								type="range"
								min="1"
								max="100"
								class="range range-primary"
								bind:value={quality}
							/>
							<div class="mt-1 flex w-full justify-between px-1 text-xs opacity-50">
								<span>Smaller</span>
								<span>Better</span>
							</div>
						</fieldset>
					{:else}
						<div class="alert alert-info text-sm">
							<span>PNG / GIF / TIFF use lossless encoding (quality slider hidden).</span>
						</div>
					{/if}

					<div class="rounded-box bg-base-200 p-4">
						<div class="flex items-center justify-center gap-3 text-lg font-semibold">
							<span class="badge badge-lg badge-primary">{fromLabel}</span>
							<LucideArrowRightLeft class="size-5 opacity-60" />
							<span class="badge badge-lg badge-secondary">{toLabel}</span>
						</div>
						<p class="mt-2 text-center text-xs text-base-content/60">
							API:
							<code class="text-primary">
								/api/utility/image/conversion/from-{fromFormat ?? '…'}/to-{toFormat}
							</code>
						</p>
					</div>

					<div class="card-actions mt-2">
						<button class="btn btn-primary w-full" disabled={!canConvert} onclick={convert}>
							{#if converting}
								<span class="loading loading-spinner"></span>
								Converting…
							{:else}
								Convert image
							{/if}
						</button>
					</div>

					{#if converting}
						<progress class="progress progress-primary w-full"></progress>
					{/if}
				</div>
			</div>
		</div>

		{#if resultUrl && resultBlob}
			<div class="card bg-base-100 shadow-sm">
				<div class="card-body gap-4">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<h2 class="card-title">
							<LucideDownload class="size-5" />
							Result
						</h2>
						<div class="flex flex-wrap gap-2">
							<span class="badge badge-success">{toLabel}</span>
							<span class="badge badge-outline">{formatBytes(resultBlob.size)}</span>
							{#if file}
								<span class="badge badge-ghost">
									{resultBlob.size <= file.size ? 'Smaller or equal' : 'Larger'} than source
								</span>
							{/if}
						</div>
					</div>

					<div class="grid gap-4 md:grid-cols-2">
						<figure class="overflow-hidden rounded-box border border-base-300 bg-base-200">
							<img src={resultUrl} alt="Converted preview" class="max-h-80 w-full object-contain" />
						</figure>
						<div class="flex flex-col justify-between gap-4">
							<div>
								<p class="font-medium">{resultName}</p>
								<p class="mt-1 text-sm text-base-content/60">
									Ready to download. Conversion used
									<code>from-{fromFormat}/to-{toFormat}</code>.
								</p>
							</div>
							<div class="join join-vertical sm:join-horizontal">
								<button class="btn btn-secondary join-item" onclick={download}>
									<LucideDownload class="size-4" />
									Download
								</button>
								<button class="btn btn-ghost join-item" onclick={convert} disabled={converting}>
									Convert again
								</button>
								<button class="btn btn-outline join-item" onclick={resetAll}>New file</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<div class="collapse-arrow collapse bg-base-100 shadow-sm">
			<input type="checkbox" />
			<div class="collapse-title font-medium">Supported conversion matrix</div>
			<div class="collapse-content">
				<div class="overflow-x-auto">
					<table class="table table-zebra table-sm">
						<thead>
							<tr>
								<th>From \\ To</th>
								{#each FORMATS as to}
									<th>{to.label}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each FORMATS as from}
								<tr>
									<th>{from.label}</th>
									{#each FORMATS as to}
										<td>
											{#if from.id === to.id}
												<span class="badge badge-ghost badge-xs">—</span>
											{:else}
												<span class="badge badge-outline badge-xs badge-success">OK</span>
											{/if}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</div>
