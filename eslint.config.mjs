


// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config({
  ...eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintConfigPrettier,
  ...pluginVue.configs['flat/essential']
});