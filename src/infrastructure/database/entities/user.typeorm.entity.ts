// src/infrastructure/database/entities/user.typeorm.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';
import { UserRole } from '../../../shared/constants/roles';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['lastLoginAt'])
@Index(['lockedUntil'])
export class UserTypeOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
    enumName: 'user_role',
    comment: 'Rol del usuario: admin, user, doctor'
  })
  role!: UserRole;

  @Column({ default: false })
  isActive!: boolean;

  @Column({ 
    type: 'varchar', 
    length: 100, 
    nullable: true 
  })
  verificationCode?: string | null;

  // Campos de autenticación
  @Column({ 
    type: 'datetime', 
    nullable: true,
    name: 'last_login_at'
  })
  lastLoginAt?: Date | null;

  @Column({ 
    default: 0,
    name: 'login_attempts'
  })
  loginAttempts!: number;

  @Column({ 
    type: 'datetime', 
    nullable: true,
    name: 'locked_until'
  })
  lockedUntil?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt?: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date | null;
}