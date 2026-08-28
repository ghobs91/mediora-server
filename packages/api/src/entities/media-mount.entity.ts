import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MediaMountAccessType {
  READ_WRITE = 'read_write',
  READ_ONLY = 'read_only',
}

registerEnumType(MediaMountAccessType, { name: 'MediaMountAccessType' });

export enum MediaMountState {
  READY = 'ready',
  MISSING = 'missing',
  NOT_DIRECTORY = 'not_directory',
  INACCESSIBLE = 'inaccessible',
  READ_ONLY = 'read_only',
}

registerEnumType(MediaMountState, { name: 'MediaMountState' });

@Entity()
@ObjectType()
export class MediaMount {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  public id!: number;

  @Field()
  @Column({ unique: true })
  public path!: string;

  @Field({ nullable: true })
  @Column('varchar', { nullable: true })
  public label!: string | null;

  @Field(() => MediaMountAccessType)
  @Column({ default: MediaMountAccessType.READ_WRITE })
  public accessType!: MediaMountAccessType;

  @Field(() => MediaMountState)
  @Column({ default: MediaMountState.MISSING })
  public state!: MediaMountState;

  @Field({ nullable: true })
  @Column('varchar', { nullable: true })
  public errorMessage!: string | null;

  @Field()
  @CreateDateColumn()
  public createdAt!: Date;

  @Field()
  @UpdateDateColumn()
  public updatedAt!: Date;
}
