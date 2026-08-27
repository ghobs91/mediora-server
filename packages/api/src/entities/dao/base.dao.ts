import {
  DeepPartial,
  DeleteResult,
  FindManyOptions,
  FindOneOptions,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

export abstract class BaseDAO<Entity extends ObjectLiteral> {
  public constructor(public readonly repository: Repository<Entity>) {}

  public find(options?: FindManyOptions<Entity>): Promise<Entity[]> {
    return this.repository.find(options);
  }

  public findOne(
    options: FindOneOptions<Entity> | DeepPartial<Entity> | number | string
  ): Promise<Entity | null> {
    if (typeof options === 'number' || typeof options === 'string') {
      return this.repository.findOne({
        where: { id: options } as unknown as FindOneOptions<Entity>['where'],
      });
    }
    if (this.isFindOptions(options)) {
      return this.repository.findOne(options);
    }
    return this.repository.findOne({
      where: options as unknown as FindOneOptions<Entity>['where'],
    });
  }

  public findOneOrFail(
    options: FindOneOptions<Entity> | DeepPartial<Entity> | number | string
  ): Promise<Entity> {
    if (typeof options === 'number' || typeof options === 'string') {
      return this.repository.findOneOrFail({
        where: { id: options } as unknown as FindOneOptions<Entity>['where'],
      });
    }
    if (this.isFindOptions(options)) {
      return this.repository.findOneOrFail(options);
    }
    return this.repository.findOneOrFail({
      where: options as unknown as FindOneOptions<Entity>['where'],
    });
  }

  private isFindOptions(
    options: FindOneOptions<Entity> | DeepPartial<Entity>
  ): options is FindOneOptions<Entity> {
    return (
      options !== null &&
      typeof options === 'object' &&
      ('where' in options || 'relations' in options || 'order' in options)
    );
  }

  public save<T extends DeepPartial<Entity>>(entity: T): Promise<T & Entity>;
  public save<T extends DeepPartial<Entity>>(entity: T[]): Promise<(T & Entity)[]>;
  public save<T extends DeepPartial<Entity>>(
    entity: T | T[]
  ): Promise<(T & Entity) | (T & Entity)[]> {
    return this.repository.save(entity as any);
  }

  public delete(
    criteria:
      | string
      | string[]
      | number
      | number[]
      | Record<string, unknown>
  ): Promise<DeleteResult> {
    return this.repository.delete(criteria as any);
  }

  public remove(entity: Entity | Entity[]): Promise<Entity | Entity[]> {
    return this.repository.remove(entity as any);
  }

  public createQueryBuilder(alias: string): SelectQueryBuilder<Entity> {
    return this.repository.createQueryBuilder(alias);
  }
}