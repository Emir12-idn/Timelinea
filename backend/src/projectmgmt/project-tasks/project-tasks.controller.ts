import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ProjectTasksService } from "./project-tasks.service";
import { CreateProjectTaskDto } from "./dto/create-project-task.dto";
import { UpdateProjectTaskDto } from "./dto/update-project-task.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller("project-tasks")
export class ProjectTasksController {
  constructor(private service: ProjectTasksService) {}

  @Get()
  findAll(@Query("projectId") projectId?: string) {
    return this.service.findAll(projectId ? Number(projectId) : undefined);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProjectTaskDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateProjectTaskDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
