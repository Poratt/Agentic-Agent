export const GENUI_HTML = (hint: string) => {
    return `After getting data, return ONLY a raw HTML block in this exact format:
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
- ICONS: Use Phosphor Icons with this syntax: <span class="ph ph-ICON_NAME"></span>
  Common icons: ph-user, ph-users, ph-shield, ph-trash, ph-pencil-simple, 
  ph-cloud-sun, ph-thermometer, ph-drop, ph-wind, ph-gauge, 
  ph-check-circle, ph-warning-circle, ph-info, ph-gear,
  ph-calendar, ph-clock, ph-envelope, ph-lock, ph-key
  Use icons next to labels and titles for visual clarity.

HOVER: Add hover effects using inline onmouseover/onmouseout handlers.
CRITICAL: Always add transition to the element's style: "transition: all 0.2s ease"
- Cards: onmouseover="this.style.boxShadow='0 8px 24px rgba(0,0,0,0.3)';this.style.borderColor='var(--color-primary)'"
- Cards Out: onmouseout="this.style.boxShadow='var(--shadow-soft)';this.style.borderColor='var(--color-border)'"
- Buttons: onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'"
- Table rows: onmouseover="this.style.background='var(--color-surface-hover)'" onmouseout="this.style.background=''"


ANIMATIONS:
CRITICAL: Always place the <style> tag BEFORE the root <div>, never inside it.
CRITICAL: Never apply fadeInUp animation directly on cards that have hover transform effects.
Instead apply animations only on child elements inside the card.

Add CSS keyframe animations using a <style> tag before the HTML block:
- Fade + slide up on entry: opacity 0->1, translateY 12px->0, duration 400ms ease-out
- Stagger each child element with animation-delay (0ms, 80ms, 160ms, 240ms...)
- Numbers/temperatures: count-up effect using CSS or just animate scale 0.8->1

No explanations. No plain text.`;
};

export const ANALYTICS_CHART_AGENT_INSTRUCTION = GENUI_HTML(
    `Render an analytics chart from the tool response.
Rules:
1. Use only result.series values returned by the tool. Never invent values.
2. Use result.chartType to choose the chart: 1=bar, 2=line, 3=pie.
3. Render inline SVG only. Do not use external chart libraries.
4. Use a fixed SVG viewBox such as "0 0 500 260" and normalize numeric values against maxValue.
5. If result.series is empty or all values are 0, render a stable empty state that says "No data available for the selected range".
6. Include a title, summary, and accessible aria-label.
7. Use known CSS variables from the design system only: var(--color-surface), var(--color-text-primary), var(--color-text-secondary), var(--color-border), var(--color-primary), var(--radius-md), var(--font-main), var(--space-6), var(--shadow-soft).
CHARTS: For pie/donut charts, avoid SVG arcs. 
Use CSS conic-gradient instead:
<div style="width:160px;height:160px;border-radius:50%;
background:conic-gradient(var(--color-primary) 0% 67%, var(--color-secondary) 67% 100%)">
</div>`,
);

export const CURRENCY_AGENT_INSTRUCTION = GENUI_HTML(
    `Render a currency exchange component from the tool response.
Rules:
1. Use only values returned by the tool. Never invent rates, timestamps, currencies, or converted amounts.
2. Flag safety is strict: never draw country flags with custom SVG paths, polygons, circles, coordinates, or hand-built geometry.
3. Preferred flag rendering: use native Unicode flag emojis or FlagCDN image tags.
4. If using FlagCDN, map common currencies to these two-letter codes:
   - USD -> us, ILS -> il, EUR -> eu, GBP -> gb, JPY -> jp, CAD -> ca, AUD -> au, CHF -> ch
   - Image URL pattern: https://flagcdn.com/w40/{countryCode}.png
5. For conversion results, render:
   - Header with source and target currency codes side-by-side.
   - Main converted result in large bold text.
   - Original amount, exchange rate, and last updated date in muted footer text.
   - Staggered scale/fade-in animation.
6. For rate results, render a compact rates table or grid using only the returned rates map.
7. Use clean hover effects for rows/cards with inline onmouseover/onmouseout handlers.
8. Use known CSS variables only: var(--color-surface), var(--color-text-primary), var(--color-text-secondary), var(--color-border), var(--color-primary), var(--radius-md), var(--font-main), var(--space-6), var(--shadow-soft).
9. If result is null or success is false, render a stable error/empty state using the response message.`,
);
