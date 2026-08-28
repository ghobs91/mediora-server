import { MigrationInterface, QueryRunner } from "typeorm";

export class MediaMounts1787800000000 implements MigrationInterface {
    name = 'MediaMounts1787800000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."media_mount_access_type_enum" AS ENUM('read_write', 'read_only')`);
        await queryRunner.query(`CREATE TYPE "public"."media_mount_state_enum" AS ENUM('ready', 'missing', 'not_directory', 'inaccessible', 'read_only')`);
        await queryRunner.query(`CREATE TABLE "media_mount" ("id" SERIAL NOT NULL, "path" character varying NOT NULL, "label" character varying, "accessType" "public"."media_mount_access_type_enum" NOT NULL DEFAULT 'read_write', "state" "public"."media_mount_state_enum" NOT NULL DEFAULT 'missing', "errorMessage" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8a5e931e1a8bc6d1f7c3e4b5a6d" UNIQUE ("path"), CONSTRAINT "PK_9c4e2f1a0b3d5e7f9a1c3b5d7e9" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "media_mount"`);
        await queryRunner.query(`DROP TYPE "public"."media_mount_state_enum"`);
        await queryRunner.query(`DROP TYPE "public"."media_mount_access_type_enum"`);
    }

}
