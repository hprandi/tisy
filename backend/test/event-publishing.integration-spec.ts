import { EventStatus } from '@prisma/client';
import type { ApiResult } from './helpers/api/api-result';
import { aTicketTier, anEvent, hoursFromNow } from './helpers/builders';
import {
  anOrganizer,
  countEvents,
  countTicketTiers,
  seedEvent,
  seedTicketTier,
  type Organizer,
} from './helpers/fixtures';
import { useTestApp } from './helpers/test-app';

describe('Event publishing (integration)', () => {
  const ctx = useTestApp();

  it('happy path: create an event, add a tier and publish it', async () => {
    // Given a registered organizer
    const organizer = await anOrganizer(ctx.auth);

    // When they create an event, add a ticket tier and publish it
    const created = await ctx.events.create(organizer.token, anEvent());
    const tier = await ctx.ticketTiers.create(
      organizer.token,
      created.body.id,
      aTicketTier(),
    );
    const published = await ctx.events.publish(
      organizer.token,
      created.body.id,
    );

    // Then the event starts as a draft and the publish response shows it published
    expect(created.status).toBe(201);
    expect(created.body.status).toBe(EventStatus.DRAFT);
    expect(tier.status).toBe(201);
    expect(published.status).toBe(200);
    expect(published.body.status).toBe(EventStatus.PUBLISHED);
  });

  it('a visitor cannot see draft events', async () => {
    // Given a draft event and a published event with a tier
    const owner = await anOrganizer(ctx.auth);
    const draftId = await seedEvent(ctx.prisma, owner.id);
    const publishedId = await seedEvent(
      ctx.prisma,
      owner.id,
      EventStatus.PUBLISHED,
    );
    await seedTicketTier(ctx.prisma, publishedId);

    // When an anonymous visitor requests each
    const draftForVisitor = await ctx.events.get(draftId);
    const publishedForVisitor = await ctx.events.get(publishedId);
    const draftForOwner = await ctx.events.get(draftId, owner.token);

    // Then the draft is 404 and the published one comes with its tier; the owner still sees the draft
    expect(draftForVisitor.status).toBe(404);
    expect(publishedForVisitor.status).toBe(200);
    expect(publishedForVisitor.body.ticketTiers).toHaveLength(1);
    expect(draftForOwner.status).toBe(200);
  });

  it('organizer edits an event', async () => {
    // Given an organizer with an event
    const owner = await anOrganizer(ctx.auth);
    const eventId = await seedEvent(ctx.prisma, owner.id);

    // When they edit its title and location
    const changes = { title: 'New title', location: 'New venue' };
    const update = await ctx.events.update(owner.token, eventId, changes);
    const reloaded = await ctx.events.get(eventId, owner.token);

    // Then the response and a later GET show the new values
    expect(update.status).toBe(200);
    expect(update.body).toMatchObject(changes);
    expect(reloaded.body).toMatchObject(changes);
  });

  // Note: editing is rejected once the sales start has passed, even without touching dates (to be decided)
  it('organizer edits a ticket tier', async () => {
    // Given an organizer with an event and a tier
    const owner = await anOrganizer(ctx.auth);
    const eventId = await seedEvent(ctx.prisma, owner.id);
    const tierId = await seedTicketTier(ctx.prisma, eventId);

    // When they edit the tier's name and price
    const update = await ctx.ticketTiers.update(owner.token, eventId, tierId, {
      name: 'VIP',
      price: 75,
    });
    const listing = await ctx.ticketTiers.list(owner.token, eventId);

    // Then the response and a later listing show the new values
    expect(update.status).toBe(200);
    expect(update.body).toMatchObject({ name: 'VIP', price: '75' });
    expect(listing.body).toMatchObject([
      { id: tierId, name: 'VIP', price: '75' },
    ]);
  });

  it('organizer lists their own events and tiers', async () => {
    // Given two organizers, each with an event, one of them with a tier
    const first = await anOrganizer(ctx.auth);
    const second = await anOrganizer(ctx.auth);
    const firstEventId = await seedEvent(ctx.prisma, first.id);
    const tierId = await seedTicketTier(ctx.prisma, firstEventId);
    await seedEvent(ctx.prisma, second.id);

    // When the first lists their events and that event's tiers
    const events = await ctx.events.list(first.token);
    const tiers = await ctx.ticketTiers.list(first.token, firstEventId);

    // Then they only see their own events and its tiers
    expect(events.body.map((event) => event.id)).toEqual([firstEventId]);
    expect(tiers.body.map((tier) => tier.id)).toEqual([tierId]);
  });

  it('publishing requires a ticket tier', async () => {
    // Given a draft event without tiers
    const owner = await anOrganizer(ctx.auth);
    const eventId = await seedEvent(ctx.prisma, owner.id);

    // When the organizer publishes it
    const result = await ctx.events.publish(owner.token, eventId);

    // Then 400 and it stays a draft
    expect(result.status).toBe(400);
    expect((await ctx.events.get(eventId, owner.token)).body.status).toBe(
      EventStatus.DRAFT,
    );
  });

  it('only draft events can be published', async () => {
    // Given a published event
    const owner = await anOrganizer(ctx.auth);
    const eventId = await seedEvent(
      ctx.prisma,
      owner.id,
      EventStatus.PUBLISHED,
    );

    // When the organizer publishes it again
    const result = await ctx.events.publish(owner.token, eventId);

    // Then 409
    expect(result.status).toBe(409);
  });

  describe('another organizer', () => {
    type Attempt = (target: {
      token: string;
      eventId: string;
      tierId: string;
    }) => Promise<ApiResult<unknown>>;

    // Table: edit event | publish | create tier | list tiers | edit tier
    it.each<[string, Attempt]>([
      [
        'edit the event',
        ({ token, eventId }) =>
          ctx.events.update(token, eventId, { title: 'Hijacked' }),
      ],
      [
        'publish the event',
        ({ token, eventId }) => ctx.events.publish(token, eventId),
      ],
      [
        'create a tier',
        ({ token, eventId }) =>
          ctx.ticketTiers.create(token, eventId, aTicketTier()),
      ],
      [
        'list the tiers',
        ({ token, eventId }) => ctx.ticketTiers.list(token, eventId),
      ],
      [
        'edit a tier',
        ({ token, eventId, tierId }) =>
          ctx.ticketTiers.update(token, eventId, tierId, { name: 'Hijacked' }),
      ],
    ])('cannot %s', async (_case, attempt) => {
      // Given organizer A's event with a tier
      const owner = await anOrganizer(ctx.auth);
      const eventId = await seedEvent(ctx.prisma, owner.id);
      const tierId = await seedTicketTier(ctx.prisma, eventId);
      const before = await ctx.events.get(eventId, owner.token);
      const stranger = await anOrganizer(ctx.auth);

      // When organizer B tries it
      const result = await attempt({ token: stranger.token, eventId, tierId });

      // Then 404 (not 403, so its existence is not revealed) and nothing changes
      expect(result.status).toBe(404);
      const after = await ctx.events.get(eventId, owner.token);
      expect(after.body).toEqual(before.body);
    });
  });

  it('anonymous visitors cannot create events', async () => {
    // When an anonymous visitor creates an event
    const result = await ctx.events.create(undefined, anEvent());

    // Then 401
    expect(result.status).toBe(401);
  });

  describe('invalid dates', () => {
    type Submission = (
      organizer: Organizer,
      eventId: string,
    ) => Promise<ApiResult<unknown>>;

    // Table: event ends before it starts | tier ends before it starts
    //   | tier starts in the past | tier ends after the event
    it.each<[string, Submission]>([
      [
        'an event that ends before it starts',
        (organizer) =>
          ctx.events.create(
            organizer.token,
            anEvent({ startDate: hoursFromNow(48), endDate: hoursFromNow(24) }),
          ),
      ],
      [
        'a tier that ends before it starts',
        (organizer, eventId) =>
          ctx.ticketTiers.create(
            organizer.token,
            eventId,
            aTicketTier({
              salesStartAt: hoursFromNow(10),
              salesEndAt: hoursFromNow(5),
            }),
          ),
      ],
      [
        'a tier that starts in the past',
        (organizer, eventId) =>
          ctx.ticketTiers.create(
            organizer.token,
            eventId,
            aTicketTier({ salesStartAt: hoursFromNow(-1) }),
          ),
      ],
      [
        'a tier that ends after the event',
        (organizer, eventId) =>
          ctx.ticketTiers.create(
            organizer.token,
            eventId,
            aTicketTier({ salesEndAt: hoursFromNow(72) }),
          ),
      ],
    ])('%s is rejected', async (_case, submit) => {
      // Given an organizer with a draft event
      const organizer = await anOrganizer(ctx.auth);
      const eventId = await seedEvent(ctx.prisma, organizer.id);

      // When they submit it
      const result = await submit(organizer, eventId);

      // Then 400 and nothing is saved
      expect(result.status).toBe(400);
      expect(await countEvents(ctx.prisma)).toBe(1);
      expect(await countTicketTiers(ctx.prisma)).toBe(0);
    });
  });
});
