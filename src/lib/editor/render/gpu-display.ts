/**
 * WebGL2 display for the image editor — uploads ImageData to a GPU texture
 * and blits with optional dirty-region updates to avoid full CPU putImageData.
 */

const VS = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  v_uv.y = 1.0 - v_uv.y;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
in vec2 v_uv;
out vec4 outColor;
void main() {
  outColor = texture(u_tex, v_uv);
}`;

export class GpuDisplay {
	private gl: WebGL2RenderingContext | null = null;
	private prog: WebGLProgram | null = null;
	private tex: WebGLTexture | null = null;
	private vao: WebGLVertexArrayObject | null = null;
	private texW = 0;
	private texH = 0;
	private canvas: HTMLCanvasElement;
	ok = false;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		const gl = canvas.getContext('webgl2', {
			alpha: true,
			premultipliedAlpha: false,
			antialias: false,
			preserveDrawingBuffer: false,
			powerPreference: 'high-performance'
		});
		if (!gl) return;
		this.gl = gl;
		const vs = compile(gl, gl.VERTEX_SHADER, VS);
		const fs = compile(gl, gl.FRAGMENT_SHADER, FS);
		if (!vs || !fs) return;
		const prog = gl.createProgram();
		if (!prog) return;
		gl.attachShader(prog, vs);
		gl.attachShader(prog, fs);
		gl.linkProgram(prog);
		if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
		this.prog = prog;

		const buf = gl.createBuffer();
		const vao = gl.createVertexArray();
		if (!buf || !vao) return;
		gl.bindVertexArray(vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
		const loc = gl.getAttribLocation(prog, 'a_pos');
		gl.enableVertexAttribArray(loc);
		gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
		this.vao = vao;

		const tex = gl.createTexture();
		if (!tex) return;
		this.tex = tex;
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
		gl.disable(gl.DEPTH_TEST);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		this.ok = true;
	}

	ensureSize(w: number, h: number) {
		if (!this.gl || !this.tex) return;
		if (this.canvas.width !== w || this.canvas.height !== h) {
			this.canvas.width = w;
			this.canvas.height = h;
		}
		if (this.texW === w && this.texH === h) return;
		const gl = this.gl;
		gl.bindTexture(gl.TEXTURE_2D, this.tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		this.texW = w;
		this.texH = h;
	}

	uploadFull(img: ImageData) {
		if (!this.gl || !this.tex || !this.ok) return false;
		this.ensureSize(img.width, img.height);
		const gl = this.gl;
		gl.bindTexture(gl.TEXTURE_2D, this.tex);
		gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, img.width, img.height, gl.RGBA, gl.UNSIGNED_BYTE, img.data);
		return true;
	}

	/** Upload a rectangular dirty region (clamped). */
	uploadRegion(img: ImageData, x: number, y: number, w: number, h: number) {
		if (!this.gl || !this.tex || !this.ok) return false;
		this.ensureSize(img.width, img.height);
		const x0 = Math.max(0, Math.floor(x));
		const y0 = Math.max(0, Math.floor(y));
		const x1 = Math.min(img.width, Math.ceil(x + w));
		const y1 = Math.min(img.height, Math.ceil(y + h));
		const rw = x1 - x0;
		const rh = y1 - y0;
		if (rw <= 0 || rh <= 0) return true;

		const row = new Uint8ClampedArray(rw * rh * 4);
		const src = img.data;
		const iw = img.width;
		for (let rowY = 0; rowY < rh; rowY++) {
			const si = ((y0 + rowY) * iw + x0) * 4;
			row.set(src.subarray(si, si + rw * 4), rowY * rw * 4);
		}
		const gl = this.gl;
		gl.bindTexture(gl.TEXTURE_2D, this.tex);
		gl.texSubImage2D(gl.TEXTURE_2D, 0, x0, y0, rw, rh, gl.RGBA, gl.UNSIGNED_BYTE, row);
		return true;
	}

	draw() {
		if (!this.gl || !this.prog || !this.vao || !this.tex || !this.ok) return;
		const gl = this.gl;
		gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.useProgram(this.prog);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.tex);
		gl.uniform1i(gl.getUniformLocation(this.prog, 'u_tex'), 0);
		gl.bindVertexArray(this.vao);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

	destroy() {
		const gl = this.gl;
		if (!gl) return;
		if (this.tex) gl.deleteTexture(this.tex);
		if (this.prog) gl.deleteProgram(this.prog);
		if (this.vao) gl.deleteVertexArray(this.vao);
		this.gl = null;
		this.ok = false;
	}
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
	const s = gl.createShader(type);
	if (!s) return null;
	gl.shaderSource(s, src);
	gl.compileShader(s);
	if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
		gl.deleteShader(s);
		return null;
	}
	return s;
}
