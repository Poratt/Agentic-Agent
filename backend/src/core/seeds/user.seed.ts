import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../modules/users/entities/user.entity';
import { UserRole } from '../enums/user-role.enum';


export async function seedAdmin(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(User);

  const exists = await repo.findOne({
    where: {
      email: 'admin@admin.com',
    },
  });

  if (exists) {
    return;
  }

  const hashedPassword = await bcrypt.hash('admin', 10);

  const admin = repo.create({
    email: 'admin@admin.com',
    password: hashedPassword,
    role: UserRole.Admin,
  });

  await repo.save(admin);

  console.log('Admin user seeded: admin@admin.com / admin');
}
