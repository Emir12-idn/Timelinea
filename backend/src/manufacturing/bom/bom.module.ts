import { Module } from "@nestjs/common";
import { BomService } from "./bom.service";
import { BomController } from "./bom.controller";

@Module({
  providers: [BomService],
  controllers: [BomController],
  exports: [BomService],
})
export class BomModule {}
