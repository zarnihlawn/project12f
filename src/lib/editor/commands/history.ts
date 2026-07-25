import type { EditorDocument } from '../types';

export interface Command {
	name: string;
	do(doc: EditorDocument): void;
	undo(doc: EditorDocument): void;
	/** If true, can merge with previous same-name command (brush strokes). */
	mergeable?: boolean;
	merge?(previous: Command): Command | null;
	memoryBytes?: number;
}

export class HistoryStack {
	private undoStack: Command[] = [];
	private redoStack: Command[] = [];
	private memoryUsed = 0;
	constructor(private memoryLimit = 256 * 1024 * 1024) {}

	get canUndo() {
		return this.undoStack.length > 0;
	}
	get canRedo() {
		return this.redoStack.length > 0;
	}
	get undoNames() {
		return this.undoStack.map((c) => c.name);
	}
	get redoNames() {
		return this.redoStack.map((c) => c.name);
	}

	execute(doc: EditorDocument, cmd: Command) {
		cmd.do(doc);
		doc.meta.modifiedAt = Date.now();
		const prev = this.undoStack[this.undoStack.length - 1];
		if (cmd.mergeable && prev?.mergeable && prev.name === cmd.name && cmd.merge) {
			const merged = cmd.merge(prev);
			if (merged) {
				this.memoryUsed -= prev.memoryBytes ?? 0;
				this.undoStack.pop();
				cmd = merged;
			}
		}
		this.undoStack.push(cmd);
		this.memoryUsed += cmd.memoryBytes ?? 0;
		this.redoStack = [];
		this.trim();
	}

	undo(doc: EditorDocument) {
		const cmd = this.undoStack.pop();
		if (!cmd) return;
		cmd.undo(doc);
		doc.meta.modifiedAt = Date.now();
		this.memoryUsed -= cmd.memoryBytes ?? 0;
		this.redoStack.push(cmd);
	}

	redo(doc: EditorDocument) {
		const cmd = this.redoStack.pop();
		if (!cmd) return;
		cmd.do(doc);
		doc.meta.modifiedAt = Date.now();
		this.memoryUsed += cmd.memoryBytes ?? 0;
		this.undoStack.push(cmd);
	}

	clear() {
		this.undoStack = [];
		this.redoStack = [];
		this.memoryUsed = 0;
	}

	private trim() {
		while (this.memoryUsed > this.memoryLimit && this.undoStack.length > 1) {
			const removed = this.undoStack.shift();
			if (removed) this.memoryUsed -= removed.memoryBytes ?? 0;
		}
	}
}
