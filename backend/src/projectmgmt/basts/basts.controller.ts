import { Body, Controller, Get, Param, ParseIntPipe, Post, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { BastsService } from "./basts.service";
import { CreateBastDto } from "./dto/create-bast.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard)
@Controller("basts")
export class BastsController {
  constructor(private service: BastsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateBastDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }

  @Get(":id/print")
  async print(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthUser, @Res() res: Response) {
    const pdf = await this.service.renderPdf(id, user.id);
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="bast-${id}.pdf"` });
    res.send(pdf);
  }
}
