import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { PageStates } from '../../core/enums/page-states.enum';

@Component({
  selector: 'app-explorer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './explorer.html',
  styleUrls: ['./explorer.css'],
})
export class Explorer {
  protected readonly PageStates = PageStates;

  pageState = computed<PageStates>(() => PageStates.Ready);
}
