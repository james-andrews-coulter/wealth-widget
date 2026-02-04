export default {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.js", "**/__tests__/**/*.spec.js", "**/*.test.js", "**/*.spec.js"],
  moduleFileExtensions: ["js"],
  collectCoverageFrom: ["src/lib/**/*.js"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  transform: {},
};
