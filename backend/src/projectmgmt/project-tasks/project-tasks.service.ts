import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateProjectTaskDto } from "./dto/create-project-task.dto";
import { UpdateProjectTaskDto } from "./dto/update-project-task.dto";

@Injectable()
export class ProjectTasksService {
  constructor(private prisma: PrismaService) {}

  findAll(projectId?: number) {
    return this.prisma.projectTask.findMany({
      where: projectId ? { projectId } : {},
      include: { pic: true },
      orderBy: { planStart: "asc" },
    });
  }

  async findOne(id: number) {
    const task = await this.prisma.projectTask.findUnique({ where: { id }, include: { pic: true, workReports: true } });
    if (!task) throw new NotFoundException("Tugas proyek tidak ditemukan");
    return task;
  }

  create(dto: CreateProjectTaskDto) {
    return this.prisma.projectTask.create({
      data: {
        ...dto,
        planStart: dto.planStart ? new Date(dto.planStart) : undefined,
        planEnd: dto.planEnd ? new Date(dto.planEnd) : undefined,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      },
    });
  }

  async update(id: number, dto: UpdateProjectTaskDto) {
    await this.findOne(id);
    return this.prisma.projectTask.update({
      where: { id },
      data: {
        ...dto,
        planStart: dto.planStart ? new Date(dto.planStart) : undefined,
        planEnd: dto.planEnd ? new Date(dto.planEnd) : undefined,
        actualStart: dto.actualStart ? new Date(dto.actualStart) : undefined,
        actualEnd: dto.actualEnd ? new Date(dto.actualEnd) : undefined,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.projectTask.delete({ where: { id } });
    return { ok: true };
  }
}
