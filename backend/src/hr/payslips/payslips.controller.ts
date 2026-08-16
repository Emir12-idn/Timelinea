import { Body, Controller, ForbiddenException, Get, Param, ParseIntPipe, Post, Query, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { Role } from "@prisma/client";
import { PayslipsService } from "./payslips.service";
import { GeneratePayslipDto } from "./dto/generate-payslip.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../auth/auth.types";

@UseGuards(JwtAuthGuard)
@Controller("payslips")
export class PayslipsController {
  constructor(private service: PayslipsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query("employeeId") employeeId?: string, @Query("period") period?: string) {
    // Karyawan hanya boleh melihat slip gajinya sendiri (portal self-service, §6).
    const scopedEmployeeId = user.role === Role.karyawan ? (user.employeeId ?? -1) : employeeId ? Number(employeeId) : undefined;
    return this.service.findAll(scopedEmployeeId, period);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.hrd_keuangan)
  @Post("generate")
  generate(@Body() dto: GeneratePayslipDto, @CurrentUser() user: AuthUser) {
    return this.service.generate(dto, user.id);
  }

  @Get(":id/print")
  async print(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthUser, @Res() res: Response) {
    const payslip = await this.service.findOne(id);
    if (user.role === Role.karyawan && payslip.employeeId !== user.employeeId) {
      throw new ForbiddenException("Anda tidak punya akses ke slip gaji ini");
    }
    const pdf = await this.service.renderPdf(id);
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="slip-gaji-${id}.pdf"` });
    res.send(pdf);
  }
}
