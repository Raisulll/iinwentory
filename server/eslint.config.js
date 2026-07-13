import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

// Pragmatic config for an existing large codebase: catch real bugs (unreachable
// code, promise/await mistakes, accidental globals) while keeping legacy-style
// rules as warnings so the lint gate is usable rather than a wall of errors.
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'prisma/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // Allow `declare global { namespace Express { ... } }` module augmentation.
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
      'no-console': 'off',
      'prefer-const': 'warn',
      'no-var': 'error',
      'eqeqeq': ['warn', 'smart'],
    },
  },
);
