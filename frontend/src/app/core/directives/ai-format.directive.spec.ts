import { AiFormat } from './ai-format.directive';

describe('AiFormat component HTML sanitizer', () => {
  const directive = Object.create(AiFormat.prototype) as {
    isStreamingComponent(raw: string): boolean;
    parse(markdown: string): string;
    sanitizeComponentHtml(html: string): string;
  };

  it('removes root token overrides and keeps local token usage', () => {
    const sanitizedHtml = directive.sanitizeComponentHtml(`
      <style>
        :root { --color-surface: red; color: red; }
        .weather-card { color: var(--color-text-primary); --local-token: red; }
      </style>
      <div class="weather-card">Weather</div>
    `);

    expect(sanitizedHtml).not.toContain(':root');
    expect(sanitizedHtml).not.toContain('--color-surface');
    expect(sanitizedHtml).not.toContain('--local-token');
    expect(sanitizedHtml).toContain('.weather-card');
    expect(sanitizedHtml).toContain('var(--color-text-primary)');
  });

  it('removes unscoped global selectors and keeps scoped selectors', () => {
    const sanitizedHtml = directive.sanitizeComponentHtml(`
      <style>
        table { width: 100%; }
        button { color: red; }
        .btn { border: 0; }
        .genui-root table { width: 100%; }
        .weather-card .btn { color: var(--color-primary); }
        .weather-card h1, h1 { margin: 0; }
      </style>
      <section class="genui-root">Content</section>
    `);

    expect(sanitizedHtml).not.toContain('table { width: 100%; }');
    expect(sanitizedHtml).not.toContain('button { color: red; }');
    expect(sanitizedHtml).not.toContain('.btn { border: 0; }');
    expect(sanitizedHtml).toContain('.genui-root table');
    expect(sanitizedHtml).toContain('.weather-card .btn');
    expect(sanitizedHtml).toContain('.weather-card h1');
    expect(sanitizedHtml).not.toContain('.weather-card h1, h1');
  });

  it('keeps keyframes and removes dangerous tags', () => {
    const sanitizedHtml = directive.sanitizeComponentHtml(`
      <style>
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .weather-card { animation: fade-in 1s ease; }
      </style>
      <script>alert('x')</script>
      <iframe src="https://example.com"></iframe>
      <object></object>
      <embed src="x">
      <div class="weather-card">Weather</div>
    `);

    expect(sanitizedHtml).toContain('@keyframes fade-in');
    expect(sanitizedHtml).toContain('.weather-card');
    expect(sanitizedHtml).not.toContain('<script');
    expect(sanitizedHtml).not.toContain('<iframe');
    expect(sanitizedHtml).not.toContain('<object');
    expect(sanitizedHtml).not.toContain('<embed');
  });

  it('detects only unfinished component blocks as streaming components', () => {
    expect(directive.isStreamingComponent('```component\n<section>')).toBe(true);
    expect(directive.isStreamingComponent('```css\n.table { color: red; }\n```')).toBe(false);
    expect(directive.isStreamingComponent('```csharp\nConsole.WriteLine();\n```')).toBe(false);
  });

  it('renders css code fences as markdown code blocks', () => {
    const markdownHtml = directive.parse('```css\n.card { color: red; }\n```');

    expect(markdownHtml).toContain('<pre><code>');
    expect(markdownHtml).toContain('css');
    expect(markdownHtml).toContain('.card');
  });

  it('renders role badges for Hebrew and English role text', () => {
    const hebrewTableHtml = directive.parse('| שם | תפקיד |\n| --- | --- |\n| דנה | מנהל |\n| יוסי | משתמש |');
    const englishRoleHtml = directive.parse('Role: Admin\nUser (ID: 7)');

    expect(hebrewTableHtml).toContain('badge-admin');
    expect(hebrewTableHtml).toContain('badge-info');
    expect(hebrewTableHtml).toContain('מנהל');
    expect(hebrewTableHtml).toContain('משתמש');
    expect(englishRoleHtml).toContain('badge-admin');
    expect(englishRoleHtml).toContain('badge-info');
  });
});
