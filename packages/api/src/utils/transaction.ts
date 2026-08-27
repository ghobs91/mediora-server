import 'reflect-metadata';
import { DataSource, EntityManager, Repository } from 'typeorm';

const TRANSACTION_MANAGER_KEY = Symbol('transaction_manager_param');

export function TransactionManager() {
  return (
    target: object,
    methodName: string | symbol,
    parameterIndex: number
  ) => {
    const existing =
      (Reflect.getMetadata(TRANSACTION_MANAGER_KEY, target, methodName) as
        | number[]
        | undefined) ?? [];
    Reflect.defineMetadata(
      TRANSACTION_MANAGER_KEY,
      [...existing, parameterIndex],
      target,
      methodName
    );
  };
}

export interface TransactionalService {
  dataSource: DataSource;
}

function wrapWithTransaction(
  target: object,
  methodName: string | symbol,
  descriptor: PropertyDescriptor,
  lazy: boolean
) {
  const original = descriptor.value;

  descriptor.value = function (
    this: TransactionalService,
    ...args: unknown[]
  ) {
    const managerIndex = (
      (Reflect.getMetadata(TRANSACTION_MANAGER_KEY, target, methodName) as
        | number[]
        | undefined) ?? []
    )[0];
    const dataSource = this.dataSource;

    const run = async (manager: EntityManager) => {
      const injectedArgs = [...args];
      if (managerIndex !== undefined) {
        injectedArgs[managerIndex] = manager;
      } else {
        injectedArgs.unshift(manager);
      }
      return original.apply(this, injectedArgs);
    };

    if (lazy) {
      const existing = args.find(
        (arg) => arg instanceof EntityManager || arg instanceof Repository
      );
      if (existing) {
        return run(
          existing instanceof EntityManager ? existing : existing.manager
        );
      }
    }

    return dataSource.transaction(run);
  };

  return descriptor;
}

export function Transaction(): MethodDecorator {
  return (target, methodName, descriptor) =>
    wrapWithTransaction(target, methodName, descriptor, false);
}

export function LazyTransaction(): MethodDecorator {
  return (target, methodName, descriptor) =>
    wrapWithTransaction(target, methodName, descriptor, true);
}