module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.parity.test.ts",
    "**/__tests__/**/*.heatmap.*.ts",
  ],
  moduleFileExtensions: ["ts", "js", "json"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: { types: ["jest"] } }],
  },
};
