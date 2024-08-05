import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsString,
  IsInt,
  IsDateString,
} from 'class-validator';

export class UnifiedAtsJobinterviewstageInput {
  @ApiPropertyOptional({
    type: String,
    example: 'Second Call',
    description: 'The name of the job interview stage',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    type: Number,
    example: 1,
    description: 'The order of the stage',
  })
  @IsInt()
  @IsOptional()
  stage_order?: number;

  @ApiPropertyOptional({
    type: String,
    example: '801f9ede-c698-4e66-a7fc-48d19eebaa4f',
    description: 'The UUID of the job',
  })
  @IsUUID()
  @IsOptional()
  job_id?: string;

  @ApiPropertyOptional({
    type: Object,
    example: {
      fav_dish: 'broccoli',
      fav_color: 'red',
    },
    description:
      'The custom field mappings of the object between the remote 3rd party & Panora',
  })
  @IsOptional()
  field_mappings?: Record<string, any>;
}

export class UnifiedAtsJobinterviewstageOutput extends UnifiedAtsJobinterviewstageInput {
  @ApiPropertyOptional({
    type: String,
    example: '801f9ede-c698-4e66-a7fc-48d19eebaa4f',
    description: 'The UUID of the job interview stage',
  })
  @IsUUID()
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'id_1',
    description:
      'The remote ID of the job interview stage in the context of the 3rd Party',
  })
  @IsString()
  @IsOptional()
  remote_id?: string;

  @ApiPropertyOptional({
    type: Object,
    example: {
      fav_dish: 'broccoli',
      fav_color: 'red',
    },
    description:
      'The remote data of the job interview stage in the context of the 3rd Party',
  })
  @IsOptional()
  remote_data?: Record<string, any>;

  @ApiPropertyOptional({
    type: {},
    example: '2024-10-01T12:00:00Z',
    description: 'The created date of the object',
  })
  @IsOptional()
  created_at?: any;

  @ApiPropertyOptional({
    type: {},
    example: '2024-10-01T12:00:00Z',
    description: 'The modified date of the object',
  })
  @IsOptional()
  modified_at?: any;
}
