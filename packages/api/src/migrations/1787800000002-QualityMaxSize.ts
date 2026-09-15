import { MigrationInterface, QueryRunner } from "typeorm";

export class QualityMaxSize1787800000002 implements MigrationInterface {
    name = 'QualityMaxSize1787800000002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quality" ADD "maxSize" bigint`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quality" DROP COLUMN "maxSize"`);
    }

}
