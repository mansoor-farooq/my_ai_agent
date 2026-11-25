# UI quality gate

## Verdict

Return **PASS**, **PASS WITH CHANGES**, or **FAIL**.

## Review checklist

1. **Product specificity:** Does the UI clearly belong to this product and audience?
2. **Hierarchy:** Is the next action obvious without competing emphasis?
3. **Typography:** Is the scale deliberate and is dense data readable?
4. **Color:** Are contrast and semantic meanings correct?
5. **Layout:** Are alignment, rhythm, density, and responsive behavior coherent?
6. **Components:** Are equivalent controls consistent across screens?
7. **States:** Are loading, empty, error, focus, selected, disabled, and long-content states covered?
8. **Tables/forms:** Are scanning, filtering, validation, overflow, and data entry efficient?
9. **Motion:** Does motion explain change and respect reduced-motion preferences?
10. **Implementation:** Were behavior, accessibility, performance, and framework constraints preserved?

## Finding format

For every issue provide:

- Page/component
- Evidence
- Severity: blocker, major, or minor
- Exact design or code-level fix
- Verification method

Do not write “make it modern,” “add polish,” or “improve spacing” without measurable guidance.

## Completion evidence

An implementation is complete only when the relevant build passes and the rendered result is inspected at intended breakpoints. If browser access is unavailable, state that limitation and report only the checks actually performed.
