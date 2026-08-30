import { MigrationInterface, QueryRunner } from "typeorm";

export class Monitored1787800000001 implements MigrationInterface {
    name = 'Monitored1787800000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tv_season" ADD "monitored" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tv_season" DROP COLUMN "monitored"`);
    }

}
