import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { CommonModule } from "./common/common.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { JournalModule } from "./accounting/journal/journal.module";
import { AccountsModule } from "./accounting/accounts/accounts.module";
import { CompaniesModule } from "./master/companies/companies.module";
import { PartnersModule } from "./master/partners/partners.module";
import { EmployeesModule } from "./master/employees/employees.module";
import { ItemGroupsModule } from "./master/item-groups/item-groups.module";
import { ItemsModule } from "./master/items/items.module";
import { ProjectsModule } from "./master/projects/projects.module";
import { DepartmentsModule } from "./master/departments/departments.module";
import { PurchaseOrdersModule } from "./purchasing/purchase-orders/purchase-orders.module";
import { GoodsReceiptsModule } from "./purchasing/goods-receipts/goods-receipts.module";
import { PurchaseInvoicesModule } from "./purchasing/purchase-invoices/purchase-invoices.module";
import { SalesOrdersModule } from "./sales/sales-orders/sales-orders.module";
import { DeliveryOrdersModule } from "./sales/delivery-orders/delivery-orders.module";
import { SalesInvoicesModule } from "./sales/sales-invoices/sales-invoices.module";
import { CashTransactionsModule } from "./cash/cash-transactions.module";
import { StockMovesModule } from "./inventory/stock-moves.module";
import { ProjectTasksModule } from "./projectmgmt/project-tasks/project-tasks.module";
import { WorkReportsModule } from "./projectmgmt/work-reports/work-reports.module";
import { BastsModule } from "./projectmgmt/basts/basts.module";
import { AttendanceModule } from "./hr/attendance/attendance.module";
import { OvertimeModule } from "./hr/overtime/overtime.module";
import { CashAdvancesModule } from "./hr/cash-advances/cash-advances.module";
import { EmployeeLoansModule } from "./hr/employee-loans/employee-loans.module";
import { PayslipsModule } from "./hr/payslips/payslips.module";
import { FixedAssetsModule } from "./fixed-assets/fixed-assets.module";

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    JournalModule,
    AuthModule,
    UsersModule,
    AccountsModule,
    CompaniesModule,
    PartnersModule,
    EmployeesModule,
    ItemGroupsModule,
    ItemsModule,
    ProjectsModule,
    DepartmentsModule,
    PurchaseOrdersModule,
    GoodsReceiptsModule,
    PurchaseInvoicesModule,
    SalesOrdersModule,
    DeliveryOrdersModule,
    SalesInvoicesModule,
    CashTransactionsModule,
    StockMovesModule,
    ProjectTasksModule,
    WorkReportsModule,
    BastsModule,
    AttendanceModule,
    OvertimeModule,
    CashAdvancesModule,
    EmployeeLoansModule,
    PayslipsModule,
    FixedAssetsModule,
  ],
})
export class AppModule {}
