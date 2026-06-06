import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { PageStates } from '../../core/enums/page-states.enum';
import { environment } from '../../environments/environment';

@Component({
    selector: 'app-explorer',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './explorer.html',
    styleUrls: ['./explorer.css'],
})
export class Explorer {
    private readonly http = inject(HttpClient);
    private readonly explorerDataUrl = `${environment.apiUrl}/explorer/data`;

    protected readonly PageStates = PageStates;

    pageState = signal<PageStates>(PageStates.Loading);
    products: any[] = [];

    constructor() {
    }


}


