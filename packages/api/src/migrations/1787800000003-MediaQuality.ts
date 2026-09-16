import { MigrationInterface, QueryRunner } from "typeorm";

export class MediaQuality1787800000003 implements MigrationInterface {
    name = 'MediaQuality1787800000003'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "movie" ADD "qualityId" integer`);
        await queryRunner.query(`ALTER TABLE "tv_show" ADD "qualityId" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tv_show" DROP COLUMN "qualityId"`);
        await queryRunner.query(`ALTER TABLE "movie" DROP COLUMN "qualityId"`);
    }

}
