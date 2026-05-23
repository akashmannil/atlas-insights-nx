import { Module } from '@nestjs/common';
import { EarthquakesController } from './earthquakes.controller';
import { EarthquakesService } from './earthquakes.service';

@Module({
  controllers: [EarthquakesController],
  providers: [EarthquakesService],
  exports: [EarthquakesService],
})
export class EarthquakesModule {}
