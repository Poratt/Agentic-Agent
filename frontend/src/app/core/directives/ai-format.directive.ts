import { Directive, ElementRef, input, OnChanges, Renderer2, inject } from '@angular/core';

@Directive({
  selector: '[aiFormat]',
  standalone: true,
})
export class AiFormat implements OnChanges {
  aiFormat = input<string>('');

  private el = inject(ElementRef);
  private renderer = inject(Renderer2);

  ngOnChanges() {
    const raw = this.aiFormat() ?? '';
    this.renderer.setProperty(this.el.nativeElement, 'innerHTML', this.parse(raw));
  }

  private roleBadge(text: string): string {
    const t = text.trim();
    if (t === 'מנהל' || t.toLowerCase() === 'admin') {
      return `<span class="ai-role-badge ai-role-admin">${t}</span>`;
    }
    if (t === 'משתמש' || t.toLowerCase() === 'user') {
      return `<span class="ai-role-badge ai-role-user">${t}</span>`;
    }
    return `<strong>${t}</strong>`;
  }

  private parse(text: string): string {
    // שלב 1: חילוץ טבלאות לפני שה-Markdown הכללי מלכלך את השורות ב-<br>
    const TABLE_PLACEHOLDER = '§TABLE§';
    const tables: string[] = [];

    const withTables = text.replace(/((?:^\|.+\|[ \t]*\n?)+)/gm, (block) => {
      tables.push(this.parseTable(block));
      return TABLE_PLACEHOLDER + (tables.length - 1) + '§';
    });

    // שלב 2: עיבוד Markdown כללי לשאר הטקסט
    let processed = withTables
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^\* (.+)$/gm, '<li>$1</li>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/(<li>[\s\S]*?<\/li>)/g, (match) => {
        return `<ul>${match}</ul>`;
      })
      .replace(/^---$/gm, '<hr>')
      .replace(/\n/g, '<br>');

    // ניקוי וצמצום של ירידות שורה כפולות או מיותרות ליד תגיות בלוק מבניות
    processed = processed
      .replace(/(<br>\s*){2,}/gi, '<br>')
      .replace(/<br>\s*<(h1|h2|h3|hr|ul|li|table|thead|tbody|tr|div|pre)/gi, '<$1')
      .replace(/<\/(h1|h2|h3|hr|ul|li|table|thead|tbody|tr|div|pre)>\s*<br>/gi, '</$1>');

    // שלב 3: החזרת הטבלאות המעובדות למקומן
    return processed.replace(/§TABLE§(\d+)§/g, (_, i) => {
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
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
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
      return cleanH === 'תפקיד' || cleanH.toLowerCase() === 'role';
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
