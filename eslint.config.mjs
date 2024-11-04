 //@ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import eslintConfigPrettier from 'eslint-config-prettier';
import parserVue from 'vue-eslint-parser';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  // @ts-expect-error - Missing types
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['*.vue', '**/*.vue'],
    languageOptions: {
      parser: parserVue,
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    name: 'vue',
    plugins: {
      vue: pluginVue,
    },
  },
  {
    rules: {
      rules: {
        "@typescript-eslint/no-explicit-any": null
      }
    }
  }
);
