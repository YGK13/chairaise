// ESLint flat config. Next 16 removed `next lint`, so `npm run lint` runs
// eslint directly with the Next.js core-web-vitals rule set.
//
// The authenticated CRM (components/CRMApp.js and friends) predates the React
// Compiler lint rules that eslint-config-next 16 turns on. Those rules flag
// patterns that work correctly today but would need a refactor of app
// internals to satisfy; they are kept visible as warnings rather than errors
// so the public surface stays gated at zero errors. Quote/apostrophe escaping
// in JSX text is purely stylistic and is switched off.
import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    ignores: [".next/**", "node_modules/**", "out/**", "coverage/**", "next-env.d.ts"],
  },
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
    },
  },
];

export default config;
