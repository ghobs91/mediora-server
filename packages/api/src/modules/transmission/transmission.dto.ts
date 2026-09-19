import { ObjectType, Field, Int, Float, InputType } from '@nestjs/graphql';
import BigInt from 'src/utils/big-int.scalar';
import { FileType } from 'src/app.dto';

@ObjectType()
export class TorrentStatus {
  @Field((_type) => Int) public id!: number;
  @Field((_type) => Int) public resourceId!: number;
  @Field((_type) => FileType) public resourceType!: FileType;
  @Field((_type) => Float) public percentDone!: number;
  @Field((_type) => Int) public rateDownload!: number;
  @Field((_type) => Int) public rateUpload!: number;
  @Field((_type) => Float) public uploadRatio!: number;
  @Field((_type) => BigInt) public uploadedEver!: number;
  @Field((_type) => BigInt) public totalSize!: number;
  @Field((_type) => Int) public status!: number;
}

// Raw Transmission torrent, used by the Downloads tab so it can act as a
// standalone Transmission client (every torrent, tracked by mediora or not).
@ObjectType()
export class TransmissionTorrent {
  @Field() public hashString!: string;
  @Field((_type) => Int) public id!: number;
  @Field() public name!: string;
  @Field((_type) => Int) public status!: number;
  @Field((_type) => Int) public error!: number;
  @Field({ nullable: true }) public errorString?: string;
  @Field((_type) => Float) public percentDone!: number;
  @Field((_type) => Int) public rateDownload!: number;
  @Field((_type) => Int) public rateUpload!: number;
  @Field((_type) => Float) public uploadRatio!: number;
  @Field((_type) => BigInt) public downloadedEver!: number;
  @Field((_type) => BigInt) public uploadedEver!: number;
  @Field((_type) => BigInt) public totalSize!: number;
  @Field((_type) => BigInt) public sizeWhenDone!: number;
  @Field((_type) => BigInt) public leftUntilDone!: number;
  @Field((_type) => Int) public eta!: number;
  @Field((_type) => Int) public addedDate!: number;
  @Field((_type) => Int) public doneDate!: number;
  @Field() public isFinished!: boolean;
  @Field((_type) => Int) public peersConnected!: number;
  @Field((_type) => Int) public peersSendingToUs!: number;
  @Field((_type) => Int) public peersGettingFromUs!: number;
  @Field() public downloadDir!: string;
}

@InputType()
export class GetTorrentStatusInput {
  @Field((_type) => Int) public resourceId!: number;
  @Field((_type) => FileType) public resourceType!: FileType;
}

@InputType()
export class ControlTorrentInput {
  @Field((_type) => Int) public resourceId!: number;
  @Field((_type) => FileType) public resourceType!: FileType;
}
