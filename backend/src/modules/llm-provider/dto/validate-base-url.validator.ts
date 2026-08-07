import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isSafeBaseUrl', async: false })
export class IsSafeBaseUrlConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    if (!value) return false;

    try {
      const parsed = new URL(value);

      // In non-production (local dev), allow http:// and private/local hosts so
      // the admin can point a provider at http://localhost:<port>/v1.
      const isDev = process.env.NODE_ENV !== 'production';
      if (isDev) return true;

      // Production: https only
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
    return 'baseUrl must be a valid https URL. Private/internal addresses (127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x, localhost) and http:// are not allowed.';
  }
}

export function IsSafeBaseUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafeBaseUrlConstraint,
    });
  };
}
