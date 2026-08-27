import { recursiveCamelCase } from './recursive-camel-case';

describe('recursiveCamelCase', () => {
  it('camel-cases object keys', () => {
    expect(recursiveCamelCase({ first_name: 'John', last_name: 'Doe' })).toEqual(
      { firstName: 'John', lastName: 'Doe' }
    );
  });

  it('recurses through nested objects', () => {
    expect(
      recursiveCamelCase({
        user_data: {
          birth_date: '1990-01-01',
          home_address: { street_name: 'main' },
        },
      })
    ).toEqual({
      userData: { birthDate: '1990-01-01', homeAddress: { streetName: 'main' } },
    });
  });

  it('camel-cases keys inside arrays of objects', () => {
    expect(
      recursiveCamelCase([
        { movie_title: 'Alien' },
        { movie_title: 'Aliens' },
      ])
    ).toEqual([{ movieTitle: 'Alien' }, { movieTitle: 'Aliens' }]);
  });

  it('leaves strings and numbers untouched', () => {
    // the public signature only accepts objects, but the runtime
    // transforms strings and numbers as a no-op
    expect(recursiveCamelCase('hello' as any)).toEqual('hello');
    expect(recursiveCamelCase(42 as any)).toEqual(42);
  });

  it('does not mutate the original object', () => {
    const original = { movie_title: 'Alien' };
    recursiveCamelCase(original);
    expect(original).toEqual({ movie_title: 'Alien' });
  });
});
