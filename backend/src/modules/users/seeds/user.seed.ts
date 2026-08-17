import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User } from '../entities/user.entity';
import { UserRole } from '../../../core/enums/user-role.enum';

const ADMIN_EMAIL = 'admin@admin.com';

export async function seedAdmin(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(User);

  const exists = await repo.findOne({
    where: { email: ADMIN_EMAIL },
  });

  if (exists) {
    return;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const password = process.env.ADMIN_PASSWORD;

  if (!password && isProduction) {
    console.warn(
      `[seedAdmin] WARNING: ADMIN_PASSWORD env is not set in production. ` +
      `A random password has been generated — write it down and consider changing it after first login.`
    );
  }

  const effectivePassword = password
    || (isProduction ? randomBytes(16).toString('hex') : 'changeme');

  const hashedPassword = await bcrypt.hash(effectivePassword, 10);

  const admin = repo.create({
    email: ADMIN_EMAIL,
    password: hashedPassword,
    role: UserRole.Admin,
  });

  await repo.save(admin);

  // Only print the password when one was auto-generated (no env var).
  // Never print it when the user explicitly set ADMIN_PASSWORD.
  if (!password) {
    console.log(`[seedAdmin] Admin user created: ${ADMIN_EMAIL} / ${effectivePassword}`);
    console.warn(`[seedAdmin] Change this password immediately — it was auto-generated.`);
  } else {
    console.log(`[seedAdmin] Admin user created: ${ADMIN_EMAIL}`);
  }
}
