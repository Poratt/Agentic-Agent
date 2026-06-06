import { Component, OnDestroy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-dropdown',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './dropdown.html',
    styleUrl: './dropdown.css',
})
export class Dropdown implements OnDestroy {
    private readonly hoverOpenDelayMs = 200;
    private openHoverTimeout: ReturnType<typeof setTimeout> | null = null;

    public closed = output<void>();

    public dropdownTrigger = signal(false);

    public position = input<
        | 'top-left'
        | 'top-center'
        | 'top-right'
        | 'bottom-left'
        | 'bottom-center'
        | 'bottom-right'
        | 'left-center'
        | 'right-center'
    >('bottom-right');

    ngOnDestroy(): void {
        this.clearOpenHoverTimeout();
    }

    showDropdown() {
        this.clearOpenHoverTimeout();

        this.openHoverTimeout = setTimeout(() => {
            this.dropdownTrigger.set(true);
            this.openHoverTimeout = null;
        }, this.hoverOpenDelayMs);
    }

    hideDropdown() {
        this.clearOpenHoverTimeout();
        this.dropdownTrigger.set(false);
        this.closed.emit();
    }

    private clearOpenHoverTimeout(): void {
        if (!this.openHoverTimeout) {
            return;
        }

        clearTimeout(this.openHoverTimeout);
        this.openHoverTimeout = null;
    }
}
