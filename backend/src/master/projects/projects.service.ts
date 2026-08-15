import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.project.findMany({
      where: { deletedAt: null },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: number) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: { customer: true, tasks: true },
    });
    if (!project) throw new NotFoundException("Proyek tidak ditemukan");
    return project;
  }

  create(dto: CreateProjectDto, createdBy?: number) {
    return this.prisma.project.create({
      data: {
        ...dto,
        contractValue: dto.contractValue !== undefined ? BigInt(dto.contractValue) : undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        createdBy,
      },
    });
  }

  async update(id: number, dto: UpdateProjectDto) {
    await this.findOne(id);
    return this.prisma.project.update({
      where: { id },
      data: {
        ...dto,
        contractValue: dto.contractValue !== undefined ? BigInt(dto.contractValue) : undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }
}
