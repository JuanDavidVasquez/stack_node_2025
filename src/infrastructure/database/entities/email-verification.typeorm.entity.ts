// src/infrastructure/database/entities/email-verification.typeorm.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('email_verifications')
@Index(['email', 'verificationCode'], { unique: false })
@Index(['email', 'isUsed', 'expiresAt'])
export class EmailVerificationTypeOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  @Index()
  email!: string;

  @Column({ length: 6, name: 'verification_code' })
  verificationCode!: string;

  @Column({ default: false, name: 'is_used' })
  isUsed!: boolean;

  @Column({ type: 'datetime', name: 'expires_at' })
  @Index()
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ type: 'datetime', nullable: true, name: 'used_at' })
  usedAt?: Date | null;
}
