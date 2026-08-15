import { Module } from "@nestjs/common";
import { ItemGroupsService } from "./item-groups.service";
import { ItemGroupsController } from "./item-groups.controller";

@Module({
  providers: [ItemGroupsService],
  controllers: [ItemGroupsController],
  exports: [ItemGroupsService],
})
export class ItemGroupsModule {}
