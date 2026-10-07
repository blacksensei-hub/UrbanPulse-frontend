// ESLint's recommended rules for the browser, plus React's rules of hooks.
// jsx-uses-vars makes a component used only in JSX count as used, and
// jsx-no-undef catches JSX naming one that isn't imported. Names
// starting with _ may go unused, and so may the siblings of a ...rest that
// exists to drop them.
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist/**', 'dev-dist/**', 'public/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      'react/jsx-uses-vars': 'error',
      'react/jsx-no-undef': 'error',
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true,
      }],
      // An empty catch is how this codebase says "storage may be blocked; carry on".
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['scripts/**', '*.config.js'],
    languageOptions: { globals: globals.node },
  },
];
