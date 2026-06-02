import { Directive, ElementRef, input, OnChanges, Renderer2, inject } from '@angular/core';

@Directive({
  selector: '[aiFormat]',
  standalone: true,
})
export class AiFormat implements OnChanges {
  aiFormat = input<string>('');

  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private renderer = inject(Renderer2);
  private animatedBlockSignatures = new Set<string>();

  ngOnChanges() {
    const raw = this.aiFormat() ?? '';
    this.renderer.setProperty(this.el.nativeElement, 'innerHTML', this.parse(raw));
    this.markNewCompletedBlocks(raw);
  }

  private roleBadge(text: string): string {
    const t = text.trim();
    if (t === 'מנהל' || t.toLowerCase() === 'admin') {
      return '<span class="badge badge-admin"><span class="ph sm">shield</span>מנהל</span>';
    }
    if (t === 'משתמש' || t.toLowerCase() === 'user') {
      return '<span class="badge badge-info"><span class="ph sm">person</span>משתמש</span>';
    }
    return `<strong>${t}</strong>`;
  }

  private markNewCompletedBlocks(raw: string): void {
    const blocks = Array.from(this.el.nativeElement.children) as HTMLElement[];
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
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
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
        /(תפקיד|Role):\s*(מנהל|Admin)/g,
        '$1: <span class="badge badge-admin"><span class="ph sm">shield</span>מנהל</span>'
      )
      .replace(
        /(תפקיד|Role):\s*(משתמש|User)/g,
        '$1: <span class="badge badge-info"><span class="ph sm">person</span>משתמש</span>'
      )
      .replace(
        /\b(Admin|מנהל)\s*\(ID:\s*(\d+)\)/gi,
        '<span class="badge badge-admin"><span class="ph sm">shield</span>מנהל</span> (ID: $2)'
      )
      .replace(
        /\b(User|משתמש)\s*\(ID:\s*(\d+)\)/gi,
        '<span class="badge badge-info"><span class="ph sm">person</span>משתמש</span> (ID: $2)'
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
