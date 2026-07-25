import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	compressImageBuffer,
	parseCompressionFormData
} from '$lib/server/utility/image/compression';
import { formatFromMime, normalizeFormat } from '$lib/server/utility/image/conversion';

export const POST: RequestHandler = async ({ request, params }) => {
	const routeFormat = normalizeFormat(params.format);

	const formData = await request.formData();
	const file = formData.get('image');

	if (!(file instanceof File)) {
		throw error(400, 'No image uploaded');
	}

	if (file.type && !file.type.startsWith('image/') && !formatFromMime(file.type)) {
		throw error(400, 'Only image files are supported');
	}

	const options = parseCompressionFormData(formData);
	if (routeFormat) options.format = routeFormat;

	const buffer = Buffer.from(await file.arrayBuffer());

	try {
		const result = await compressImageBuffer(buffer, options);
		const filename = result.filename(file.name);

		return new Response(new Uint8Array(result.buffer), {
			headers: {
				'Content-Type': result.mime,
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Content-Length': String(result.buffer.byteLength),
				'X-Original-Size': String(buffer.byteLength),
				'X-Compressed-Size': String(result.buffer.byteLength),
				'X-Output-Format': result.format
			}
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error('Image compression failed:', err);
		throw error(400, 'Could not compress this image. The file may be corrupt or unsupported.');
	}
};
