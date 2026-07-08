export const GENUI_HTML = (hint: string) => {
    return `After getting data, return ONLY a raw HTML block in this exact format:
\`\`\`component
<style>...</style>
<div style="...">...</div>
\`\`\`
${hint}

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
        Replace 'id' with the actual user id from the data.
        CRITICAL: Use ONLY design tokens for all CSS values. Use var(--color-surface) for table background, var(--color-text-primary) for text, var(--color-border) for table borders, var(--color-primary) for action buttons, var(--color-danger) for delete button, var(--radius-sm) for button border-radius, var(--space-2) for cell padding. NEVER use hardcoded colors or pixel values.`
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
        7. CHARTS: For pie/donut charts, avoid SVG arcs. Use CSS conic-gradient instead.
        8. CRITICAL: Use ONLY design tokens for all CSS values. Use var(--color-surface) for backgrounds, var(--color-text-primary) for text, var(--color-primary) and var(--color-secondary) for chart colors, var(--radius-md) for border-radius, var(--space-4) for padding. NEVER use hardcoded colors or pixel values.`
    ),

    // Currency
    CURRENCY: GENUI_HTML(
        `Render a currency exchange component from the tool response.
        Rules:
        1. Use only values returned by the tool. Never invent rates, timestamps, currencies, or converted amounts.
        2. Flag safety is strict: never draw country flags with custom SVG paths, polygons, circles, coordinates, or hand-built geometry.
        3. Preferred flag rendering: use native Unicode flag emojis or FlagCDN image tags.
        4. If using FlagCDN, map common currencies to these two-letter codes: USD->us, ILS->il, EUR->eu, GBP->gb, JPY->jp, CAD->ca, AUD->au, CHF->ch. URL: https://flagcdn.com/w40/{countryCode}.png
        5. For conversion results: header with source and target currency codes, main converted result in large bold text, original amount/exchange rate/last updated in muted footer. Staggered scale/fade-in animation. Use &rarr; or → for arrows.
        6. For rate results: render a compact rates table or grid using only the returned rates map.
        7. If result is null or success is false, render a stable error/empty state using the response message.
        8. CRITICAL: Use ONLY design tokens for all CSS values. Use var(--color-surface) for backgrounds, var(--color-text-primary) for text, var(--color-primary) for accent colors, var(--radius-lg) for border-radius, var(--space-4) for padding. NEVER use hardcoded colors or pixel values.`
    ),

    // Weather
    WEATHER_CURRENT: GENUI_HTML(
        `Render a premium animated current-weather card from the tool response.
        Rules:
        1. Use only values returned in result. Never invent weather values, location, timestamps, icons, or measurements.
        2. Build a single polished weather card with an animated hero area, not a table.
        3. Header: show the weather description and result.requestLocalTime as the current local Israel time. Do not use observationTime as the main current time.
        4. Main metric: show tempC as the dominant animated number, with feelsLikeC and optional tempF/feelsLikeF as secondary text.
        5. Detail grid: show humidity, windSpeedKmph + windDirection, uvIndex, cloudCover, precipitationMm, pressure, visibility, and observationTime only as "provider observation time" when available. Hide any row whose value is missing or empty.
        6. Create an exciting but professional animation: root card enters with fade + lift, temperature scales in once, detail chips stagger in, weather emoji gently floats. Add a subtle animated weather scene using inline HTML/CSS only: sun rays for sunny, drifting cloud for cloudy, diagonal rain lines for rainy, or moving wind streaks when wind is prominent.
        7. Add severity cues without inventing labels: uvIndex >= 6 make UV chip warning-like, precipitationMm > 0 make precipitation active, windSpeedKmph >= 30 make wind active.
        8. Keep animations smooth and non-blocking: 150-400ms for entrance, 2-6s for ambient loops, no flashing, no infinite aggressive pulsing.
        9. CRITICAL: Use ONLY design tokens for all CSS values. Use var(--color-surface) for backgrounds, var(--color-text-primary) for text, var(--color-border) for borders, var(--radius-lg) for border-radius, var(--space-4) for padding, etc. NEVER use hardcoded colors like #fff, #333, or pixel values like 16px.`
    ),

    WEATHER_FORECAST: GENUI_HTML(
        `Render a gorgeous 5-day forecast container.
        - Header with city name + calendar icon
        - 5 cards horizontally (flexbox), each with: day name, emoji, max/min temp, humidity
        - Hover: border color change
        - CRITICAL: Use ONLY design tokens for all CSS values:
          * Backgrounds: var(--color-surface), var(--color-surface-elevated)
          * Text: var(--color-text-primary), var(--color-text-secondary)
          * Borders: var(--color-border)
          * Border radius: var(--radius-lg), var(--radius-xl)
          * Spacing: var(--space-4), var(--space-6)
          * Shadows: var(--shadow-soft)
          * NEVER use hardcoded colors (#fff, #333) or pixel values (16px, 24px)`
    ),


    // System
    SYSTEM_STATUS: GENUI_HTML(
        `Render a system status dashboard with:
        1. Metric cards row: total users, active sessions, Swagger status (success=green, warning=orange).
        2. Below the cards, render an SVG bar chart (width:100%, height:120px) showing sessions vs users as colored bars.
        Use only inline SVG - no external libraries. Keep bars proportional to the values.
        3. CRITICAL: Use ONLY design tokens for all CSS values. Use var(--color-surface) for card backgrounds, var(--color-text-primary) for text, var(--color-success) and var(--color-warning) for status indicators, var(--radius-lg) for card border-radius, var(--space-4) for padding, var(--shadow-soft) for card shadows. NEVER use hardcoded colors or pixel values.`
    ),

    // Global
    DELETE_CONFIRM: GENUI_HTML(
        'Render a destructive confirmation card. Show deleted flag. Do not imply restore is possible.'
    ),

    LLM_TEST_RESULTS: GENUI_HTML(
        `Render a gorgeous summary dashboard of tested LLM models.
        - Include a header card with a summary statistic (e.g. "X out of Y models active") with ph-activity and pulsing dot.
        - Render a clean grid of models. For each model show its full name, its provider badge, and its dynamic online status.
        - Verified models: show a green active badge with the text 'תקין ופעיל' and a checkmark.
        - Failed models: show a red badge with the text 'לא עונה (500)' and a warning circle.
        `
    ),
}
