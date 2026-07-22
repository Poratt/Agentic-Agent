import { Component, inject, ChangeDetectionStrategy, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { IdeasStore } from '../../../core/store/ideas.store';
import { LlmProviderStore } from '../../../core/store/llm-provider.store';

@Component({
  selector: 'app-ideas-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Select],
  templateUrl: './ideas-form.html',
  styleUrl: './ideas-form.css',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class IdeasForm {
  protected store = inject(IdeasStore);
  protected llmProviderStore = inject(LlmProviderStore);
  private fb = inject(FormBuilder);

  models = this.llmProviderStore.chatModels;

  ideasForm: FormGroup = this.fb.group({
    domain: ['', []],
    count: [5, []],
    model: ['', []],
  });

  canGenerate = computed(() => this.store.domain().trim().length > 0);

  constructor() {
    effect(() => {
      const groups = this.models();
      const currentSelection = this.ideasForm.get('model')?.value;
      const userDefaultId = this.llmProviderStore.defaultModelId();

      if (groups.length > 0 && !currentSelection) {
        let modelToSelect = null;

        if (userDefaultId != null) {
          for (const group of groups) {
            const match = group.items?.find((m: any) => m.id === userDefaultId);
            if (match) {
              modelToSelect = match;
              break;
            }
          }
        }

        if (!modelToSelect) {
          modelToSelect = groups[0]?.items?.[0];
        }

        if (modelToSelect) {
          this.ideasForm.patchValue({ model: modelToSelect.id });
        }
      }
    });
  }

  onDomainInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.store.setDomain(value);
    this.ideasForm.patchValue({ domain: value });
  }

  onCountInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.store.setCount(value);
    this.ideasForm.patchValue({ count: value });
  }

  setDefaultModel(event: Event, model: any): void {
    if (this.llmProviderStore.defaultModelId() === model.id) return;

    this.llmProviderStore.setDefaultModel(model.id);
    this.ideasForm.patchValue({ model: model.id });

    setTimeout(() => {
      const target = event.target as HTMLElement;
      const selectHost = target?.closest('p-select');
      const trigger = selectHost?.querySelector('.p-select-trigger') as HTMLElement | null;
      trigger?.blur();
    });
  }

  onGenerate(): void {
    if (this.store.loading()) {
      return;
    }
    const selectedModelId = Number(this.ideasForm.value.model);
    const modelSelection = this.getModelSelection(selectedModelId);
    this.store.setModel(modelSelection);
    this.store.generate();
  }

  onStopGenerate(): void {
    this.store.stopGenerating();
  }

  private getModelSelection(selectedModelId?: number): { provider: string; model: string } | undefined {
    if (!selectedModelId) return undefined;

    for (const provider of this.llmProviderStore.providers()) {
      const model = provider.models?.find((m: any) => m.id === selectedModelId);
      if (model) {
        return {
          provider: provider.key,
          model: model.key,
        };
      }
    }

    return undefined;
  }
}
