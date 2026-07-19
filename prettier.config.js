/** @type {import("prettier").Config} */
const config = {
	// Global
	printWidth: 70,
	tabWidth: 2,
	useTabs: true,
	endOfLine: 'lf',
	embeddedLanguageFormatting: 'auto',

	// Common
	singleQuote: true,
	bracketSpacing: true,
	bracketSameLine: false,
	objectWrap: 'preserve',
	singleAttributePerLine: false,
	proseWrap: 'preserve',

	// JS/TS
	semi: true,
	jsxSingleQuote: false,
	quoteProps: 'as-needed',
	trailingComma: 'all',
	arrowParens: 'always',
	experimentalTernaries: false,
	experimentalOperatorPosition: 'end',

	// HTML
	htmlWhitespaceSensitivity: 'css',
	vueIndentScriptAndStyle: false,

	// Special
	requirePragma: false,
	insertPragma: false,
	checkIgnorePragma: false,

	// Plugins
	plugins: ['prettier-plugin-svelte', 'prettier-plugin-tailwindcss'],

	// Svelte
	svelteSortOrder: 'options-scripts-markup-styles',
	svelteAllowShorthand: true,
	svelteIndentScriptAndStyle: true,

	// Tailwind
	tailwindStylesheet: './src/routes/layout.css',
	tailwindAttributes: [],
	tailwindFunctions: ['clsx', 'cn'],
	tailwindPreserveWhitespace: false,
	tailwindPreserveDuplicates: false,

	overrides: [
		{ files: '*.svelte', options: { parser: 'svelte' } },
		{ files: '*.md', options: { proseWrap: 'always' } },
	],
};

export default config;
