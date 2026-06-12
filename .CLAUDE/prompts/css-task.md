Read AGENTS.md first.
Read C:\Users\porat\.claude\rules\css-rules.md.
Read the css-conventions and design-system rules if available.

Before editing, state:
1. CSS change scope
2. target stylesheet
3. nearby CSS pattern you found
4. verification command

Rules:
- Use only design tokens: `var(--token)`.
- Do not hardcode colors, spacing, shadows, radii, or typography.
- Prefer existing global patterns over new component-specific classes.
- Use CSS nesting under the component root when practical.
- Do not add inline styles.
- Keep CSS under budget.

Verify:
- Run `npx ng build` for Angular CSS changes.
- Check for CSS budget warnings.
- Visually inspect if the change affects layout or interaction.