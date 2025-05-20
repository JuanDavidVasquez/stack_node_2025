// src/infrastructure/database/entities/user.typeorm.entity.ts (corregido final)
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { UserRole } from '../../../shared/constants/roles';


@Entity('users')
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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt?: Date;

  @DeleteDateColumn()
  deletedAt?: Date | null;
}