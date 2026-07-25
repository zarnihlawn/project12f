import { error } from '@sveltejs/kit';
import sharp from 'sharp';

export async function POST({ request }) {
	const formData = await request.formData();

	const file = formData.get('image');

	if (!(file instanceof File)) {
		throw error(400, 'No image uploaded');
	}

	if (file.type !== 'image/png') {
		throw error(400, 'Only PNG files are supported');
	}

	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	const webpBuffer = await sharp(buffer)
		.jpeg({
			quality: 80,
		})
		.toBuffer();

	return new Response(webpBuffer, {
		headers: {
			'Content-Type': 'image/webp',
			'Content-Disposition': 'attachment; filename="converted.webp"',
		},
	});
}
