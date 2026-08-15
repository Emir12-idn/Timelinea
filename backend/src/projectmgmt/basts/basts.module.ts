import { Module } from "@nestjs/common";
import { BastsService } from "./basts.service";
import { BastsController } from "./basts.controller";

@Module({
  providers: [BastsService],
  controllers: [BastsController],
  exports: [BastsService],
})
export class BastsModule {}
