import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Event } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './create-event.dto';
import { UpdateEventDto } from './update-event.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async create(
    createEventDto: CreateEventDto,
    organizerId: string,
  ): Promise<Event> {
    const startDate = new Date(createEventDto.startDate);
    const endDate = new Date(createEventDto.endDate);

    this.assertValidDateRange(startDate, endDate);

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

  async findAllByOrganizer(organizerId: string): Promise<Event[]> {
    return this.prisma.event.findMany({ where: { organizerId } });
  }

  async findOwnedById(id: string, organizerId: string): Promise<Event> {
    const event = await this.findById(id);

    if (!event) {
      throw new NotFoundException('Event not found.');
    }
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You do not own this event.');
    }

    return event;
  }

  async update(event: Event, updateEventDto: UpdateEventDto): Promise<Event> {
    const startDate = updateEventDto.startDate
      ? new Date(updateEventDto.startDate)
      : event.startDate;

    const endDate = updateEventDto.endDate
      ? new Date(updateEventDto.endDate)
      : event.endDate;

    this.assertValidDateRange(startDate, endDate);

    return this.prisma.event.update({
      where: { id: event.id },
      data: {
        ...updateEventDto,
        startDate,
        endDate,
      },
    });
  }

  private async findById(id: string): Promise<Event | null> {
    return this.prisma.event.findUnique({ where: { id } });
  }

  private assertValidDateRange(startDate: Date, endDate: Date): void {
    if (endDate <= startDate) {
      throw new BadRequestException('endDate must be after startDate.');
    }
  }
}
