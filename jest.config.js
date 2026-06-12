module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testEnvironment: "node",
  modulePathIgnorePatterns: ["<rootDir>/services/frontend/.next"],
  testMatch: ["<rootDir>/src/**/*.spec.ts"],
  transform: {
    "^.+\.ts$": "ts-jest",
  },
};
