export default {
	$schema: 'https://json.schemastore.org/prettierrc',
	useTabs: true,
	tabWidth: 2,
	semi: false,
	arrowParens: 'avoid',
	singleQuote: true,
	trailingComma: 'none',
	printWidth: 100,
	plugins: ['prettier-plugin-svelte'],
	overrides: [
		{
			files: '*.svelte',
			options: { parser: 'svelte' }
		}
	]
}
