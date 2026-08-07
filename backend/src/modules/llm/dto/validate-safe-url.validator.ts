import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Sync validator for user-controlled download URLs (e.g. extendVideo sourceVideoUrl).
 *
 * Fast checks only (no DNS): https-only + hostname blocklist + private-range match.
 * The authoritative DNS-based check happens at runtime via `assertSafeUrl`
 * (backend/src/core/utils/ssrf-guard.util.ts) right before the fetch.
 */
@ValidatorConstraint({ name: 'isSafeUrl', async: false })
export class IsSafeUrlConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    if (!value) return false;

    try {
      const parsed = new URL(value);

      // https only
      if (parsed.protocol.replace(':', '') !== 'https') return false;

      const hostname = parsed.hostname.toLowerCase();

      // Blocked hostnames
      const blocked = [
        'localhost', '127.0.0.1', '0.0.0.0', '::1',
        '169.254.169.254', 'metadata.google.internal',
      ];
      if (blocked.includes(hostname)) return false;

      // Private IP ranges in hostname (fast string match)
      const privateRanges = [
        /^10\./, /^172\.(1[6-9]|2\d|3[01])\./,
        /^192\.168\./, /^127\./, /^169\.254\./, /^0\.0\.0\.0/,
      ];
      if (privateRanges.some((r) => r.test(hostname))) return false;

      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(): string {
    return 'sourceVideoUrl must be a valid public https URL. Private/internal addresses (127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x, localhost) and http:// are not allowed.';
  }
}

export function IsSafeUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafeUrlConstraint,
    });
  };
}
