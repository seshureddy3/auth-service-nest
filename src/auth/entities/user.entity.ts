import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', select: false })
  password!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status!: UserStatus;

  @Column({ type: 'varchar', length: 6, nullable: true, select: false })
  otpCode!: string | null;

  @Column({ type: 'timestamp', nullable: true, select: false })
  otpExpiresAt!: Date | null;

  @Column({ type: 'varchar', nullable: true, select: false })
  invitationToken!: string | null;

  @Column({ type: 'timestamp', nullable: true, select: false })
  invitationExpiresAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp without time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp without time zone' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deletedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  deletedBy!: string;
}
