module.exports = {
  root: true,
  env: { es2021: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react-native/all',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: { jsx: true },
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: null
  },
  plugins: ['react', 'react-native', '@typescript-eslint'],
  settings: { react: { version: 'detect' } },
  ignorePatterns: ['node_modules/', 'functions/**', 'android/', 'ios/'],
  rules: {
    'react/prop-types': 'off'
  }
};
