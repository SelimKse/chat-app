export default [
  {
    ignores: ["node_modules/**", "uploads/**", "coverage/**"],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      // Şimdilik yalnızca sözdizimi/temel kalite kontrolü; kural seti kademeli sıkılaştırılabilir.
    },
  },
];
