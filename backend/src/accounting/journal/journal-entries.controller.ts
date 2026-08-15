import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { paginate } from "../../common/dto/pagination.dto";
import { ListJournalEntriesDto } from "./dto/list-journal-entries.dto";

@UseGuards(JwtAuthGuard)
@Controller("journal-entries")
export class JournalEntriesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(@Query() query: ListJournalEntriesDto) {
    const where = {
      ...(query.refType ? { refType: query.refType } : {}),
      ...(query.refId ? { refId: Number(query.refId) } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        include: { lines: { include: { account: true } } },
        orderBy: [{ date: "desc" }, { id: "desc" }],
        ...paginate(query.page, query.pageSize),
      }),
      this.prisma.journalEntry.count({ where }),
    ]);
    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.prisma.journalEntry.findUniqueOrThrow({
      where: { id },
      include: { lines: { include: { account: true } } },
    });
  }
}
