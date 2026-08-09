import { Confirmation } from 'primeng/api';

export function confirmationDialogSettings(): Partial<Confirmation> {
    return {
        closeOnEscape: true,
        dismissableMask: true,
        icon: 'ph ph-warning',

        rejectButtonProps: {
            text: true,
            severity: 'primary',
            label: 'Cancel',
            size: 'small',
            icon: 'ph ph-x',
        },
        acceptButtonProps: {
            text: true,
            severity: 'danger',
            size: 'small',
            icon: 'ph ph-trash',
        },
    };




}
