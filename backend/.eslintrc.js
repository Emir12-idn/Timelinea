// §13 data design — minimal ESLint baseline, pass 5 item 5. Matches what
// `@nestjs/schematics` (already a devDependency, version pinned in
// package.json) itself scaffolds for a new NestJS project via `nest new`
// (see node_modules/@nestjs/schematics/dist/lib/application/files/ts/.eslintrc.js) —
// this is NestJS's own default, not an invented rule set.
//
// Deliberately DOES NOT include the scaffold's `plugin:prettier/recommended`
// (and its `.prettierrc`, which defaults to `singleQuote: true`). This
// codebase already consistently uses double-quoted strings across 46 commits
// — turning on the prettier plugin and running `--fix` would rewrite every
// string's quote style repo-wide, which is exactly the sweeping stylistic
// rewrite this pass was told not to do. The typescript-eslint layer (real
// code-quality checks: unused vars, etc.) is kept; formatting enforcement is
// left out of scope for this baseline.
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: ['plugin:@typescript-eslint/recommended'],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist', 'node_modules'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    // Standard escape hatch for an intentionally-unused parameter (e.g. kept
    // for call-site symmetry with sibling services) — prefix with `_`.
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
