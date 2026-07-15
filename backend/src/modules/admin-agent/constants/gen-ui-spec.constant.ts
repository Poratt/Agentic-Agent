export const GENUI_HTML = (hint: string) => {
    return `After getting data, return ONLY a raw HTML block in this exact format:
\`\`\`component
<style>...</style>
<div style="...">...</div>
\`\`\`
FONT-SIZE RULE: Every text element (table, th, td, button, span, div, p) MUST use font-size: var(--font-size-xs). NEVER use font-size-md, font-size-lg, or font-size-xl.
ICONS: Use <span class="ph ph-{icon-name}"></span> for all icons. NEVER use emojis (👁 🗑 ⭐), Unicode symbols (★ ●), or ASCII art — EXCEPT weather emojis (☀️ 🌧️ ⛅ 🌩️ ❄️ 🌬️ 🌫️ 🌙 🌪️ 🌦️) which are allowed in weather components only.
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
        CSS REQUIREMENTS — these exact declarations MUST appear in the <style> block:
        - .users-table th { font-size: var(--font-size-xs) }
        - .users-table td { font-size: var(--font-size-xs) }
        - .act-btn { font-size: var(--font-size-xs) }
        - .role-badge { font-size: var(--font-size-xs) }
        Do NOT use font-size-md or font-size-lg anywhere.
        ICONS: Use <span class="ph ph-{icon-name}"></span> for all icons. NEVER use emojis.
        Action buttons: Small pill-shaped with Phosphor icon span before label. Button classes: act-btn, act-del (for delete).
        Date: toLocaleDateString('he-IL') for DD/MM/YYYY format.
        Role badge: var(--color-primary) for admin, var(--color-surface-elevated) for user.
        Button actions:
           - "פרטים": onclick="window.agentPrompt('תראה לי את פרטי המשתמש עם מזהה ' + id)"
           - "מחק" (act-del, non-admin only): onclick="window.agentPrompt('מחק את המשתמש עם מזהה ' + id)"
           - "שנה תפקיד": onclick="window.agentPrompt('שנה את תפקיד המשתמש עם מזהה ' + id)"
        Replace 'id' with actual user id. Use ONLY design tokens for CSS values.`
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
        Weather emojis ARE ALLOWED here (☀️ 🌧️ ⛅ 🌩️ ❄️ 🌬️ 🌫️ 🌙 🌪️ 🌦️).
        Rules:
        1. Use only values returned in result. Never invent weather values, location, timestamps, icons, or measurements.
        2. Build a single polished weather card with an animated hero area, not a table.
        3. Header: show the weather description and result.requestLocalTime as the current local Israel time. Do not use observationTime as the main current time.
        4. Main metric: show tempC as the dominant animated number, with feelsLikeC and optional tempF/feelsLikeF as secondary text.
        5. Detail grid: show humidity, windSpeedKmph + windDirection, uvIndex, cloudCover, precipitationMm, pressure, visibility, and observationTime only as "provider observation time" when available. Hide any row whose value is missing or empty.
        6. ANIMATIONS (make them rich and visible):
           - Root card: fade-in + lift (translateY(-20px) to 0) over 500ms ease-out.
           - Weather emoji: large (48-64px), float animation (translateY oscillation 3-5s infinite ease-in-out), glow effect.
           - Temperature number: scale from 0 to 1 over 600ms with bounce easing.
           - Detail chips: stagger in from bottom with 80ms delay between each (opacity 0→1 + translateY).
           - Background scene: animated sun rays rotating slowly (20s), rain drops falling (linear infinite), clouds drifting (horizontal float 8-15s), or snow particles falling.
           - Severity pulsing: uvIndex>=6 pulse the UV chip red, precipitation>0 animate rain icon, wind>30 animate wind icon.
        7. Keep animations smooth: use transform and opacity only, no layout thrashing.`
    ),

    WEATHER_FORECAST: GENUI_HTML(
        `Render a gorgeous 5-day forecast container.
        Weather emojis ARE ALLOWED here (☀️ 🌧️ ⛅ 🌩️ ❄️ 🌬️ 🌫️ 🌙 🌪️ 🌦️).
        - Header with city name + <span class="ph ph-calendar"></span> icon
        - 5 cards horizontally (flexbox), each with: day name, weather emoji, max/min temp, humidity
        - ANIMATIONS:
          * Container: fade-in on load 400ms
          * Cards: stagger entrance from right (translateX(30px)→0) with 100ms delay between each
          * Weather emoji: gentle float animation (2-4s infinite)
          * On hover: card lifts (translateY(-4px)), border glows, emoji scales up 1.1x
          * Temperature: number scales in on card entrance
        - CRITICAL: Use ONLY design tokens for CSS values. NEVER use hardcoded colors or pixel values.`
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
        - Include a header card with a summary statistic (e.g. "X out of Y models active") with <span class="ph ph-activity"></span> and pulsing dot.
        - Render a clean grid of models. For each model show its full name, its provider badge, and its dynamic online status.
        - Verified models: show a green active badge with <span class="ph ph-check-circle"></span> and the text 'תקין ופעיל'.
        - Failed models: show a red badge with <span class="ph ph-warning-circle"></span> and the text 'לא עונה (500)'.
        - NEVER use emojis or Unicode symbols. Use <span class="ph ph-{icon-name}"></span> for all icons.
        `
    ),

    // Database Monitor
    DATABASE_STORAGE_MONITOR: GENUI_HTML(
        `Render a database storage maintenance dashboard from the tool response.
        Rules:
        1. Use only values returned by the tool. Never invent table sizes, row counts, or growth rates.
        2. Header section: show result.databaseName, result.tableCount, result.totalRows, and result.totalSizeFormatted as summary metrics.
        3. Render a donut/pie chart using CSS conic-gradient showing percentOfDatabase for the top 6 tables by totalSizeBytes descending.
        4. Sort tables by totalSizeBytes descending. Show all tables in card list below the chart.
        5. Each table card must show: tableName, rowCount, dataSizeFormatted, indexSizeFormatted, totalSizeFormatted, percentOfDatabase with a small bar.
        6. If result.tables is empty, render a stable empty state that says "No tables found in the database."
        7. Use an operational maintenance tone, not a sales dashboard tone.
        8. CRITICAL: Use ONLY design tokens for all CSS values. Use var(--color-surface) for card backgrounds, var(--color-text-primary) for text, var(--color-text-secondary) for muted text, var(--color-border) for borders, var(--color-primary) and var(--color-secondary) for chart segment colors, var(--radius-lg) for card border-radius, var(--space-4) for padding, var(--shadow-soft) for card shadows. NEVER use hardcoded colors or pixel values.`
    ),
}
