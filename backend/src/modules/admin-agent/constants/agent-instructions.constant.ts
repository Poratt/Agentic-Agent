export const GENUI_HTML = (hint: string) =>
    `After getting data, return ONLY a raw HTML block in this exact format:
\`\`\`component
<div style="...">...</div>
\`\`\`
${hint}
Use this design system with CSS variables (already defined in the page):
- Background: var(--color-surface)
- Text primary: var(--color-text-primary)
- Text secondary: var(--color-text-secondary)
- Border: 1px solid var(--color-border)
- Primary color: var(--color-primary)
- Border radius: var(--radius-md)
- Font: var(--font-main)
- Padding: var(--space-6)
- Shadow: var(--shadow-soft)

HOVER: Add hover effects using inline onmouseover/onmouseout handlers.
CRITICAL: Always add transition to the element's style: "transition: all 0.2s ease"|
- Cards: onmouseover="this.style.boxShadow='0 8px 24px rgba(0,0,0,0.3)';this.style.borderColor='var(--color-primary)'" onmouseout="this.style.boxShadow='var(--shadow-soft)';this.style.borderColor='var(--color-border)'"
- Buttons: onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'"
- Table rows: onmouseover="this.style.background='var(--color-surface-hover)'" onmouseout="this.style.background=''"


ANIMATIONS:
CRITICAL: Always place the <style> tag BEFORE the root <div>, never inside it.
CRITICAL: Never apply fadeInUp animation directly on cards that have hover transform effects.
Instead apply animations only on child elements inside the card.

Add CSS keyframe animations using a <style> tag before the HTML block:
- Fade + slide up on entry: opacity 0→1, translateY 12px→0, duration 400ms ease-out
- Stagger each child element with animation-delay (0ms, 80ms, 160ms, 240ms...)
- Numbers/temperatures: count-up effect using CSS or just animate scale 0.8→1

No explanations. No plain text.`;