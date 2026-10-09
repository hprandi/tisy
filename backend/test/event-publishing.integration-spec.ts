describe('Event publishing (integration)', () => {
  // Given a registered organizer
  // When they create an event, add a ticket tier and publish it
  // Then the event starts as a draft and the publish response shows it published
  it.todo('happy path: create an event, add a tier and publish it');

  // Given a draft event and a published event with a tier
  // When an anonymous visitor requests each
  // Then the draft is 404 and the published one comes with its tier; the owner still sees the draft
  it.todo('a visitor cannot see draft events');

  // Given an organizer with an event
  // When they edit its title and location
  // Then the response and a later GET show the new values
  it.todo('organizer edits an event');

  // Given an organizer with an event and a tier
  // When they edit the tier's name and price
  // Then the response and a later listing show the new values
  it.todo('organizer edits a ticket tier');

  // Given two organizers, each with an event, one of them with a tier
  // When the first lists their events and that event's tiers
  // Then they only see their own events and its tiers
  it.todo('organizer lists their own events and tiers');

  // Given a draft event without tiers
  // When the organizer publishes it
  // Then 400 and it stays a draft
  it.todo('publishing requires a ticket tier');

  // Given a published event
  // When the organizer publishes it again
  // Then 409
  it.todo('only draft events can be published');

  // Table: edit event | publish | create tier | list tiers | edit tier
  // Given organizer A's event with a tier
  // When organizer B tries each
  // Then 404 (not 403, so its existence is not revealed) and nothing changes
  it.todo('another organizer cannot change the event or manage its tiers');

  // When an anonymous visitor creates an event
  // Then 401
  it.todo('anonymous visitors cannot create events');

  // Table: event ends before it starts | tier ends before it starts
  //   | tier starts in the past | tier ends after the event
  // When the organizer submits each
  // Then 400 and nothing is saved
  it.todo('invalid dates are rejected');
});
