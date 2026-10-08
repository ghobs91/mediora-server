import { Repository } from 'typeorm';

import { File } from '../file.entity';
import { FileDAO } from './file.dao';

describe('FileDAO.upsertByPath', () => {
  let repository: jest.Mocked<Pick<Repository<File>, 'findOne' | 'save'>>;
  let dao: FileDAO;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Pick<Repository<File>, 'findOne' | 'save'>>;
    dao = new FileDAO(repository as unknown as Repository<File>);
  });

  it('updates the existing row instead of inserting a duplicate path', async () => {
    repository.findOne.mockResolvedValue({ id: 42, path: '/lib/x.mkv' } as File);
    repository.save.mockImplementation((entity: any) => Promise.resolve(entity));

    await dao.upsertByPath({ path: '/lib/x.mkv', tvEpisodeId: 7 });

    expect(repository.save).toHaveBeenCalledWith({
      id: 42,
      path: '/lib/x.mkv',
      tvEpisodeId: 7,
    });
  });

  it('inserts a new row when the path is not tracked yet', async () => {
    repository.findOne.mockResolvedValue(null);
    repository.save.mockImplementation((entity: any) => Promise.resolve(entity));

    await dao.upsertByPath({ path: '/lib/y.mkv', movieId: 3 });

    expect(repository.save).toHaveBeenCalledWith({
      path: '/lib/y.mkv',
      movieId: 3,
    });
  });
});
