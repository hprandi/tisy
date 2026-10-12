import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus, TicketTierStatus } from '@prisma/client';
import type { Event } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateEventDto } from './create-event.dto';
import { UpdateEventDto } from './update-event.dto';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async create(
    createEventDto: CreateEventDto,
    organizerId: string,
  ): Promise<Event> {
    if (!(await this.usersService.canOrganize(organizerId))) {
      throw new ForbiddenException('User is not allowed to organize events.');
    }

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

    if (!event || event.organizerId !== organizerId) {
      throw new NotFoundException('Event not found.');
    }

    return event;
  }

  async findByIdForViewer(id: string, viewerId?: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { ticketTiers: true },
    });

    if(!event){
      throw new NotFoundException('Event not found.');
    }

    const isOwner = viewerId !== undefined && event?.organizerId === viewerId;
    const isPublicViewable = event.status !== EventStatus.DRAFT

    if (!isPublicViewable && !isOwner) {
      throw new NotFoundException('Event not found.');
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

  async publish(event: Event): Promise<Event> {
    if (event.status !== EventStatus.DRAFT) {
      throw new ConflictException('Only draft events can be published.');
    }

    const activeTierCount = await this.prisma.ticketTier.count({
      where: { eventId: event.id, status: TicketTierStatus.ACTIVE },
    });

    if (activeTierCount === 0) {
      throw new BadRequestException(
        'Event must have at least one active ticket tier to be published.',
      );
    }

    return this.prisma.event.update({
      where: { id: event.id },
      data: { status: EventStatus.PUBLISHED },
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
