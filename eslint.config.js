const rubensworks = require('@rubensworks/eslint-config');

module.exports = rubensworks([
  {
    files: [ '**/*.ts' ],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: [ './tsconfig.eslint.json' ],
      },
    },
    rules: {
      'ts/prefer-nullish-coalescing': 'off',
      'import/extensions': 'off',
    },
  },
  {
    files: [ 'bin/**/*.ts' ],
    rules: {
      'no-console': 'off',
      'import/no-nodejs-modules': 'off',
      'unicorn/filename-case': 'off',
    },
  },
  {
    files: [ 'lib/**/*.ts' ],
    rules: {
      'import/no-nodejs-modules': 'off',
    },
  },
  {
    ignores: [ 'eslint-errors.json', 'eslint-errors-readable.txt', 'eslint-errors-full.txt' ],
  },
]);
