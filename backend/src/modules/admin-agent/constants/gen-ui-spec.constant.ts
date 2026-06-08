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
CRITICAL: Never apply fadeInUp animation directly on cards that have hover transform effects, Instead apply animations only on child elements inside the card.
- Duration: 150-300ms for micro, max 400ms for complex
- Use transform/opacity only — never animate width/height/top/left  
- Easing: ease-out for enter, ease-in for exit
- Stagger list items: 30-50ms per item (not 80-160ms like now)
- Exit animations: 60-70% of enter duration
- Scale feedback on buttons: 0.95 on press, restore on release
- Never block user input during animation

Add CSS keyframe animations using a <style> tag before the HTML block:
- Fade + slide up on entry: opacity 0→1, translateY 12px→0, duration 300ms ease-out
- Stagger each child element: 40ms per item (0ms, 40ms, 80ms, 120ms...)
- Numbers/temperatures: animate scale 0.8→1, duration 200ms ease-out

No explanations. No plain text.`;
};


export const GenUiSpec = {
    // Auth 
    REGISTER_FORM: GENUI_HTML(
        `Render a registration form with fields: fullName, email, password.
        Submit button: onclick="window.agentPrompt('רשום משתמש חדש: שם=' + document.getElementById('reg-name').value + ' אימייל=' + document.getElementById('reg-email').value + ' סיסמה=' + document.getElementById('reg-pass').value)"
        - Add input styling with var(--color-input-bg), var(--color-border), var(--radius-sm)
        - Password field type="password"
        - Validate fields are not empty before submitting`
    ),

    // Users
    USER_PROFILE: GENUI_HTML(
        'Render a compact authenticated-user card from the JWT payload. Show sub, email, role, issued-at, and expiration. Make clear this is token payload data, not a full database profile.',
    ),

    USERS_TABLE: GENUI_HTML(
        `Render a styled users table with columns: ID, Full Name, Email, Role badge, Created At.
        Add action buttons (including icon and label) per row:
        - "פרטים" button: onclick="window.agentPrompt('תראה לי את פרטי המשתמש עם מזהה ' + id)"
        - "מחק" button (red, only for non-admin): onclick="window.agentPrompt('מחק את המשתמש עם מזהה ' + id)"
        - "שנה תפקיד" button: onclick="window.agentPrompt('שנה את תפקיד המשתמש עם מזהה ' + id)"
        Replace 'id' with the actual user id from the data.`
    ),

    USER_UPDATE_CONFIRMATION: GENUI_HTML(
        'Render an updated user profile card. Highlight the user id, full name, email, numeric role label, and updatedAt timestamp. Make it clear the profile fields were updated successfully.',
    ),

    USER_ROLE_CHANGE_CONFIRMATION: GENUI_HTML(
        'Render a role-change confirmation card. Show the user id, email, full name, and new role. Translate numeric roles as 1 = Admin and 2 = User, while preserving the numeric value.',
    ),

    // Chat
    CHAT_SESSIONS_LIST: GENUI_HTML(
        'Render a compact chat sessions list. Show each session title, id, createdAt, and updatedAt. Sort visually by updatedAt when possible and make the session id easy to copy or reference.',
    ),

    CHAT_TRANSCRIPT_TIMELINE: GENUI_HTML(
        'Render a chat transcript timeline. Group messages by role, show user prompts and assistant replies clearly, include createdAt timestamps, and keep long message content readable with wrapping.',
    ),

    CHAT_SESSION_CREATED: GENUI_HTML(
        'Render a small new-session confirmation card. Show the new session id, title, createdAt, and updatedAt. Keep the output concise.',
    ),

    // Analytics
    ANALYTICS_CHART: GENUI_HTML(
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
        </div>`
    ),

    // Currency
    CURRENCY: GENUI_HTML(
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
        - For arrows use HTML entity: &rarr; or Unicode: → — never LaTeX syntax
        6. For rate results, render a compact rates table or grid using only the returned rates map.
        7. Use clean hover effects for rows/cards with inline onmouseover/onmouseout handlers.
        8. Use known CSS variables only: var(--color-surface), var(--color-text-primary), var(--color-text-secondary), var(--color-border), var(--color-primary), var(--radius-md), var(--font-main), var(--space-6), var(--shadow-soft).
        9. If result is null or success is false, render a stable error/empty state using the response message.`
    ),

    // Weather
    WEATHER_CURRENT: GENUI_HTML(
        `Render a premium animated current-weather card from the tool response.
        CRITICAL: Use current time: new Date().toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit'})
        Rules:
        1. Use only values returned in result. Never invent weather values, location, timestamps, icons, or measurements.
        2. Build a single polished weather card with an animated hero area, not a table.
        3. Header: show the weather description, observationTime when available, and a large condition emoji derived from description/weatherCode only when the condition is clear from the data.
        4. Main metric: show tempC as the dominant animated number, with feelsLikeC and optional tempF/feelsLikeF as secondary text.
        5. Detail grid: show humidity, windSpeedKmph + windDirection, uvIndex, cloudCover, precipitationMm, pressure, and visibility. Hide any row whose value is missing or empty.
        6. Create an exciting but professional animation:
           - Root card enters with fade + lift.
           - Temperature scales in once.
           - Detail chips stagger in.
           - Weather emoji gently floats.
           - Add a subtle animated weather scene using inline HTML/CSS only: sun rays for sunny, drifting cloud for cloudy, diagonal rain lines for rainy, or moving wind streaks when wind is prominent.
        7. Use only CSS keyframes in the required <style> tag before the root <div>. Animate transform and opacity only. Do not animate width, height, top, left, or layout.
        8. Add severity cues without inventing labels:
           - uvIndex >= 6: make the UV chip visually warning-like.
           - precipitationMm > 0: make precipitation visually active.
           - windSpeedKmph >= 30: make wind visually active.
        9. Keep animations smooth and non-blocking: 150-400ms for entrance, 2-6s for ambient loops, no flashing, no infinite aggressive pulsing.
        10. Use known CSS variables only and inline SVG/HTML only. No external images, no canvas, no chart libraries, no plain text response.`
    ),

    WEATHER_FORECAST: GENUI_HTML(
        `Render a gorgeous 5-day forecast container.
        - Header with city name + calendar icon
        - 5 cards horizontally (flexbox), each with: day name, emoji, max/min temp, humidity
        - Hover: border color change`
    ),


    // System
    SYSTEM_STATUS: GENUI_HTML(
        `Render a system status dashboard with:
        1. Metric cards row: total users, active sessions, Swagger status (success=green, warning=orange).
        2. Below the cards, render an SVG bar chart (width:100%, height:120px) showing sessions vs users as colored bars.
        Use only inline SVG - no external libraries. Keep bars proportional to the values.`
    ),

    // Global
    DELETE_CONFIRM: GENUI_HTML(
        'Render a destructive confirmation card. Show deleted flag. Do not imply restore is possible.'
    ),

}
