import { describe, expect, it } from 'vitest';
import { blendChannel, compositePixel } from './compositor/blend';
import { createDocument, createRasterLayer } from './document/factory';
import { compositeDocument } from './compositor/composite';
import { HistoryStack } from './commands/history';
import { addLayerCommand } from './commands/layer-commands';

describe('blend', () => {
	it('multiply darkens', () => {
		const [r] = blendChannel('multiply', 128, 128, 128, 128, 128, 128);
		expect(r).toBeLessThan(128);
	});

	it('compositePixel respects zero alpha', () => {
		const out = compositePixel('normal', 255, 0, 0, 0, 10, 20, 30, 255, 100);
		expect(out[0]).toBe(10);
		expect(out[3]).toBe(255);
	});
});

describe('document + composite', () => {
	it('creates white background document', () => {
		const doc = createDocument({ width: 16, height: 16, background: 'white' });
		expect(doc.layers).toHaveLength(1);
		const img = compositeDocument(doc);
		expect(img.width).toBe(16);
		expect(img.data[0]).toBe(255);
		expect(img.data[3]).toBe(255);
	});

	it('undo add layer', () => {
		const doc = createDocument({ width: 8, height: 8, background: 'transparent' });
		const history = new HistoryStack();
		const layer = createRasterLayer('A', 8, 8);
		history.execute(doc, addLayerCommand(layer));
		expect(doc.layers).toHaveLength(1);
		history.undo(doc);
		expect(doc.layers).toHaveLength(0);
	});
});
