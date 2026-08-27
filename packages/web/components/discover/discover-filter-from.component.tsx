import React, { useMemo, useState } from 'react';

import { DiscoverFilterSectionComponent } from './discover-filter-section.component';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  GetDiscoverQueryVariables,
  useGetLanguagesQuery,
  useGetGenresQuery,
  Entertainment,
} from '../../utils/graphql';

const NO_LANGUAGE = '__none__';

interface DiscoverFilterFormComponentProps {
  params: GetDiscoverQueryVariables;
  onFinish: (formParams: GetDiscoverQueryVariables) => void;
}

export function DiscoverFilterFormComponent(
  props: DiscoverFilterFormComponentProps
) {
  const languagesQuery = useGetLanguagesQuery();
  const genresQuery = useGetGenresQuery();

  const [entertainment, setEntertainment] = useState<Entertainment>(
    props.params.entertainment ?? Entertainment.Movie
  );
  const [originLanguage, setOriginLanguage] = useState<string | undefined>(
    props.params.originLanguage ?? undefined
  );
  const [primaryReleaseYear, setPrimaryReleaseYear] = useState<
    string | undefined
  >(props.params.primaryReleaseYear ?? undefined);
  const [genres, setGenres] = useState<number[]>(props.params.genres ?? []);
  const [score, setScore] = useState<number>(props.params.score ?? 70);

  const TMDBLanguages = languagesQuery.data?.languages;

  const TMDBMovieGenres = useMemo(
    () =>
      genresQuery.data?.genres.movieGenres?.map(({ id, name }) => ({
        label: name,
        value: id,
      })),
    [genresQuery.data]
  );

  const TMDBTvShowGenres = useMemo(
    () =>
      genresQuery.data?.genres.tvShowGenres?.map(({ id, name }) => ({
        label: name,
        value: id,
      })),
    [genresQuery.data]
  );

  const genreOptions =
    entertainment === Entertainment.Movie
      ? TMDBMovieGenres
      : TMDBTvShowGenres;

  const handleEntertainmentChange = (value: Entertainment) => {
    setEntertainment(value);
    setGenres([]);
  };

  const handleGenreChange = (genreId: number, checked: boolean) => {
    setGenres((current) =>
      checked
        ? [...current, genreId]
        : current.filter((id) => id !== genreId)
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    props.onFinish({
      entertainment,
      ...(originLanguage ? { originLanguage } : {}),
      ...(primaryReleaseYear ? { primaryReleaseYear } : {}),
      ...(genres.length ? { genres } : {}),
      score,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DiscoverFilterSectionComponent>
        <div className="flex gap-6">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="entertainment"
              value={Entertainment.Movie}
              checked={entertainment === Entertainment.Movie}
              onChange={() => handleEntertainmentChange(Entertainment.Movie)}
              className="accent-primary"
            />
            Movie
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="entertainment"
              value={Entertainment.TvShow}
              checked={entertainment === Entertainment.TvShow}
              onChange={() => handleEntertainmentChange(Entertainment.TvShow)}
              className="accent-primary"
            />
            Tv Show
          </label>
        </div>
      </DiscoverFilterSectionComponent>

      <DiscoverFilterSectionComponent title="Language">
        <Select
          value={originLanguage ?? NO_LANGUAGE}
          onValueChange={(value) =>
            setOriginLanguage(value === NO_LANGUAGE ? undefined : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_LANGUAGE}>All languages</SelectItem>
            {TMDBLanguages?.map(({ language, code }) => (
              <SelectItem key={code} value={code}>
                {code === 'xx' ? 'Silent movie' : language}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </DiscoverFilterSectionComponent>

      <DiscoverFilterSectionComponent title="Release Year">
        <Input
          type="number"
          min={1900}
          max={2100}
          value={primaryReleaseYear ?? ''}
          onChange={({ target }) =>
            setPrimaryReleaseYear(target.value || undefined)
          }
          placeholder="Year"
          className="w-full"
        />
      </DiscoverFilterSectionComponent>

      <DiscoverFilterSectionComponent title="Genres">
        <div className="flex flex-col gap-1.5">
          {genreOptions?.map(({ label, value }) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                checked={genres.includes(value)}
                onCheckedChange={(checked) =>
                  handleGenreChange(value, checked === true)
                }
              />
              {label}
            </label>
          ))}
        </div>
      </DiscoverFilterSectionComponent>

      <DiscoverFilterSectionComponent title="Minimum Score">
        <div className="flex items-center gap-3">
          <Slider
            value={[score]}
            onValueChange={([value]) => setScore(value)}
            min={0}
            max={100}
            step={1}
          />
          <span className="w-10 shrink-0 text-right text-sm text-muted-foreground">
            {score}%
          </span>
        </div>
      </DiscoverFilterSectionComponent>

      <Button type="submit" className="w-full">
        Search
      </Button>
    </form>
  );
}
