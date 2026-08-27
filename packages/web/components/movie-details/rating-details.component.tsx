import React from 'react';
import {
  useOmdbSearchQuery,
  TmdbSearchResult,
  EnrichedMovie,
} from '../../utils/graphql';

export const RatingDetailComponent = ({
  entertainment,
}: {
  entertainment: TmdbSearchResult | EnrichedMovie;
}) => {
  const { data } = useOmdbSearchQuery({
    variables: { title: entertainment.title },
  });

  const ratings = data?.result.ratings;

  const allRatings = {
    TMDB: `${entertainment.voteAverage * 10}%`,
    IMDB: ratings?.IMDB,
    rottenTomatoes: ratings?.rottenTomatoes,
    metaCritic: ratings?.metaCritic,
  };

  return (
    <div className="flex flex-wrap items-center">
      {Object.entries(allRatings).map(([key, value], index) => {
        const rate = value?.split(/(?=[%, /])/);

        if (!rate) return null;

        return (
          <div
            key={`${entertainment.tmdbId}${index}`}
            className="flex items-center pr-5"
          >
            <img
              src={`/assets/rating/${key}.png`}
              alt={key}
              className="mr-1.5 h-[30px] w-[30px]"
            />
            <span className="text-xl">{rate?.[0]}</span>
            <span className="text-sm opacity-60">{rate?.[1]}</span>
          </div>
        );
      })}
    </div>
  );
};
