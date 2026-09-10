import { IsBoolean } from "class-validator";

/** BOM sudah terpakai di Work Order begitu dibuat — satu-satunya yang boleh diubah adalah status aktifnya. */
export class UpdateBomDto {
  @IsBoolean()
  isActive: boolean;
}
