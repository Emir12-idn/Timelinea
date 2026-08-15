import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateEmployeeLoanDto } from "./dto/create-employee-loan.dto";

@Injectable()
export class EmployeeLoansService {
  constructor(private prisma: PrismaService) {}

  findAll(employeeId?: number) {
    return this.prisma.employeeLoan.findMany({
      where: employeeId ? { employeeId } : {},
      include: { employee: true },
      orderBy: { date: "desc" },
    });
  }

  create(dto: CreateEmployeeLoanDto) {
    return this.prisma.employeeLoan.create({
      data: {
        employeeId: dto.employeeId,
        date: new Date(dto.date),
        principal: BigInt(dto.principal),
        remaining: BigInt(dto.principal),
        installment: BigInt(dto.installment),
      },
    });
  }
}
