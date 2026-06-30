import { IsEnum, IsNotEmpty } from 'class-validator';
import { ProjectStatus } from '@prisma/client';

export class UpdateProjectStatusDto {
  @IsEnum(ProjectStatus)
  @IsNotEmpty()
  status!: ProjectStatus;
}
