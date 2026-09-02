import React, { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import dayjs from 'dayjs';

import {
  TmdbSearchResult,
  EnrichedMovie,
  EnrichedTvShow,
} from '../../utils/graphql';

import { getImageURL } from '../../utils/get-cached-image-url';

import { TVShowSeasonsModalComponent } from '../tvshow-details/tvshow-details.component';
import { MovieDetailsComponent } from '../movie-details/movie-details.component';
import { RatingComponent } from '../rating/rating.component';
import { EpisodeProgressComponent } from '../episode-progress/episode-progress.component';

interface TMDBCardComponentProps {
  type: 'tvshow' | 'movie';
  result: TmdbSearchResult | EnrichedMovie | EnrichedTvShow;
  inLibrary?: boolean;
}

export function TMDBCardComponent(props: TMDBCardComponentProps) {
  const { result, type, inLibrary } = props;
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="relative w-[220px] shrink-0">
      {/* display season picker modal when it's tvshow */}
      {type === 'tvshow' && isModalOpen && (
        <TVShowSeasonsModalComponent
          tvShow={result as TmdbSearchResult}
          visible={isModalOpen}
          inLibrary={inLibrary}
          onRequestClose={() => setIsModalOpen(false)}
        />
      )}

      {/* display movie details */}
      {type === 'movie' && isModalOpen && (
        <MovieDetailsComponent
          movie={result as TmdbSearchResult}
          visible={isModalOpen}
          inLibrary={inLibrary}
          onRequestClose={() => setIsModalOpen(false)}
        />
      )}

      <div
        className="group relative mb-6 aspect-[2/3] w-[220px] cursor-pointer overflow-hidden rounded-xl bg-muted"
        onClick={() => setIsModalOpen(true)}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${getImageURL(
              `w220_and_h330_face${result.posterPath}`
            )})`,
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 opacity-0 transition-opacity duration-100 group-hover:opacity-100">
          <FolderOpen className="text-white" size={32} />
          <div className="mt-2.5 font-mono text-sm font-black uppercase text-white">
            See details
          </div>
        </div>
      </div>

      {type === 'tvshow' && 'episodesTotal' in result ? (
        <div className="absolute left-[14px] top-[310px]">
          <EpisodeProgressComponent
            downloaded={result.episodesDownloaded ?? 0}
            total={result.episodesTotal ?? 0}
          />
        </div>
      ) : (
        <div className="absolute left-[14px] top-[310px]">
          <RatingComponent rating={result.voteAverage * 10} />
        </div>
      )}

      <div className="font-bold">{result.title}</div>
      {result.releaseDate && (
        <div className="text-xs font-light lowercase text-muted-foreground">
          {dayjs(result.releaseDate).format('DD MMM YYYY')}
        </div>
      )}
    </div>
  );
}
