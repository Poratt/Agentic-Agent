import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiExtension } from '@nestjs/swagger';

export const REQUIRES_CONFIRMATION_KEY = 'requires_confirmation';

/**
 * Marks a controller method as requiring human confirmation before execution.
 *
 * This decorator does two things:
 * 1. Writes `requires_confirmation: true` via NestJS metadata (SetMetadata) —
 *    available for runtime checks via Reflector if needed.
 * 2. Emits `x-requires-confirmation: true` into the Swagger/OpenAPI spec
 *    (via ApiExtension) — this is how the SwaggerToolsParser discovers
 *    which operations are dangerous and should go through the confirmation flow.
 *
 * Before this fix, only SetMetadata was used, but the parser reads from the
 * swagger-spec.json `x-requires-confirmation` key — causing a silent mismatch
 * where no operation was ever flagged as dangerous. The boot assertion in
 * main.ts verifies that every marked operationId appears in the spec.
 */
export const RequiresConfirmation = () =>
  applyDecorators(
    SetMetadata('requires_confirmation', true),
    ApiExtension('x-requires-confirmation', true),
  );
