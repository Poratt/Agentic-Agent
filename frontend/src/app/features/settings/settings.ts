import {
    Component,
    inject,
    OnInit,
    computed,
    ChangeDetectionStrategy,
    signal
} from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { PageStates } from '../../core/enums/page-states.enum';
import { LlmAdminStore } from '../../core/store/llm-admin.store';
import { ProviderResponseDto, ModelResponseDto } from '../../core/models/llm.models';
import { BadgeColor } from '../../core/directives/badge-color.directive';

type ProviderColumn = {
    field: keyof ProviderResponseDto;
    label: string;
};

type ModelColumn = {
    field: keyof ModelResponseDto;
    label: string;
};

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [
        CommonModule,
        TableModule,
        BadgeColor,
        DialogModule,
        InputTextModule,
        ButtonModule,
        ReactiveFormsModule,
        TooltipModule
    ],
    changeDetection: ChangeDetectionStrategy.Default,
    templateUrl: './settings.html',
})
export class Settings implements OnInit {
    protected llmAdminStore = inject(LlmAdminStore);
    protected readonly PageStates = PageStates;

    // UI state
    protected dialogVisible = signal(false);
    protected isEdit = signal(false);
    protected editProviderId: number | null = null;

    // Standard object for PrimeNG row expansion two-way binding
    protected expandedRowKeys: Record<number, boolean> = {};

    get dialogVisibleModel(): boolean {
        return this.dialogVisible();
    }

    set dialogVisibleModel(v: boolean) {
        this.dialogVisible.set(v);
        if (!v) {
            this.cancelDialog();
        }
    }

    private fb = inject(FormBuilder);

    protected providerForm = this.fb.group({
        key: [''],
        label: [''],
        baseUrl: [''],
        apiKey: [''],
        active: [true],
    });

    protected modelForm = this.fb.group({
        name: [''],
        label: [''],
        active: [true],
        supportsStreaming: [true],
        supportsTools: [false],
        contextWindow: [null as number | null],
        sortOrder: [0],
    });

    protected modelDialogVisible = signal(false);
    protected isModelEdit = signal(false);
    protected editModelId: number | null = null;
    protected modelProviderId: number | null = null;

    get modelDialogVisibleModel(): boolean {
        return this.modelDialogVisible();
    }

    set modelDialogVisibleModel(v: boolean) {
        this.modelDialogVisible.set(v);
        if (!v) {
            this.cancelModelDialog();
        }
    }

    protected readonly columns: ProviderColumn[] = [
        { field: 'id', label: 'ID' },
        { field: 'key', label: 'Key' },
        { field: 'label', label: 'Display Name' },
        { field: 'baseUrl', label: 'Base URL' },
        { field: 'hasApiKey', label: 'API Key' },
        { field: 'modelsCount', label: 'Models' },
        { field: 'defaultModelId', label: 'Default Model' },
        { field: 'active', label: 'Active' },
    ];

    protected readonly modelColumns: ModelColumn[] = [
        { field: 'id', label: 'ID' },
        { field: 'name', label: 'Name' },
        { field: 'label', label: 'Display Name' },
        { field: 'contextWindow', label: 'Context Window' },
        { field: 'sortOrder', label: 'Order' },
        { field: 'supportsStreaming', label: 'Streaming' },
        { field: 'supportsTools', label: 'Tools' },
        { field: 'active', label: 'Active' },
    ];

    protected readonly activeColor = '#10B981';
    protected readonly inactiveColor = '#F87171';

    pageState = computed(() => {
        return this.llmAdminStore.pageState();
    });

    providers = computed(() => {
        return this.llmAdminStore.providers();
    });

    errorMessage = computed(() => {
        return this.llmAdminStore.error();
    });

    onRowExpand(event: any) {
        const id = event.data.id;
        this.llmAdminStore.loadModels(id);
    }

    onRowCollapse(event: any) {
        // No action needed as PrimeNG syncs state via [(expandedRowKeys)]
    }

    modelsFor(providerId: number): ModelResponseDto[] {
        return this.llmAdminStore.models(providerId)();
    }

    modelsLoadingFor(providerId: number): boolean {
        return this.llmAdminStore.modelsLoading(providerId)();
    }

    modelsErrorFor(providerId: number): string | null {
        return this.llmAdminStore.modelsError(providerId)();
    }

    ngOnInit() {
        this.loadProviders();
    }

    loadProviders() {
        this.llmAdminStore.loadProviders();
    }

    formatValue(value: string | number | boolean | null | undefined): string {
        if (value === null || value === undefined || value === '') {
            return 'Unknown';
        }
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        return String(value);
    }

    openCreate() {
        this.isEdit.set(false);
        this.editProviderId = null;
        this.providerForm.reset({
            key: '',
            label: '',
            baseUrl: '',
            apiKey: '',
            active: true
        });
        this.dialogVisible.set(true);
    }

    openEdit(provider: ProviderResponseDto) {
        this.isEdit.set(true);
        this.editProviderId = provider.id;
        this.providerForm.setValue({
            key: provider.key ?? '',
            label: provider.label ?? '',
            baseUrl: provider.baseUrl ?? '',
            apiKey: '',
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

    isExpanded(providerId: number): boolean {
        return !!this.expandedRowKeys[providerId];
    }

    changeDefaultModel(providerId: number, modelId: number) {
        this.llmAdminStore.setDefaultModel(providerId, modelId);
    }

    disableProvider(providerId: number) {
        this.llmAdminStore.disableProvider(providerId);
    }

    disableModel(modelId: number, providerId: number) {
        this.llmAdminStore.disableModel(modelId);
        this.llmAdminStore.loadModels(providerId);
    }

    openModelCreate(providerId: number) {
        this.isModelEdit.set(false);
        this.editModelId = null;
        this.modelProviderId = providerId;
        this.modelForm.reset({
            name: '',
            label: '',
            active: true,
            supportsStreaming: true,
            supportsTools: false,
            contextWindow: null,
            sortOrder: 0
        });
        this.modelDialogVisible.set(true);
    }

    openModelEdit(model: ModelResponseDto) {
        this.isModelEdit.set(true);
        this.editModelId = model.id;
        this.modelProviderId = model.providerId;
        this.modelForm.setValue({
            name: model.name ?? '',
            label: model.label ?? '',
            active: model.active ?? true,
            supportsStreaming: model.supportsStreaming ?? true,
            supportsTools: model.supportsTools ?? false,
            contextWindow: model.contextWindow ?? null,
            sortOrder: model.sortOrder ?? 0,
        });
        this.modelDialogVisible.set(true);
    }

    saveModel() {
        const dto = this.modelForm.value as any;
        if (this.isModelEdit()) {
            if (this.editModelId !== null) {
                this.llmAdminStore.updateModel(this.editModelId, dto);
            }
        } else {
            if (this.modelProviderId !== null) {
                this.llmAdminStore.createModel(this.modelProviderId, dto);
            }
        }
        this.modelDialogVisible.set(false);
    }

    cancelModelDialog() {
        this.modelDialogVisible.set(false);
    }
}