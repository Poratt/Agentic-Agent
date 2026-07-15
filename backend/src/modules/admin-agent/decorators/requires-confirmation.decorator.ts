import { SetMetadata } from '@nestjs/common';

export const REQUIRES_CONFIRMATION_KEY = 'requires_confirmation';

export const RequiresConfirmation = () => SetMetadata(REQUIRES_CONFIRMATION_KEY, true);
