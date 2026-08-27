import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum LibraryFolderState {
  READY = 'ready',
  MISSING = 'missing',
  NOT_DIRECTORY = 'not_directory',
  INACCESSIBLE = 'inaccessible',
  READ_ONLY = 'read_only',
}

registerEnumType(LibraryFolderState, { name: 'LibraryFolderState' });

@ObjectType()
export class LibraryFolderStatus {
  @Field()
  public type!: string;

  @Field()
  public name!: string;

  @Field()
  public path!: string;

  @Field(() => LibraryFolderState)
  public state!: LibraryFolderState;

  @Field()
  public exists!: boolean;

  @Field()
  public isDirectory!: boolean;

  @Field()
  public canRead!: boolean;

  @Field()
  public canWrite!: boolean;

  @Field()
  public canTraverse!: boolean;

  @Field()
  public canCreate!: boolean;

  @Field({ nullable: true })
  public mode!: string | null;

  @Field(() => Int, { nullable: true })
  public ownerUid!: number | null;

  @Field(() => Int, { nullable: true })
  public ownerGid!: number | null;

  @Field()
  public message!: string;

  @Field({ nullable: true })
  public remedy!: string | null;
}

@ObjectType()
export class LibraryFoldersStatus {
  @Field(() => LibraryFolderStatus)
  public mount!: LibraryFolderStatus;

  @Field(() => Int, { nullable: true })
  public processUid!: number | null;

  @Field(() => Int, { nullable: true })
  public processGid!: number | null;

  @Field()
  public processRunsAsRoot!: boolean;

  @Field(() => [LibraryFolderStatus])
  public folders!: LibraryFolderStatus[];
}
