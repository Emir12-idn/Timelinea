import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UpsertAttendanceDto } from "./dto/upsert-attendance.dto";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  findAll(date?: string, employeeId?: number) {
    return this.prisma.attendance.findMany({
      where: {
        ...(date ? { date: startOfDay(new Date(date)) } : {}),
        ...(employeeId ? { employeeId } : {}),
      },
      include: { employee: true },
      orderBy: { date: "desc" },
    });
  }

  /** HRD menetapkan/mengubah status kehadiran (Hadir/Izin/Sakit/Alpha) untuk satu tanggal. */
  upsertStatus(dto: UpsertAttendanceDto) {
    const date = startOfDay(new Date(dto.date));
    return this.prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: dto.employeeId, date } },
      create: { employeeId: dto.employeeId, date, status: dto.status },
      update: { status: dto.status },
    });
  }

  clockIn(employeeId: number) {
    const date = startOfDay(new Date());
    return this.prisma.attendance.upsert({
      where: { employeeId_date: { employeeId, date } },
      create: { employeeId, date, status: "hadir", clockIn: new Date() },
      update: { clockIn: new Date(), status: "hadir" },
    });
  }

  clockOut(employeeId: number) {
    const date = startOfDay(new Date());
    return this.prisma.attendance.update({
      where: { employeeId_date: { employeeId, date } },
      data: { clockOut: new Date() },
    });
  }
}
