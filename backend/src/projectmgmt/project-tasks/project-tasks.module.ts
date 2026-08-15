import { Module } from "@nestjs/common";
import { ProjectTasksService } from "./project-tasks.service";
import { ProjectTasksController } from "./project-tasks.controller";

@Module({
  providers: [ProjectTasksService],
  controllers: [ProjectTasksController],
  exports: [ProjectTasksService],
})
export class ProjectTasksModule {}
