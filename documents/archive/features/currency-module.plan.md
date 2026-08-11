# Currency Module Plan (With Accurate GenUI Flags)

## Goal

Add a safe and dynamic currency exchange tool that lets the admin agent answer financial or pricing questions and render them as beautifully animated, interactive HTML components (GenUI).

The tool should support queries such as:

- "Convert 250 USD to Shekels."
- "Show me a comparison table of EUR, GBP, and USD against ILS."
- "What is the current exchange rate for Japanese Yen?"

---

## Target Structure

```txt
backend/src/modules/
  currency/
    currency.module.ts
    currency.controller.ts
    currency.service.ts
    dto/
      rate-query.dto.ts
      convert-query.dto.ts
```

---

## External API Provider

Use the stable, public, and free exchangerate endpoint:
`https://open.er-api.com/v6/latest/{base}`

This API is highly reliable, does not require registration or API keys, and updates global exchange rates once every hour.

---

## Endpoint Contracts

### 1. Rates Query

```txt
GET /currency/rates?base=USD
```

- **Request DTO (`RateQueryDto`):**
  - `base` (string, required): 3-character uppercase ISO currency code (e.g. `USD`, `EUR`, `ILS`). Default: `ILS`.

- **Response Shape:**
  ```ts
  type CurrencyRatesResponse = {
    base: string;
    date: string;
    rates: Record<string, number>; // Map of currency code to rate value
  };
  ```

### 2. Convert Query

```txt
GET /currency/convert?from=USD&to=ILS&amount=100
```

- **Request DTO (`ConvertQueryDto`):**
  - `from` (string, required): Source currency code.
  - `to` (string, required): Target currency code.
  - `amount` (number, required): Numeric amount to convert. Must be greater than 0.

- **Response Shape:**
  ```ts
  type CurrencyConversionResponse = {
    from: string;
    to: string;
    amount: number;
    rate: number;
    result: number;
    date: string;
  };
  ```

---

## GenUI Rendering Rules (Strict Flag Guidelines)

Add the currency instructions to:
`backend/src/modules/admin-agent/constants/agent-instructions.constant.ts`

### 1. Crucial Flag Rules (Anti-Hallucination)

- **PROHIBITED**: The agent is strictly FORBIDDEN from writing custom SVG paths or geometric coordinates to draw country flags from scratch. This leads to distorted flags.
- **ALLOWED METHOD A (Preferred for simplicity)**: Use native Unicode flag emojis (e.g., 🇺🇸, 🇮🇱, 🇪🇺, 🇬🇧, 🇯🇵, 🇨🇦). They render natively in high quality based on the user's operating system.
- **ALLOWED METHOD B (Preferred for premium look)**: Use the high-resolution `flagcdn.com` service with simple Image tags. The agent must map the 3-letter currency to its 2-letter country code:
  - USD ⇆ `us` (`https://flagcdn.com/w40/us.png`)
  - ILS ⇆ `il` (`https://flagcdn.com/w40/il.png`)
  - EUR ⇆ `eu` (`https://flagcdn.com/w40/eu.png`)
  - GBP ⇆ `gb` (`https://flagcdn.com/w40/gb.png`)
  - JPY ⇆ `jp` (`https://flagcdn.com/w40/jp.png`)

### 2. Conversion Card Layout

- **Header**: Display the source and target currencies side-by-side with FlagCDN images or Unicode emojis.
- **Main Area**: Render the dynamic converted amount in large, high-contrast, bold typography.
- **Footer**: Show the underlying exchange rate and the last updated timestamp in muted colors.
- **Animation**: Stagger a scale/fade-in entry on load.

### 3. Rates Table Layout

- Display a list of the requested exchange rates.
- Use a grid or clean HTML table styled with system CSS tokens (`var(--color-surface)`, `var(--color-border)`).
- Include hover animations using inline `onmouseover` to smoothly transition row backgrounds.

---

## Implementation Steps for the Agent

### Step 1 - Define DTOs

Create:
`backend/src/modules/currency/dto/rate-query.dto.ts`
`backend/src/modules/currency/dto/convert-query.dto.ts`

- Use Swagger decorators.
- Force uppercase conversion on currency codes.
- Validate that currency inputs are exactly 3 characters long.

### Step 2 - Implement `CurrencyService`

Create:
`backend/src/modules/currency/currency.service.ts`

- Inject `HttpService`.
- Implement `getRates(base: string)`:
  - Request data from `https://open.er-api.com/v6/latest/{base}`.
  - Return `CurrencyRatesResponse`.
- Implement `convert(from, to, amount)`:
  - Query the base rate from the API.
  - Calculate the output result.
  - Return `CurrencyConversionResponse`.
- Wrap API calls in `try/catch` blocks to protect against network timeouts.

### Step 3 - Implement `CurrencyController` & `CurrencyModule`

Create:
`backend/src/modules/currency/currency.controller.ts`
`backend/src/modules/currency/currency.module.ts`

- Expose `GET /currency/current` (rates lookup) and `GET /currency/convert` (conversion calculation).
- Register `CurrencyModule` in `AppModule`.
- Add complete Swagger metadata to the controller:
  - `summaryHe`
  - `toolIcon` (e.g., `ph-currency-circle-dollar`)
  - `genUiSpec` containing the Flag-safe GenUI HTML template instructions.

---

## Checklist for the Agent

- [ ] Create `RateQueryDto` and `ConvertQueryDto` DTO files.
- [ ] Create `CurrencyService` and implement HTTP requests to `open.er-api.com`.
- [ ] Create `CurrencyController` with dynamic `genUiSpec` rules.
- [ ] Register `CurrencyModule` in `AppModule`.
- [ ] Add explicit instructions prohibiting raw SVG flag rendering (enforcing Unicode or FlagCDN instead).
- [ ] Verify the backend build passes successfully.
- [ ] Verify the new endpoints appear as tools in Swagger.

---
