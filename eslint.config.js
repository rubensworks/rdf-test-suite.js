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
      // Requires strictNullChecks which is disabled in this project
      'ts/prefer-nullish-coalescing': 'off',
      // JSON imports don't need explicit extension
      'import/extensions': 'off',
      // Disabled until test suite is migrated to async/await
      'jest/no-test-return-statement': 'off',
      'jest/no-done-callback': 'off',
      // Disabled - requires larger TypeScript type annotation refactoring
      'ts/no-unsafe-argument': 'off',
      'ts/no-unsafe-assignment': 'off',
      'ts/no-unsafe-return': 'off',
      'ts/restrict-template-expressions': 'off',
      'ts/no-floating-promises': 'off',
      'ts/explicit-member-accessibility': 'off',
      'ts/explicit-function-return-type': 'off',
      'ts/consistent-type-assertions': 'off',
      'ts/no-base-to-string': 'off',
      // Method signature style - property arrow function syntax breaks TypeScript variance in this codebase
      'ts/method-signature-style': 'off',
      // Line length - many long lines in test data
      'max-len': 'off',
      // Inline comments are used throughout the codebase
      'line-comment-position': 'off',
      // Test-style assertions
      'jest/no-conditional-expect': 'off',
      'jest/prefer-each': 'off',
      'jest/require-to-throw-message': 'off',
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
    files: [ 'lib/**/*.ts', 'test/**/*.ts' ],
    rules: {
      'import/no-nodejs-modules': 'off',
    },
  },
  {
    files: [ 'test/**/*.ts' ],
    rules: {
      'no-console': 'off',
    },
  },
]);
