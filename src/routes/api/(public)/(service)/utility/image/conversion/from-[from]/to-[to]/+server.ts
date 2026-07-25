import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	convertImageBuffer,
	convertedFilename,
	FORMAT_MIME,
	formatFromMime,
	normalizeFormat
} from '$lib/server/utility/image/conversion';

export const POST: RequestHandler = async ({ request, params }) => {
	const from = normalizeFormat(params.from);
	const to = normalizeFormat(params.to);

	if (!from || !to) {
		throw error(400, 'Unsupported format. Use jpeg, png, webp, avif, gif, or tiff.');
	}

	const formData = await request.formData();
	const file = formData.get('image');

	if (!(file instanceof File)) {
		throw error(400, 'No image uploaded');
	}

	const detected = formatFromMime(file.type);
	if (detected && detected !== from) {
		throw error(
			400,
			`Expected ${from.toUpperCase()} but received ${detected.toUpperCase()} (${file.type || 'unknown type'})`
		);
	}

	if (!detected && file.type && !file.type.startsWith('image/')) {
		throw error(400, 'Only image files are supported');
	}

	const qualityRaw = formData.get('quality');
	const quality =
		typeof qualityRaw === 'string' && qualityRaw.trim() !== ''
			? Number(qualityRaw)
			: 80;

	if (!Number.isFinite(quality) || quality < 1 || quality > 100) {
		throw error(400, 'Quality must be a number between 1 and 100');
	}

	const buffer = Buffer.from(await file.arrayBuffer());

	try {
		const output = await convertImageBuffer(buffer, to, quality);
		const filename = convertedFilename(file.name, to);

		return new Response(new Uint8Array(output), {
			headers: {
				'Content-Type': FORMAT_MIME[to],
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Content-Length': String(output.byteLength)
			}
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error('Image conversion failed:', err);
		throw error(400, 'Could not convert this image. The file may be corrupt or unsupported.');
	}
};
