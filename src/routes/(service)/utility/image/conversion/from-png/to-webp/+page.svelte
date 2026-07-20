<script lang="ts">
	import { resolve } from '$app/paths';

	let file: File | null = null;

	function selectFile(event: Event) {
		const input = event.target as HTMLInputElement;

		if (input.files) {
			file = input.files[0];
		}
	}

	async function convert() {
		if (!file) return;

		const form = new FormData();

		form.append('image', file);

		const response = await fetch(
			resolve(
				'/api/(service)/utility/image/conversion/from-png/to-webp',
			),
			{
				method: 'POST',
				body: form,
			},
		);

		const blob = await response.blob();

		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');

		a.href = url;
		a.download = 'converted.webp';

		a.click();

		URL.revokeObjectURL(url);
	}
</script>

<h1>PNG to WebP Converter</h1>

<input type="file" accept="image/png" onchange={selectFile} />

<button onclick={convert}> Convert </button>
