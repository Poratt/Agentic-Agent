import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('user_matching_preferences')
export class UserMatchingPreferences {
    @PrimaryColumn()
    userId!: number;

    @Column({ type: 'json', nullable: true })
    prefs!: Record<string, string> | null;

    @Column({ type: 'json', nullable: true })
    weights!: { terpene: number; genetics: number } | null;

    @UpdateDateColumn()
    updatedAt!: Date;
}
