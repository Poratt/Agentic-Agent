Read AGENTS.md first.
Read C:\Users\porat\.claude\rules\angular-rules.md.

Before editing, state:
1. Angular change type: component, template, service, store, route, or CSS
2. target files
3. nearby Angular example you found
4. verification command

After the pre-implementation report, proceed automatically unless:
- the user explicitly asked you to wait for approval
- required files or project patterns cannot be found
- the change would unexpectedly touch backend/API contracts
- the requested behavior is ambiguous enough to risk the wrong implementation

Do not ask "shall I proceed?" after the report when the path is clear.

Rules:
- Use Angular 22 patterns.
- Use standalone components.
- Use `inject()`, not constructor injection.
- Use `@if`, `@for`, `@switch`, not old structural directives.
- Use signals for local state.
- Declare `changeDetection` explicitly.
- Use `PageStates` only for pages with loading/error/empty/ready async state.
- Do not add `PageStates` to a static placeholder page.
- Prefer existing global layout/classes before creating component CSS.
- Create a component CSS file only when local layout rules are needed.
- Do not add `$safeNavigationMigration()`.
- Keep changes surgical.

Static page shell:
- Static pages do not need `PageStates`, but they still must use the standard page shell.
- A static placeholder page is not an empty data state.
- Do not use `.page-state.empty-state` unless representing a real no-data state.
- For simple static placeholder pages, copy this structure exactly and only replace `PAGE_TITLE`, `SECTION_TITLE`, icon class, and `PLACEHOLDER_TEXT`:

```html
<div class="page-content">
  <header class="page-header">
    <h2>PAGE_TITLE</h2>
  </header>

  <section class="glass-effect card">
    <div class="card-header">
      <span class="ph ph-gear"></span>
      <h3>SECTION_TITLE</h3>
    </div>
    <p class="subtitle">PLACEHOLDER_TEXT</p>
  </section>
</div>
```

- Do not improvise the HTML structure for a simple static page.
- Do not move placeholder text into the header.
- Do not use `page-state`, `empty-state`, or loose standalone text blocks for static placeholder content.
- Do not create `settings-container`, `*-container`, or page-specific wrapper classes for a simple static page.
- Do not create a component CSS file for a simple static placeholder page.
- If a component CSS file already exists and is unnecessary, delete it and remove `styleUrl`/`styleUrls` from the component.
Hebrew and UTF-8:
- Hebrew text is allowed.
- Preserve user-facing Hebrew text exactly when editing existing Hebrew.
- Do not copy Hebrew from terminal output if it appears corrupted.
- If Hebrew looks suspicious, read the file directly and run:
  `rg -n "׳|ג€�|ג†|ג€|�" <touched-files>`
- Fix actual mojibake before finishing.

CSS gate:
- For placeholder/static pages, first try existing global classes: `page-content`, `page-header`, `glass-effect`, `card`, `card-header`, `subtitle`.
- Do not create a component CSS file unless existing classes are insufficient.
- If creating component CSS, scope selectors under the component root class.
- Never style bare `h1`, `p`, `button`, `table`, `th`, or `td` in component CSS.
- Use valid design tokens only.

Definition of Done:
Do not mark the task complete unless:
- the page/component renders meaningful content matching the request
- all routes and menu links required by the request are connected
- Hebrew text is readable in the edited file and has no actual mojibake
- static pages use the exact standard page shell structure
- static placeholder pages do not use `empty-state` unless representing a real no-data state
- no page-specific wrapper/class/CSS was added unless justified
- CSS follows project rules, or no CSS file was created because existing classes were enough
- the verification command completed successfully
- you re-read the changed sections after editing

Self-review before final answer:
- List each requirement and whether it was satisfied.
- List files changed.
- List verification command and result.
- List any known limitations or skipped checks.

Verify:
- Run frontend verification from `frontend/`.
- Run `npx ng build` for TS/template/service/CSS changes.
- Run `npx ng test --watch=false` when behavior changes.
- Do not use `npx ng build frontend` unless the workspace command is known to support that project argument.
- Search touched files for old Angular syntax before finishing.