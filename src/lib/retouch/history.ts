import { cloneImage, type RetouchImage } from './types';

const MAX_STACK = 20;

export class RetouchHistory {
	private undoStack: RetouchImage[] = [];
	private redoStack: RetouchImage[] = [];

	get canUndo() {
		return this.undoStack.length > 0;
	}

	get canRedo() {
		return this.redoStack.length > 0;
	}

	clear() {
		this.undoStack = [];
		this.redoStack = [];
	}

	/** Push current image before applying a new op. */
	push(current: RetouchImage) {
		this.undoStack.push(cloneImage(current));
		if (this.undoStack.length > MAX_STACK) this.undoStack.shift();
		this.redoStack = [];
	}

	undo(current: RetouchImage): RetouchImage | null {
		const prev = this.undoStack.pop();
		if (!prev) return null;
		this.redoStack.push(cloneImage(current));
		return prev;
	}

	redo(current: RetouchImage): RetouchImage | null {
		const next = this.redoStack.pop();
		if (!next) return null;
		this.undoStack.push(cloneImage(current));
		return next;
	}
}
