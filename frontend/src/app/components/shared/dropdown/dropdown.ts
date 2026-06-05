import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-dropdown',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './dropdown.html',
    styleUrl: './dropdown.css',
})
export class Dropdown {
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

    showDropdown() {
        this.dropdownTrigger.set(true);
    }

    hideDropdown() {
        this.dropdownTrigger.set(false);
        this.closed.emit();
    }
}