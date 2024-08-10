/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  transformIgnorePatterns: ["node_modules/mdast-util-from-markdown"],
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  },
};