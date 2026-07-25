/**
 * Phase 2–4 roadmap registry — surfaces Adobe-parity features in UI.
 */
export type RoadmapItem = {
	id: string;
	label: string;
	phase: 2 | 3 | 4;
	category: string;
	status: 'stub' | 'partial' | 'done';
};

export const ROADMAP: RoadmapItem[] = [
	// Phase 2
	{ id: 'layer-styles', label: 'Layer Styles (Drop Shadow, Stroke, …)', phase: 2, category: 'Layers', status: 'done' },
	{ id: 'smart-objects', label: 'Smart Objects', phase: 2, category: 'Layers', status: 'stub' },
	{ id: 'pen-tool', label: 'Pen / Paths', phase: 2, category: 'Vectors', status: 'done' },
	{ id: 'text-layers', label: 'Editable Text', phase: 2, category: 'Type', status: 'partial' },
	{ id: 'shape-layers', label: 'Shape Layers', phase: 2, category: 'Vectors', status: 'done' },
	{ id: 'channels', label: 'Channels Panel', phase: 2, category: 'Select', status: 'done' },
	{ id: 'select-and-mask', label: 'Select and Mask (feather/expand)', phase: 2, category: 'Select', status: 'partial' },
	{ id: 'filter-gallery', label: 'Filter Gallery', phase: 2, category: 'Filter', status: 'done' },
	{ id: 'color-management', label: 'ICC / Soft Proof / 16-bit', phase: 2, category: 'Color', status: 'partial' },
	{ id: 'actions', label: 'Actions Panel', phase: 2, category: 'Automate', status: 'partial' },
	{ id: 'psd-import', label: 'PSD Import', phase: 2, category: 'IO', status: 'done' },
	{ id: 'fill-layers', label: 'Fill Layers', phase: 2, category: 'Layers', status: 'done' },
	{ id: 'gradient-tool', label: 'Gradient Tool', phase: 2, category: 'Paint', status: 'done' },
	// Phase 3
	{ id: 'select-subject', label: 'Select Subject (heuristic)', phase: 3, category: 'Intelligence', status: 'done' },
	{ id: 'content-aware', label: 'Content-Aware Fill', phase: 3, category: 'Intelligence', status: 'done' },
	{ id: 'sky-replace', label: 'Sky Replacement', phase: 3, category: 'Intelligence', status: 'done' },
	{ id: 'raw-develop', label: 'Camera Raw / DNG', phase: 3, category: 'Raw', status: 'stub' },
	{ id: 'neural-filters', label: 'Neural Filters Pack', phase: 3, category: 'Intelligence', status: 'stub' },
	// Phase 4
	{ id: 'mixer-brush', label: 'Mixer Brush', phase: 4, category: 'Paint', status: 'done' },
	{ id: 'abr-brushes', label: 'ABR Brush Import', phase: 4, category: 'Paint', status: 'partial' },
	{ id: 'artboards', label: 'Artboards', phase: 4, category: 'Design', status: 'done' },
	{ id: 'cmyk', label: 'CMYK + Print', phase: 4, category: 'Print', status: 'partial' },
	{ id: 'brush-dynamics', label: 'Full Brush Dynamics', phase: 4, category: 'Paint', status: 'done' },
	{ id: 'pattern-stamp', label: 'Pattern Stamp', phase: 4, category: 'Paint', status: 'done' },
	{ id: 'history-brush', label: 'History Brush', phase: 4, category: 'Paint', status: 'done' },
	{ id: 'rotate-view', label: 'Rotate View', phase: 4, category: 'View', status: 'done' },
	{ id: 'ruler-count', label: 'Ruler / Count', phase: 4, category: 'Measure', status: 'done' }
];
