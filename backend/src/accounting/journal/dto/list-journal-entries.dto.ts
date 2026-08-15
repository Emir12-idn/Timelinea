import { IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination.dto";

export class ListJournalEntriesDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  refType?: string;

  @IsOptional()
  @IsString()
  refId?: string;
}
