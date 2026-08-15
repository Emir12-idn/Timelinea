import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateWorkReportDto } from "./dto/create-work-report.dto";

@Injectable()
export class WorkReportsService {
  constructor(private prisma: PrismaService) {}

  findAll(employeeId?: number, taskId?: number) {
    return this.prisma.workReport.findMany({
      where: { ...(employeeId ? { employeeId } : {}), ...(taskId ? { taskId } : {}) },
      include: { task: { include: { project: true } } },
      orderBy: { date: "desc" },
    });
  }

  async create(dto: CreateWorkReportDto, employeeId: number) {
    const report = await this.prisma.workReport.create({
      data: { ...dto, date: new Date(dto.date), employeeId },
    });
    // Progress tugas mengikuti laporan terbaru dari lapangan.
    await this.prisma.projectTask.update({
      where: { id: dto.taskId },
      data: { progress: dto.progress },
    });
    return report;
  }
}
