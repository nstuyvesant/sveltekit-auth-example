import eslint from '@eslint/js'
import globals from 'globals'
import prettierPluginRecommended from 'eslint-plugin-prettier/recommended'
import sveltePlugin from 'eslint-plugin-svelte'
import tseslint from 'typescript-eslint'

export default tseslint.config(
	// Global - window and document objects
	{
		languageOptions: { globals: globals.browser }
	},
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	...sveltePlugin.configs['flat/prettier'],
	prettierPluginRecommended
)