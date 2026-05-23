import { Module } from '@nestjs/common';
import { EarthquakesModule } from '../earthquakes/earthquakes.module';
import { HealthController } from './health.controller';

@Module({
  imports: [EarthquakesModule],
  controllers: [HealthController],
})
export class HealthModule {}
