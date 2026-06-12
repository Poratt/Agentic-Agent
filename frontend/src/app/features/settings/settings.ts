import { Component, inject, OnInit, computed, ChangeDetectionStrategy, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { FormBuilder } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { PageStates } from '../../core/enums/page-states.enum';
import { LlmAdminStore } from '../../core/store/llm-admin.store';
import { ProviderResponseDto } from '../../core/models/llm.models';
import { BadgeColor } from '../../core/directives/badge-color.directive';

type ProviderColumn = {
    field: keyof ProviderResponseDto;
    label: string;
};

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, TableModule, BadgeColor, DialogModule, InputTextModule, ButtonModule, ReactiveFormsModule, SelectModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './settings.html',
})
export class Settings implements OnInit {
    // Store & enums
    protected llmAdminStore = inject(LlmAdminStore);
    protected readonly PageStates = PageStates;

    // UI state
    protected dialogVisible = signal(false);
    protected isEdit = signal(false);
    protected editProviderId: number | null = null;
    protected expandedProviderId = signal<number | null>(null);

    // Form handling
    private fb = inject(FormBuilder);
    protected providerForm = this.fb.group({
        key: [''],
        label: [''],
        baseUrl: [''],
        apiKey: [''],
        active: [true],
    });

    // Columns definition
    protected readonly columns: ProviderColumn[] = [
        { field: 'id', label: 'ID' },
        { field: 'key', label: 'מפתח' },
        { field: 'label', label: 'שם תצוגה' },
        { field: 'baseUrl', label: 'כתובת בסיס' },
        { field: 'hasApiKey', label: 'מפתח API' },
        { field: 'modelsCount', label: 'מודלים' },
        { field: 'defaultModelId', label: 'מודל ברירת מחדל' },
        { field: 'active', label: 'פעיל' },
    ];

    // Colors for badge
    protected readonly activeColor = '#10B981';
    protected readonly inactiveColor = '#F87171';

    // Selectors
    pageState = computed(() => this.llmAdminStore.pageState());
    providers = computed(() => this.llmAdminStore.providers());
    errorMessage = computed(() => this.llmAdminStore.error());

    ngOnInit() {
        this.loadProviders();
    }

    loadProviders() {
        this.llmAdminStore.loadProviders();
    }


    // Helper to format nullable values
    formatValue(value: string | number | boolean | null | undefined): string {
        if (value === null || value === undefined || value === '') {
            return 'לא ידוע';
        }
        if (typeof value === 'boolean') {
            return value ? 'כן' : 'לא';
        }
        return String(value);
    }

    // Dialog actions
    openCreate() {
        this.isEdit.set(false);
        this.editProviderId = null;
        this.providerForm.reset({ key: '', label: '', baseUrl: '', apiKey: '', active: true });
        this.dialogVisible.set(true);
    }

    openEdit(provider: ProviderResponseDto) {
        this.isEdit.set(true);
        this.editProviderId = provider.id;
        this.providerForm.setValue({
            key: provider.key ?? '',
            label: provider.label ?? '',
            baseUrl: provider.baseUrl ?? '',
            apiKey: '', // never expose stored key
            active: provider.active ?? true,
        });
        this.dialogVisible.set(true);
    }

    saveProvider() {
        const dto = this.providerForm.value as any;
        if (this.isEdit()) {
            if (this.editProviderId !== null) {
                this.llmAdminStore.updateProvider(this.editProviderId, dto);
            }
        } else {
            this.llmAdminStore.createProvider(dto);
        }
        this.dialogVisible.set(false);
    }

    cancelDialog() {
        this.dialogVisible.set(false);
    }

    // Row expansion for models
    toggleExpand(providerId: number) {
        const currently = this.expandedProviderId();
        this.expandedProviderId.set(currently === providerId ? null : providerId);
        if (this.expandedProviderId() === providerId) {
            this.llmAdminStore.loadModels(providerId);
        }
    }

    // Change default model via dropdown
    changeDefaultModel(providerId: number, modelId: number) {
        this.llmAdminStore.setDefaultModel(providerId, modelId);
    }
}
