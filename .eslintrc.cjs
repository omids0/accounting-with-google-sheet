module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import', 'react', 'react-hooks', 'jsx-a11y'],
  extends: [
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    require.resolve('./tools/eslint/a11y.cjs'),
    require.resolve('./tools/eslint/lighthouse.cjs'),
    'prettier'
  ],
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx']
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: ['./tsconfig.json', './tsconfig.node.json']
      }
    },
    react: {
      version: 'detect'
    }
  },
  rules: {
    'no-console': 'error',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }
    ],
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports'
      }
    ],
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'no-undefined': 'off',
    'prefer-const': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    'import/default': 'off',
    'import/no-unresolved': [
      'error',
      {
        ignore: ['^virtual:']
      }
    ],
    'import/order': [
      'warn',
      {
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true
        },
        groups: [['builtin', 'external'], ['internal', 'parent', 'sibling', 'index']]
      }
    ]
  },
  overrides: [
    {
      files: [
        '**/theme.ts',
        '**/theme/**/*.ts',
        '**/useChartTheme.ts',
        '**/pdf.ts',
        'tools/vite/**'
      ],
      rules: {
        'no-restricted-syntax': 'off'
      }
    },
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', 'e2e/**/*'],
      rules: {
        'jsx-a11y/no-autofocus': 'off',
        'no-console': 'off'
      }
    }
  ]
}
