import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '**/*.min.js']),
  {
    files: ['**/*.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      prettierConfig // must be last in extends
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        project: ['./tsconfig.dev.json']
      }
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      curly: ['error', 'all'],
      'no-var': 'error',
      'prefer-const': 'error'
    }
  }
])
