import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = defineConfig([
    ...nextVitals,
    // Build output and generated files - not our code.
    globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
    // Playwright's fixture `use()` is not a React hook.
    { files: ['e2e/**'], rules: { 'react-hooks/rules-of-hooks': 'off' } },
]);

export default eslintConfig;
