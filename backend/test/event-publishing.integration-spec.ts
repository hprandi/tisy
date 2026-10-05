describe('Event publishing (integration)', () => {
  // Given a registered organizer
  // When they create an event, add a ticket tier and publish the event
  // Then the event is created as a draft, the tier is created
  //   and the publish response shows the event as published
  it.todo(
    'happy path: organizer creates an event, adds a tier and publishes it',
  );

  // Given a draft event and a published event with a tier
  // When an anonymous visitor requests each of them
  // Then the draft returns 404 and the published event returns with its tier
  // And the owner still sees the draft
  it.todo('a visitor only sees published events');

  // Given an organizer with a draft event
  // When they edit its title and location
  // Then the response and a later GET show the new values
  it.todo('organizer edits an event');

  // Given an organizer with an event and a ticket tier
  // When they edit the tier's name and price
  // Then the response and a later listing show the new values
  // Note: today editing is rejected once the tier's sales start has passed, even when
  //   the dates are untouched (to be confirmed and decided)
  it.todo('organizer edits a ticket tier');

  // Given an organizer with two events (one with a tier) and another organizer with one event
  // When the first organizer lists their events and the tiers of one event
  // Then they only see their own events and that event's tiers
  it.todo('organizer lists their own events and tiers');

  // Given a draft event without any ticket tier
  // When the organizer publishes it
  // Then the response is 400 and the event stays a draft
  it.todo('publishing requires an active ticket tier');

  // Given an event that is already published
  // When the organizer publishes it again
  // Then the response is 409
  it.todo('an event cannot be published twice');

  // Table: edit event | publish | create tier | list tiers | edit tier
  // Given organizers A (owner of an event with a tier) and B
  // When B tries each operation on A's event
  // Then each gets 404 (not 403, so the event's existence is not revealed) and nothing changes
  it.todo('another organizer cannot read or change the event');

  // When an anonymous visitor creates an event
  // Then the response is 401 and nothing is persisted
  it.todo('anonymous visitors cannot create events');

  // Table: event ends before it starts | tier ends before it starts
  //   | tier starts in the past | tier ends after the event ends
  // When the organizer submits each
  // Then each gets 400 and nothing is persisted
  it.todo('invalid dates are rejected');
});
