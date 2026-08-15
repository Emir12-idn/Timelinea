import { Module } from "@nestjs/common";
import { FixedAssetsService } from "./fixed-assets.service";
import { FixedAssetsController } from "./fixed-assets.controller";

@Module({
  providers: [FixedAssetsService],
  controllers: [FixedAssetsController],
  exports: [FixedAssetsService],
})
export class FixedAssetsModule {}
