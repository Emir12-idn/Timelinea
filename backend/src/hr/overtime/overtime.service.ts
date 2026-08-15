import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { lineAmount } from "../../common/money.util";
import { CreateOvertimeDto } from "./dto/create-overtime.dto";

@Injectable()
export class OvertimeService {
  constructor(private prisma: PrismaService) {}

  findAll(employeeId?: number) {
    return this.prisma.overtime.findMany({
      where: employeeId ? { employeeId } : {},
      include: { employee: true },
      orderBy: { date: "desc" },
    });
  }

  create(dto: CreateOvertimeDto, approvedBy?: number) {
    return this.prisma.overtime.create({
      data: {
        employeeId: dto.employeeId,
        date: new Date(dto.date),
        hours: dto.hours,
        rate: BigInt(dto.rate),
        amount: lineAmount(BigInt(dto.rate), dto.hours),
        approvedBy,
      },
    });
  }
}
