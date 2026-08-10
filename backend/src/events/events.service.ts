import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './create-event.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async create(createEventDto: CreateEventDto, organizerId: string) {
    const startDate = new Date(createEventDto.startDate);
    const endDate = new Date(createEventDto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('endDate must be after startDate.');
    }

    return this.prisma.event.create({
      data: {
        organizerId,
        title: createEventDto.title,
        description: createEventDto.description,
        location: createEventDto.location,
        startDate,
        endDate,
      },
    });
  }
}
