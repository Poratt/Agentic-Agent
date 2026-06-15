import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LlmProvidersManagement } from "../llm-providers-management/llm-providers-management";

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, LlmProvidersManagement],
    templateUrl: './settings.html',
    changeDetection: ChangeDetectionStrategy.Eager,
})
export class Settings { }


