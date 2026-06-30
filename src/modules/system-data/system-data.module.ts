import { Module } from '@nestjs/common';
import { SystemDataController } from './system-data.controller';
import { SystemDataService } from './system-data.service';
import { TermsController } from './terms.controller';
import { TermsService } from './terms.service';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { TermsConditionsController } from './terms-conditions.controller';
import { TermsConditionsService } from './terms-conditions.service';
import { AlertThresholdsController } from './alert-thresholds.controller';
import { AlertThresholdsService } from './alert-thresholds.service';

@Module({
  controllers: [
    SystemDataController,
    TermsController,
    ItemsController,
    TermsConditionsController,
    AlertThresholdsController,
  ],
  providers: [
    SystemDataService,
    TermsService,
    ItemsService,
    TermsConditionsService,
    AlertThresholdsService,
  ],
  exports: [SystemDataService],
})
export class SystemDataModule {}
