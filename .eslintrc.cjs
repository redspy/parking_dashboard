module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "import/order": [
      "warn",
      {
        groups: ["builtin", "external", "internal", "parent", "sibling"],
        "newlines-between": "always",
      },
    ],
  },
  env: {
    node: true,
    es2022: true,
  },
};
