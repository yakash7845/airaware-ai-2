# Contributing to AirAware AI 2.0

## Engineering Standards

1. **TypeScript Strict Mode:** Maintain `strict: true`, `noUncheckedIndexedAccess: true`, `noUnusedLocals: true`, and zero `any` types (`@typescript-eslint/no-explicit-any: error`).
2. **Zero Business Logic in UI Components:** Place all calculations, thresholds, and transformations inside `src/domain/`.
3. **Boundary Validation:** Every external HTTP response and incoming API request must pass a Zod schema before processing.
4. **Scientific Honesty:** Never fabricate missing pollutant readings, label CAMS model outputs as street-level observations, or claim indoor measurements without hardware.
5. **Accessibility & Localization:** Every user-facing feature must support keyboard navigation, WCAG 2.2 AA contrast, tabular chart alternatives, and `en`, `ta`, and `hi` localization keys.

## Local Verification Commands

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test:coverage
npm run build
npm run test:e2e
```
