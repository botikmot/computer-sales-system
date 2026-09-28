import { IsUUID } from 'class-validator';

export class AssignServiceTechnicianDto {
  @IsUUID()
  technicianId!: string;
}
