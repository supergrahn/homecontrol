module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|@expo|expo(nent)?|expo-.*|@expo(nent)?/.*|unimodules|@unimodules/.*|sentry-expo|native-base|react-native-svg)/)'
  ],
  testPathIgnorePatterns: ['<rootDir>/functions/'],
};
