import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class BaseDTO {
  @Field(() => String)
  public id!: string;

  @Field(() => Boolean)
  public isAvailable!: boolean;
}
