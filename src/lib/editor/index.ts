/**
 * project12f Image Editor
 *
 * Phase 0–1: working pro core (document, layers, brush, select, masks, adjustments, filters subset, .p12f)
 * Phase 2–3: styles, vectors, PSD, intelligence heuristics
 * Phase 4: brush dynamics, mixer/pattern/history, ABR, artboards, CMYK soft-proof, print
 */

export * from './types';
export * from './document/factory';
export * from './compositor/composite';
export * from './compositor/blend';
export * from './commands/history';
export * from './io/p12f';
export * from './io/psd';
export * from './filters/catalog';
export * from './roadmap';
export * from './effects/styles';
export * from './intelligence/vision';
export * from './vectors/paths';
export * from './tools/brush-engine';
export * from './tools/abr';
export * from './color/cmyk';
export * from './render/gpu-display';
