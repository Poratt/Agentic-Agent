import { AiFormat } from './ai-format.directive';

describe('AiFormat component HTML sanitizer', () => {
  const directive = Object.create(AiFormat.prototype) as {
    isStreamingComponent(raw: string): boolean;
    parse(markdown: string): string;
    sanitizeComponentHtml(html: string): string;
    sanitizeProgressiveComponentHtml(partialHtml: string): string;
    sanitizePartialComponentCss(css: string): string;
    extractProgressiveComponentParts(raw: string): {
      before: string;
      partialComponentHtml: string;
      after: string;
      complete: boolean;
    } | null;
    isInsideOpenTag(html: string): boolean;
    findStableElementPrefix(html: string): string;
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

describe('AiFormat progressive streaming rendering', () => {
  const directive = Object.create(AiFormat.prototype) as {
    isStreamingComponent(raw: string): boolean;
    parse(markdown: string): string;
    sanitizeComponentHtml(html: string): string;
    sanitizeProgressiveComponentHtml(partialHtml: string): string;
    sanitizePartialComponentCss(css: string): string;
    extractProgressiveComponentParts(raw: string): {
      before: string;
      partialComponentHtml: string;
      after: string;
      complete: boolean;
    } | null;
    isInsideOpenTag(html: string): boolean;
    findStableElementPrefix(html: string): string;
  };

  describe('extractProgressiveComponentParts', () => {
    it('returns null when no component fence exists', () => {
      const result = directive.extractProgressiveComponentParts('Hello world');
      expect(result).toBeNull();
    });

    it('extracts open component fence with partial HTML', () => {
      const raw = 'Text before\n```component\n<style>.card{color:red;}</style>\n<section class="card">';
      const result = directive.extractProgressiveComponentParts(raw);

      expect(result).not.toBeNull();
      expect(result!.before).toBe('Text before\n');
      expect(result!.partialComponentHtml).toContain('<style>.card{color:red;}</style>');
      expect(result!.partialComponentHtml).toContain('<section class="card">');
      expect(result!.complete).toBe(false);
      expect(result!.after).toBe('');
    });

    it('returns complete: true when fence is closed', () => {
      const raw = 'Before\n```component\n<div>content</div>\n```\nAfter';
      const result = directive.extractProgressiveComponentParts(raw);

      expect(result).not.toBeNull();
      expect(result!.complete).toBe(true);
      expect(result!.before).toBe('Before\n');
      expect(result!.after).toBe('\nAfter');
    });

    it('does not treat generic code fences as component', () => {
      const raw = '```css\n.card { color: red; }\n```';
      const result = directive.extractProgressiveComponentParts(raw);
      expect(result).toBeNull();
    });

    it('preserves markdown before the component fence', () => {
      const raw = '# Title\nSome text\n```component\n<div>content</div>\n```';
      const result = directive.extractProgressiveComponentParts(raw);

      expect(result!.before).toBe('# Title\nSome text\n');
    });
  });

  describe('sanitizeProgressiveComponentHtml', () => {
    it('renders a partial component with a renderable root', () => {
      const html = '<style>.card{color:var(--color-text-primary);}</style><section class="card"><h2>Weather</h2>';
      const result = directive.sanitizeProgressiveComponentHtml(html);

      expect(result).toContain('<section');
      expect(result).toContain('Weather');
      expect(result).toContain('.card');
    });

    it('returns empty string when partial has no renderable root', () => {
      const html = '<span>partial text only</span>';
      const result = directive.sanitizeProgressiveComponentHtml(html);

      expect(result).toBe('');
    });

    it('removes dangerous tags during progressive rendering', () => {
      const html = '<script>alert("x")</script><div class="card">Content</div>';
      const result = directive.sanitizeProgressiveComponentHtml(html);

      expect(result).not.toContain('<script');
      expect(result).toContain('Content');
    });

    it('removes iframe, object, embed during progressive rendering', () => {
      const html = '<iframe src="bad"></iframe><object></object><embed src="x"><div>Safe</div>';
      const result = directive.sanitizeProgressiveComponentHtml(html);

      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('<object');
      expect(result).not.toContain('<embed');
      expect(result).toContain('Safe');
    });

    it('returns empty string for empty input', () => {
      expect(directive.sanitizeProgressiveComponentHtml('')).toBe('');
      expect(directive.sanitizeProgressiveComponentHtml('   ')).toBe('');
    });
  });

  describe('sanitizePartialComponentCss', () => {
    it('keeps complete CSS rules and drops incomplete trailing rules', () => {
      const css = '.card { color: var(--color-text-primary); } .incomplete { color:';
      const result = directive.sanitizePartialComponentCss(css);

      expect(result).toContain('.card');
      expect(result).not.toContain('.incomplete');
    });

    it('removes unsafe selectors during partial CSS sanitization', () => {
      const css = ':root { --color: red; } .card { color: blue; }';
      const result = directive.sanitizePartialComponentCss(css);

      expect(result).not.toContain(':root');
      expect(result).toContain('.card');
    });

    it('removes CSS custom property declarations', () => {
      const css = '.card { --my-var: red; color: var(--color-text-primary); }';
      const result = directive.sanitizePartialComponentCss(css);

      expect(result).not.toContain('--my-var');
      expect(result).toContain('var(--color-text-primary)');
    });

    it('keeps balanced keyframes', () => {
      const css = '@keyframes fade { from { opacity: 0; } to { opacity: 1; } } .card { animation: fade 1s; }';
      const result = directive.sanitizePartialComponentCss(css);

      expect(result).toContain('@keyframes fade');
      expect(result).toContain('.card');
    });

    it('drops unbalanced keyframes and their contents', () => {
      const css = '@keyframes fade { from { opacity: 0; } .card { color: red; }';
      const result = directive.sanitizePartialComponentCss(css);

      expect(result).not.toContain('@keyframes');
      expect(result).not.toContain('.card');
    });

    it('blocks unsafe global selectors in partial mode', () => {
      const css = 'table { width: 100%; } .card { color: red; }';
      const result = directive.sanitizePartialComponentCss(css);

      expect(result).not.toContain('table');
      expect(result).toContain('.card');
    });
  });

  describe('isInsideOpenTag', () => {
    it('detects when HTML ends inside an open tag', () => {
      expect(directive.isInsideOpenTag('<div class="')).toBe(true);
      expect(directive.isInsideOpenTag('<section class=')).toBe(true);
      expect(directive.isInsideOpenTag('<span ')).toBe(true);
    });

    it('returns false when HTML ends after a closed tag', () => {
      expect(directive.isInsideOpenTag('<div>content</div>')).toBe(false);
      expect(directive.isInsideOpenTag('<section>')).toBe(false);
      expect(directive.isInsideOpenTag('text')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(directive.isInsideOpenTag('')).toBe(false);
    });
  });

  describe('findStableElementPrefix', () => {
    it('returns content before an incomplete tag', () => {
      expect(directive.findStableElementPrefix('<div>text<div class="')).toBe('<div>text');
    });

    it('returns full string when no incomplete tag', () => {
      expect(directive.findStableElementPrefix('<div>text</div>')).toBe('<div>text</div>');
    });

    it('returns full string when no opening tag', () => {
      expect(directive.findStableElementPrefix('no tags here')).toBe('no tags here');
    });
  });

  describe('isStreamingComponent', () => {
    it('detects open component fence', () => {
      expect(directive.isStreamingComponent('```component\n<div>')).toBe(true);
    });

    it('does not detect closed component fence as streaming', () => {
      expect(directive.isStreamingComponent('```component\n<div>\n```')).toBe(false);
    });

    it('detects open raw component HTML', () => {
      expect(directive.isStreamingComponent('<style>.card{}</style><div class="card"></div>')).toBe(true);
    });

    it('does not detect non-component code fences', () => {
      expect(directive.isStreamingComponent('```ts\nconst x = 1;\n```')).toBe(false);
      expect(directive.isStreamingComponent('```html\n<div></div>\n```')).toBe(false);
    });

    it('returns false for plain text', () => {
      expect(directive.isStreamingComponent('Hello world')).toBe(false);
    });
  });
});
