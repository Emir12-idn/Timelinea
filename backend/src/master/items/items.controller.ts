import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { ItemsService } from "./items.service";
import { CreateItemDto } from "./dto/create-item.dto";
import { UpdateItemDto } from "./dto/update-item.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard)
@Controller("items")
export class ItemsController {
  constructor(private service: ItemsService) {}

  @Get()
  findAll(@Query("q") q?: string) {
    return this.service.findAll(q);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get(":id/stock")
  stockOnHand(@Param("id", ParseIntPipe) id: number) {
    return this.service.stockOnHand(id);
  }

  @Post()
  create(@Body() dto: CreateItemDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateItemDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  /** §11 data design, item 4 — import CSV (upsert per kolom `code`). */
  @Post("import")
  @UseInterceptors(FileInterceptor("file"))
  importCsv(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
    if (!file) throw new BadRequestException("File CSV wajib diunggah (field 'file')");
    return this.service.importCsv(file.buffer.toString("utf-8"), user.id);
  }

  @Get("export/csv")
  async exportCsv(@Res() res: Response) {
    const csv = await this.service.exportCsv();
    res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="items.csv"' });
    res.send(csv);
  }
}
