import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ItemGroupsService } from "./item-groups.service";
import { CreateItemGroupDto } from "./dto/create-item-group.dto";
import { UpdateItemGroupDto } from "./dto/update-item-group.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller("item-groups")
export class ItemGroupsController {
  constructor(private service: ItemGroupsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateItemGroupDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateItemGroupDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
