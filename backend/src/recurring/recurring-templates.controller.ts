import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { RecurringDraftStatus } from "@prisma/client";
import { RecurringTemplatesService } from "./recurring-templates.service";
import { CreateRecurringTemplateDto } from "./dto/create-recurring-template.dto";
import { UpdateRecurringTemplateDto } from "./dto/update-recurring-template.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";

@UseGuards(JwtAuthGuard)
@Controller("recurring-templates")
export class RecurringTemplatesController {
  constructor(private service: RecurringTemplatesService) {}

  @Get()
  findAll(@Query("isActive") isActive?: string) {
    return this.service.findAll(isActive === undefined ? undefined : isActive === "true");
  }

  @Get("drafts")
  findDrafts(@Query("status") status?: RecurringDraftStatus) {
    return this.service.findDrafts(status);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateRecurringTemplateDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateRecurringTemplateDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  /** Dipanggil manual atau lewat scheduler eksternal (cron) — generate draft untuk semua template yang jatuh tempo. */
  @Post("run-due")
  runDue() {
    return this.service.generateDue();
  }

  @Post("drafts/:id/confirm")
  confirmDraft(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.confirmDraft(id, user.id);
  }

  @Post("drafts/:id/discard")
  discardDraft(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.discardDraft(id, user.id);
  }
}
