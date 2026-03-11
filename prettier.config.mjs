export default {
	$schema: 'https://json.schemastore.org/prettierrc',
	useTabs: true,
	singleQuote: true,
	trailingComma: 'none',
	printWidth: 100,
	tabWidth: 2,
	semi: false,
	arrowParens: 'avoid',

	plugins: ['prettier-plugin-svelte', 'prettier-plugin-sql', 'prettier-plugin-tailwindcss'],
	overrides: [
		{
			files: '*.svelte',
			options: { parser: 'svelte' }
		},
		{
			files: '*.sql',
			options: {
				parser: 'sql',
				language: 'postgresql'
			}
		}
	],
	tailwindStylesheet: './src/routes/layout.css'
}
