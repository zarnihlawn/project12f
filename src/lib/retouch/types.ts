/** Retouch — lightweight single-image quick edit types. */

export type RetouchTool = 'pan' | 'crop';

/** How the crop region is defined */
export type CropMode = 'rect' | 'ellipse' | 'pen';

export type CropAspect = 'free' | '1:1' | '4:3' | '3:4' | '16:9' | '9:16';

export type ExportFormat = 'png' | 'jpeg' | 'webp';

export type RetouchPanel = 'size' | 'crop' | 'adjust' | 'filters' | 'export';

export type RetouchFilterId =
	| 'grayscale'
	| 'invert'
	| 'blur'
	| 'sharpen'
	| 'noise'
	| 'emboss'
	| 'find-edges';

export interface RetouchImage {
	name: string;
	width: number;
	height: number;
	data: Uint8ClampedArray;
}

export interface CropRect {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface CropPoint {
	x: number;
	y: number;
}

export const ACCEPT_TYPES =
	'image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp,.avif,.heic,.heif';

export const TIFF_HINT =
	'TIFF is not opened in Retouch — use Image Conversion first, then open the result here.';

/** Hit radius in document pixels for closing the pen path (scaled by zoom in UI). */
export const PEN_CLOSE_THRESHOLD = 14;

export function cloneImage(img: RetouchImage): RetouchImage {
	return {
		name: img.name,
		width: img.width,
		height: img.height,
		data: new Uint8ClampedArray(img.data)
	};
}

export function toImageData(img: RetouchImage): ImageData {
	const data = new Uint8ClampedArray(img.data);
	if (typeof ImageData !== 'undefined') {
		return new ImageData(data, img.width, img.height);
	}
	return { data, width: img.width, height: img.height } as ImageData;
}

export function fromImageData(name: string, imageData: ImageData): RetouchImage {
	return {
		name,
		width: imageData.width,
		height: imageData.height,
		data: new Uint8ClampedArray(imageData.data)
	};
}
