import {MigrationInterface, QueryRunner} from "typeorm";

export class InitBaseline1787797766625 implements MigrationInterface {
    name = 'InitBaseline1787797766625'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "movie" ("id" SERIAL NOT NULL, "tmdbId" integer NOT NULL, "title" character varying NOT NULL, "state" character varying NOT NULL DEFAULT 'searching', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e67ea82f6973f5b9a6747fba346" UNIQUE ("tmdbId"), CONSTRAINT "PK_cb3bb4d61cf764dc035cbedd422" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e67ea82f6973f5b9a6747fba34" ON "movie" ("tmdbId") `);
        await queryRunner.query(`CREATE INDEX "IDX_f4defdfacd66a084e7d6c3c2f3" ON "movie" ("state") `);
        await queryRunner.query(`CREATE TABLE "tv_show" ("id" SERIAL NOT NULL, "tmdbId" integer NOT NULL, "title" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_116f9643ed78cd2eda697e9d4ad" UNIQUE ("tmdbId"), CONSTRAINT "PK_f1c243400f03d802cd41d81cdf5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_116f9643ed78cd2eda697e9d4a" ON "tv_show" ("tmdbId") `);
        await queryRunner.query(`CREATE TABLE "tv_season" ("id" SERIAL NOT NULL, "seasonNumber" integer NOT NULL, "state" character varying NOT NULL DEFAULT 'searching', "tvShowId" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_2e551a6867c2b88dc184d9742a3" UNIQUE ("seasonNumber", "tvShowId"), CONSTRAINT "PK_4ac9dd74095ad4721ffb45cba7b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d3eed135b5894ac77981ab6170" ON "tv_season" ("state") `);
        await queryRunner.query(`CREATE TABLE "tv_episode" ("id" SERIAL NOT NULL, "episodeNumber" integer NOT NULL, "seasonNumber" integer NOT NULL, "state" character varying NOT NULL DEFAULT 'searching', "seasonId" integer NOT NULL, "tvShowId" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_191ce7f16eac2ae4ced462fc1e8" UNIQUE ("episodeNumber", "seasonNumber", "tvShowId"), CONSTRAINT "PK_930dde0fcfc177e438e41ef7d70" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c4fa72ab21716f301e91f9d911" ON "tv_episode" ("state") `);
        await queryRunner.query(`CREATE TABLE "file" ("id" SERIAL NOT NULL, "path" character varying NOT NULL, "tvEpisodeId" integer, "movieId" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_068984316f2b10a398fcdef59cb" UNIQUE ("path"), CONSTRAINT "PK_36b46d232307066b3a2c9ea3a1d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "parameter" ("id" SERIAL NOT NULL, "key" character varying NOT NULL, "value" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_75998d59c18b9fc4de000c47d8d" UNIQUE ("key"), CONSTRAINT "PK_cc5c047040f9c69f0e0d6a844a0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_75998d59c18b9fc4de000c47d8" ON "parameter" ("key") `);
        await queryRunner.query(`CREATE TYPE "quality_type_enum" AS ENUM('TvShow', 'Movie')`);
        await queryRunner.query(`CREATE TABLE "quality" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "match" text NOT NULL, "score" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "type" "quality_type_enum" NOT NULL DEFAULT 'Movie', CONSTRAINT "PK_de46699eb30a39f7d9000ec9ad5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "tag" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "score" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_6a9775008add570dc3e5a0bab7b" UNIQUE ("name"), CONSTRAINT "PK_8e4052373c579afc1471f526760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "torrent" ("id" SERIAL NOT NULL, "torrentHash" character varying NOT NULL, "resourceType" character varying NOT NULL, "quality" character varying NOT NULL DEFAULT 'unknown', "tag" character varying NOT NULL DEFAULT 'unknown', "resourceId" integer NOT NULL, "completed" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_4e1186fc9ab3a13490f0712c2d1" UNIQUE ("torrentHash"), CONSTRAINT "PK_a3cc65f26956bdde3fd43939028" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_4e1186fc9ab3a13490f0712c2d" ON "torrent" ("torrentHash") `);
        await queryRunner.query(`CREATE INDEX "IDX_26822e6ed756af8798330f1344" ON "torrent" ("resourceType") `);
        await queryRunner.query(`CREATE INDEX "IDX_ce16148570f66044657cac2b2e" ON "torrent" ("resourceId") `);
        await queryRunner.query(`ALTER TABLE "tv_season" ADD CONSTRAINT "FK_bb40cc02b25ee5d3e8ada38f555" FOREIGN KEY ("tvShowId") REFERENCES "tv_show"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tv_episode" ADD CONSTRAINT "FK_b6951506efd4798f051adf36624" FOREIGN KEY ("seasonId") REFERENCES "tv_season"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tv_episode" ADD CONSTRAINT "FK_e50534ae2865f2d123db825d650" FOREIGN KEY ("tvShowId") REFERENCES "tv_show"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "file" ADD CONSTRAINT "FK_7c9e88d7db40470c88e7ab424dd" FOREIGN KEY ("movieId") REFERENCES "movie"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "file" ADD CONSTRAINT "FK_5be34ec15310eaf7aeb4c07b590" FOREIGN KEY ("tvEpisodeId") REFERENCES "tv_episode"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE VIEW "media_view" AS 
    SELECT
      'movie-' || id::text as id,
      id as "resourceId",
      title,
      'movie' as "resourceType",
      state
    FROM
      movie
    UNION ALL
    SELECT
      'season-' || tv_season.id::text as id,
      tv_season.id as "resourceId",
      tv_show.title || ' - Season ' || "seasonNumber"::text as title,
      'season' as "resourceType",
      tv_season.state
    FROM
      tv_season
      LEFT JOIN tv_show ON tv_season."tvShowId" = tv_show.id
    UNION ALL
    SELECT
      'episode-' || tv_episode.id::text as id,
      tv_episode.id as "resourceId",
      tv_show.title || ' - Season ' || "seasonNumber"::text || ' - Episode ' || "episodeNumber"::text as title,
      'episode' as "resourceType",
      tv_episode.state
    FROM
      tv_episode
      LEFT JOIN tv_show ON tv_episode."tvShowId" = tv_show.id
`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("type", "schema", "name", "value") VALUES ($1, $2, $3, $4)`, ["VIEW","public","media_view","SELECT\n      'movie-' || id::text as id,\n      id as \"resourceId\",\n      title,\n      'movie' as \"resourceType\",\n      state\n    FROM\n      movie\n    UNION ALL\n    SELECT\n      'season-' || tv_season.id::text as id,\n      tv_season.id as \"resourceId\",\n      tv_show.title || ' - Season ' || \"seasonNumber\"::text as title,\n      'season' as \"resourceType\",\n      tv_season.state\n    FROM\n      tv_season\n      LEFT JOIN tv_show ON tv_season.\"tvShowId\" = tv_show.id\n    UNION ALL\n    SELECT\n      'episode-' || tv_episode.id::text as id,\n      tv_episode.id as \"resourceId\",\n      tv_show.title || ' - Season ' || \"seasonNumber\"::text || ' - Episode ' || \"episodeNumber\"::text as title,\n      'episode' as \"resourceType\",\n      tv_episode.state\n    FROM\n      tv_episode\n      LEFT JOIN tv_show ON tv_episode.\"tvShowId\" = tv_show.id"]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = 'VIEW' AND "schema" = $1 AND "name" = $2`, ["public","media_view"]);
        await queryRunner.query(`DROP VIEW "media_view"`);
        await queryRunner.query(`ALTER TABLE "file" DROP CONSTRAINT "FK_5be34ec15310eaf7aeb4c07b590"`);
        await queryRunner.query(`ALTER TABLE "file" DROP CONSTRAINT "FK_7c9e88d7db40470c88e7ab424dd"`);
        await queryRunner.query(`ALTER TABLE "tv_episode" DROP CONSTRAINT "FK_e50534ae2865f2d123db825d650"`);
        await queryRunner.query(`ALTER TABLE "tv_episode" DROP CONSTRAINT "FK_b6951506efd4798f051adf36624"`);
        await queryRunner.query(`ALTER TABLE "tv_season" DROP CONSTRAINT "FK_bb40cc02b25ee5d3e8ada38f555"`);
        await queryRunner.query(`DROP INDEX "IDX_ce16148570f66044657cac2b2e"`);
        await queryRunner.query(`DROP INDEX "IDX_26822e6ed756af8798330f1344"`);
        await queryRunner.query(`DROP INDEX "IDX_4e1186fc9ab3a13490f0712c2d"`);
        await queryRunner.query(`DROP TABLE "torrent"`);
        await queryRunner.query(`DROP TABLE "tag"`);
        await queryRunner.query(`DROP TABLE "quality"`);
        await queryRunner.query(`DROP TYPE "quality_type_enum"`);
        await queryRunner.query(`DROP INDEX "IDX_75998d59c18b9fc4de000c47d8"`);
        await queryRunner.query(`DROP TABLE "parameter"`);
        await queryRunner.query(`DROP TABLE "file"`);
        await queryRunner.query(`DROP INDEX "IDX_c4fa72ab21716f301e91f9d911"`);
        await queryRunner.query(`DROP TABLE "tv_episode"`);
        await queryRunner.query(`DROP INDEX "IDX_d3eed135b5894ac77981ab6170"`);
        await queryRunner.query(`DROP TABLE "tv_season"`);
        await queryRunner.query(`DROP INDEX "IDX_116f9643ed78cd2eda697e9d4a"`);
        await queryRunner.query(`DROP TABLE "tv_show"`);
        await queryRunner.query(`DROP INDEX "IDX_f4defdfacd66a084e7d6c3c2f3"`);
        await queryRunner.query(`DROP INDEX "IDX_e67ea82f6973f5b9a6747fba34"`);
        await queryRunner.query(`DROP TABLE "movie"`);
    }

}
