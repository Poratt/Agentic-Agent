import { Directive, ElementRef, input, OnChanges, Renderer2, inject, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

type ComponentRenderParts = {
  before: string;
  componentHtml: string;
  after: string;
};

const HEBREW_ROLE_LABEL = 'תפקיד';
const HEBREW_ADMIN_LABEL = 'מנהל';
const HEBREW_USER_LABEL = 'משתמש';

@Directive({
  selector: '[aiFormat]',
  standalone: true,
})
export class AiFormat implements OnChanges {
  aiFormat = input<string>('');

  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private renderer = inject(Renderer2);
  private sanitizer = inject(DomSanitizer);
  private animatedBlockSignatures = new Set<string>();

  private skeletonVisible = false;

  ngOnChanges() {
    const raw = this.aiFormat() ?? '';

    const componentParts = this.extractComponentParts(raw);
    if (componentParts) {
      this.skeletonVisible = false;
      this.renderComponentResponse(componentParts);
      return;
    }

    if (this.isStreamingComponent(raw)) {
      this.renderStreamingComponent(raw);
      return;
    }

    this.skeletonVisible = false;
    const parsedHtml = this.parse(raw);
    const sanitizedHtml = this.sanitizer.sanitize(SecurityContext.HTML, parsedHtml) || '';
    this.updateDomEfficiently(sanitizedHtml);
    this.markNewCompletedBlocks(raw);
  }

  private extractComponentParts(raw: string): ComponentRenderParts | null {
    const closedMatch = /```component\s*([\s\S]*?)```/i.exec(raw);
    if (closedMatch) {
      const matchStart = closedMatch.index;
      const matchEnd = matchStart + closedMatch[0].length;

      return {
        before: raw.slice(0, matchStart),
        componentHtml: closedMatch[1].trim(),
        after: raw.slice(matchEnd),
      };
    }

    const trimmed = raw.trim();
    if (!this.looksLikeRawComponentHtml(trimmed)) {
      return null;
    }

    return {
      before: '',
      componentHtml: trimmed,
      after: '',
    };
  }

  private looksLikeRawComponentHtml(value: string): boolean {
    const startsWithHtml = /^<style[\s>]/i.test(value) || /^<(div|section|article)\b/i.test(value);
    const hasRenderableRoot = /<\/(div|section|article)>/i.test(value);

    return startsWithHtml && hasRenderableRoot;
  }

  private looksLikeOpenRawComponentHtml(value: string): boolean {
    const trimmed = value.trim();
    const startsWithHtml = /^<style[\s>]/i.test(trimmed) || /^<(div|section|article)\b/i.test(trimmed);

    return startsWithHtml && !this.looksLikeRawComponentHtml(trimmed);
  }

  private isStreamingComponent(raw: string): boolean {
    if (/```component\s*[\s\S]*?```/i.test(raw)) {
      return false;
    }

    return /```component\b/i.test(raw) || this.looksLikeOpenRawComponentHtml(raw);
  }

  private renderStreamingComponent(raw: string): void {
    const componentStart = raw.search(/```component\b/i);
    const textBeforeComponent = componentStart >= 0 ? raw.slice(0, componentStart) : '';

    this.el.nativeElement.innerHTML = '';
    this.appendMarkdown(textBeforeComponent);
    this.renderSkeletonOnce();
  }

  private renderSkeletonOnce(): void {
    this.ensureSkeletonStyle();
    this.appendHtml(this.skeletonHtml());
    this.skeletonVisible = true;
  }

  private renderComponentResponse(parts: ComponentRenderParts): void {
    this.el.nativeElement.innerHTML = '';
    this.appendMarkdown(parts.before);
    this.appendComponentHtml(parts.componentHtml);
    this.appendMarkdown(parts.after);
  }

  private appendComponentHtml(html: string): void {
    const div = this.renderer.createElement('div');
    this.el.nativeElement.appendChild(div);
    div.innerHTML = this.sanitizeComponentHtml(html);
  }

  private sanitizeComponentHtml(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    doc.querySelectorAll('script, iframe, object, embed').forEach((node) => {
      node.remove();
    });

    doc.querySelectorAll('style').forEach((style) => {
      const sanitizedCss = this.sanitizeComponentCss(style.textContent ?? '');
      if (!sanitizedCss.trim()) {
        style.remove();
        return;
      }

      style.textContent = sanitizedCss;
    });

    const headStyles = Array.from(doc.head.querySelectorAll('style'))
      .map((style) => {
        return style.outerHTML;
      })
      .join('');

    return `${headStyles}${doc.body.innerHTML}`;
  }

  private sanitizeComponentCss(css: string): string {
    return this.splitCssRules(css)
      .map((rule) => {
        return this.sanitizeCssRule(rule.selector, rule.body);
      })
      .filter((rule) => {
        return rule.trim();
      })
      .join('\n');
  }

  private splitCssRules(css: string): { selector: string; body: string }[] {
    const rules: { selector: string; body: string }[] = [];
    let cursor = 0;

    while (cursor < css.length) {
      const openIndex = css.indexOf('{', cursor);
      if (openIndex === -1) break;

      const selector = css.slice(cursor, openIndex).trim();
      let depth = 1;
      let closeIndex = openIndex + 1;

      while (closeIndex < css.length && depth > 0) {
        const char = css[closeIndex];
        if (char === '{') depth++;
        if (char === '}') depth--;
        closeIndex++;
      }

      if (depth !== 0) break;

      rules.push({
        selector,
        body: css.slice(openIndex + 1, closeIndex - 1),
      });
      cursor = closeIndex;
    }

    return rules;
  }

  private sanitizeCssRule(selector: string, body: string): string {
    const normalizedSelector = selector.trim();
    if (!normalizedSelector) return '';

    if (/^@keyframes\b/i.test(normalizedSelector)) {
      return `${normalizedSelector} {${body}}`;
    }

    if (normalizedSelector.startsWith('@')) {
      const sanitizedNestedCss = this.sanitizeComponentCss(body);
      return sanitizedNestedCss ? `${normalizedSelector} {\n${sanitizedNestedCss}\n}` : '';
    }

    const sanitizedSelector = this.sanitizeSelectorList(normalizedSelector);
    if (!sanitizedSelector) return '';

    const sanitizedBody = this.removeCssCustomPropertyDeclarations(body);
    return sanitizedBody ? `${sanitizedSelector} { ${sanitizedBody} }` : '';
  }

  private removeCssCustomPropertyDeclarations(body: string): string {
    return body
      .split(';')
      .map((declaration) => {
        return declaration.trim();
      })
      .filter((declaration) => {
        return declaration && !/^--[\w-]+\s*:/.test(declaration);
      })
      .join('; ');
  }

  private sanitizeSelectorList(selectorList: string): string {
    return selectorList
      .split(',')
      .map((selector) => {
        return selector.trim();
      })
      .filter((selector) => {
        return selector && !this.isUnsafeSelector(selector);
      })
      .join(', ');
  }

  private isUnsafeSelector(selector: string): boolean {
    const normalizedSelector = selector.trim().toLowerCase();
    if (!normalizedSelector) return false;
    if (/^(:root|html|body)(?=$|[\s.#:[>+~])/.test(normalizedSelector)) return true;
    if (!this.containsUnsafeGlobalTarget(normalizedSelector)) return false;

    return !this.startsWithLocalScope(normalizedSelector);
  }

  private containsUnsafeGlobalTarget(selector: string): boolean {
    return selector
      .split(/[\s>+~]+/)
      .some((compound) => {
        return /^(table|th|td|h1|h2|button)(?=$|[.#:[*])/.test(compound) || /^\.btn(?=$|[.#:[*])/.test(compound);
      });
  }

  private startsWithLocalScope(selector: string): boolean {
    const firstCompound = selector.split(/[\s>+~]+/)[0] ?? '';
    return /^\.(?!btn(?=$|[.#:[*]))[\w-]+/.test(firstCompound);
  }

  private appendMarkdown(markdown: string): void {
    const parsedHtml = this.parse(markdown);
    const sanitizedHtml = this.sanitizer.sanitize(SecurityContext.HTML, parsedHtml) || '';
    this.appendHtml(sanitizedHtml);
  }

  private appendHtml(html: string): void {
    if (!html.trim()) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    Array.from(doc.body.childNodes).forEach((node) => {
      this.renderer.appendChild(this.el.nativeElement, node.cloneNode(true));
    });
  }

  private ensureSkeletonStyle(): void {
    if (document.getElementById('skeleton-pulse-style')) return;

    const style = document.createElement('style');
    style.id = 'skeleton-pulse-style';
    style.textContent = `
          @keyframes pulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 0.15; }
          }
        `;
    document.head.appendChild(style);
  }

  private skeletonHtml(): string {
    return `
        <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-6);">
          <div style="height:20px;background:var(--color-border);border-radius:4px;margin-bottom:12px;animation:pulse 1.5s ease-in-out infinite;"></div>
          <div style="height:40px;background:var(--color-border);border-radius:4px;animation:pulse 1.5s ease-in-out infinite 0.3s;"></div>
        </div>`;
  }

  private updateDomEfficiently(htmlContent: string): void {
    const target = this.el.nativeElement;

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const newNodes = Array.from(doc.body.childNodes);
    const currentNodes = Array.from(target.childNodes);

    newNodes.forEach((newNode, index) => {
      const currentNode = currentNodes[index];

      if (!currentNode) {
        this.renderer.appendChild(target, newNode.cloneNode(true));
        return;
      }

      if (currentNode.nodeType !== newNode.nodeType ||
        (currentNode instanceof HTMLElement && newNode instanceof HTMLElement && currentNode.outerHTML !== newNode.outerHTML) ||
        (currentNode.nodeType === Node.TEXT_NODE && currentNode.textContent !== newNode.textContent)) {

        const clone = newNode.cloneNode(true);

        if (currentNode instanceof HTMLElement && currentNode.classList.contains('ai-node-fade-in')) {
          this.renderer.addClass(clone, 'ai-node-fade-in');
        }

        this.renderer.insertBefore(target, clone, currentNode);
        this.renderer.removeChild(target, currentNode);
      }
    });

    while (target.childNodes.length > newNodes.length) {
      this.renderer.removeChild(target, target.lastChild);
    }
  }
  private roleBadge(text: string): string {
    const t = text.trim();
    if (t === HEBREW_ADMIN_LABEL || t.toLowerCase() === 'admin') {
      return `<span class="badge badge-admin"><span class="ph sm">shield</span>${HEBREW_ADMIN_LABEL}</span>`;
    }
    if (t === HEBREW_USER_LABEL || t.toLowerCase() === 'user') {
      return `<span class="badge badge-info"><span class="ph sm">person</span>${HEBREW_USER_LABEL}</span>`;
    }
    return `<span>${t}</span>`;
  }

  private markNewCompletedBlocks(raw: string): void {
    const blocks = Array.from(this.el.nativeElement.children) as HTMLElement[];
    if (blocks.length === 0) return;

    const lastBlock = blocks[blocks.length - 1];
    const lastBlockIsStable = this.isLastBlockStable(raw);

    blocks.forEach((block) => {
      const isLast = block === lastBlock;
      if (isLast && !lastBlockIsStable) return;

      const signature = this.blockSignature(block);
      if (this.animatedBlockSignatures.has(signature)) return;

      this.animatedBlockSignatures.add(signature);
      this.renderer.addClass(block, 'ai-node-fade-in');
    });
  }

  private isLastBlockStable(raw: string): boolean {
    return /\n\s*\n$/.test(raw) || /```[\s\S]*?```\s*$/.test(raw) || /\|.+\|\s*$/.test(raw);
  }

  private blockSignature(block: HTMLElement): string {
    return `${block.tagName}:${block.textContent?.trim() ?? ''}:${block.innerHTML.length}`;
  }

  private parse(text: string): string {
    const componentMatch = text.match(/```component\s*([\s\S]*?)```/);
    if (componentMatch) {
      return componentMatch[1].trim();
    }
    const TABLE_PLACEHOLDER = 'TABLE_PLACEHOLDER_';
    const tables: string[] = [];

    const withTables = text.replace(/((?:^\|.+\|[ \t]*\n?)+)/gm, (block) => {
      tables.push(this.parseTable(block));
      return `${TABLE_PLACEHOLDER}${tables.length - 1}_`;
    });

    let processed = withTables
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<span class="ai-bold" >$1</span>')
      .replace(/^\* (.+)$/gm, '<li>$1</li>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/(<li>[\s\S]*?<\/li>)/g, (match) => {
        return `<ul>${match}</ul>`;
      })
      .replace(/^---$/gm, '<hr>')
      .replace(/\n/g, '<br>');

    processed = processed
      .replace(/(<br>\s*){2,}/gi, '<br>')
      .replace(/<br>\s*<(h1|h2|h3|hr|ul|li|table|thead|tbody|tr|div|pre)/gi, '<$1')
      .replace(/<\/(h1|h2|h3|hr|ul|li|table|thead|tbody|tr|div|pre)>\s*<br>/gi, '</$1>');

    processed = processed
      .replace(
        new RegExp(`(${HEBREW_ROLE_LABEL}|Role):\\s*(${HEBREW_ADMIN_LABEL}|Admin)`, 'g'),
        `$1: <span class="badge badge-admin"><span class="ph sm">shield</span>${HEBREW_ADMIN_LABEL}</span>`
      )
      .replace(
        new RegExp(`(${HEBREW_ROLE_LABEL}|Role):\\s*(${HEBREW_USER_LABEL}|User)`, 'g'),
        `$1: <span class="badge badge-info"><span class="ph sm">person</span>${HEBREW_USER_LABEL}</span>`
      )
      .replace(
        new RegExp(`\\b(Admin|${HEBREW_ADMIN_LABEL})\\s*\\(ID:\\s*(\\d+)\\)`, 'gi'),
        `<span class="badge badge-admin"><span class="ph sm">shield</span>${HEBREW_ADMIN_LABEL}</span> (ID: $2)`
      )
      .replace(
        new RegExp(`\\b(User|${HEBREW_USER_LABEL})\\s*\\(ID:\\s*(\\d+)\\)`, 'gi'),
        `<span class="badge badge-info"><span class="ph sm">person</span>${HEBREW_USER_LABEL}</span> (ID: $2)`
      );

    return processed.replace(new RegExp(`${TABLE_PLACEHOLDER}(\\d+)_`, 'g'), (_, i) => {
      return tables[+i];
    });
  }

  private parseTable(block: string): string {
    const lines = block
      .trim()
      .split('\n')
      .filter((l) => {
        return l.trim();
      });
    if (lines.length < 2) {
      return block;
    }

    const inlineMarkdown = (cellText: string): string => {
      return cellText
        .replace(/\*\*(.+?)\*\*/g, '<span class="ai-bold" >$1</span>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');
    };

    const parseRow = (line: string): string[] => {
      return line
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((c) => {
          return c.trim();
        });
    };

    const isSeparator = (line: string) => {
      return /^\|?[\s\-|: ]+\|?$/.test(line) && line.includes('-');
    };

    const headerCells = parseRow(lines[0]);
    const dataLines = lines.slice(1).filter((l) => {
      return !isSeparator(l);
    });

    const roleColIndex = headerCells.findIndex((h) => {
      const cleanH = h.replace(/\*/g, '').trim();
      return cleanH === HEBREW_ROLE_LABEL || cleanH.toLowerCase() === 'role';
    });

    const thead = `<thead><tr>${headerCells
      .map((h) => {
        return `<th><span class="ai-table-header">${inlineMarkdown(h)}</span></th>`;
      })
      .join('')}</tr></thead>`;

    const tbody = `<tbody>${dataLines
      .map((line) => {
        const cells = parseRow(line);
        const tds = cells
          .map((c, i) => {
            const formattedContent = inlineMarkdown(c);

            if (i === roleColIndex) {
              const cleanTextForBadge = c.replace(/\*/g, '').trim();
              return `<td>${this.roleBadge(cleanTextForBadge)}</td>`;
            }

            return `<td>${formattedContent}</td>`;
          })
          .join('');
        return `<tr>${tds}</tr>`;
      })
      .join('')}</tbody>`;

    return `<div class="ai-table-wrap"><table class="ai-table">${thead}${tbody}</table></div>`;
  }
}
