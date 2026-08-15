import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NumberingService } from "../../common/numbering.service";
import { CreateBastDto } from "./dto/create-bast.dto";

@Injectable()
export class BastsService {
  constructor(
    private prisma: PrismaService,
    private numbering: NumberingService,
  ) {}

  findAll() {
    return this.prisma.bast.findMany({
      include: { customer: true, project: true, lines: true },
      orderBy: { date: "desc" },
    });
  }

  async findOne(id: number) {
    const bast = await this.prisma.bast.findUnique({
      where: { id },
      include: { customer: true, project: true, lines: { include: { item: true } }, sourceInvoice: true },
    });
    if (!bast) throw new NotFoundException("BAST tidak ditemukan");
    return bast;
  }

  async create(dto: CreateBastDto, createdBy?: number) {
    const date = new Date(dto.date);

    let lines = dto.lines;
    if (!lines && dto.sourceInvoiceId) {
      const invoice = await this.prisma.salesInvoice.findFirst({
        where: { id: dto.sourceInvoiceId },
        include: { lines: true },
      });
      if (!invoice) throw new NotFoundException("Faktur sumber tidak ditemukan");
      lines = invoice.lines.map((l) => ({
        itemId: l.itemId ?? undefined,
        partNo: l.partNo ?? undefined,
        name: l.name,
        qty: Number(l.qty),
        uom: l.uom,
      }));
    }
    if (!lines || lines.length === 0) {
      throw new BadRequestException("BAST butuh minimal satu baris item (langsung atau dari sourceInvoiceId)");
    }

    const no = await this.numbering.next("BAST");
    return this.prisma.bast.create({
      data: {
        no,
        date,
        projectId: dto.projectId,
        poRef: dto.poRef,
        customerId: dto.customerId,
        sourceInvoiceId: dto.sourceInvoiceId,
        createdBy,
        lines: { create: lines },
      },
      include: { lines: true },
    });
  }
}
