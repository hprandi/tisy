export interface Credentials {
  email: string;
  password: string;
}

export interface Person extends Credentials {
  name: string;
  documentType: 'CPF' | 'PASSPORT' | 'OTHER';
  documentNumber: string;
}

let sequence = 0;

export function aPerson(overrides: Partial<Person> = {}): Person {
  sequence += 1;

  return {
    name: `Person ${sequence}`,
    email: `person${sequence}@test.com`,
    password: 'Password123!',
    documentType: 'CPF',
    documentNumber: '12345678901',
    ...overrides,
  };
}

export interface GuestBuyer {
  name: string;
  email: string;
  documentType: 'CPF' | 'PASSPORT' | 'OTHER';
  documentNumber: string;
}

export function aGuestBuyer(overrides: Partial<GuestBuyer> = {}): GuestBuyer {
  sequence += 1;

  return {
    name: `Guest Buyer ${sequence}`,
    email: `guest${sequence}@test.com`,
    documentType: 'CPF',
    documentNumber: '98765432100',
    ...overrides,
  };
}

export interface NewEvent {
  title: string;
  location: string;
  startDate: string;
  endDate: string;
}

export interface NewTicketTier {
  name: string;
  price: number;
  quantityTotal: number;
  salesStartAt: string;
  salesEndAt: string;
}

export function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function anEvent(overrides: Partial<NewEvent> = {}): NewEvent {
  sequence += 1;

  return {
    title: `Event ${sequence}`,
    location: 'Test Venue',
    startDate: hoursFromNow(24),
    endDate: hoursFromNow(48),
    ...overrides,
  };
}

export function aTicketTier(
  overrides: Partial<NewTicketTier> = {},
): NewTicketTier {
  sequence += 1;

  return {
    name: `Tier ${sequence}`,
    price: 50,
    quantityTotal: 10,
    salesStartAt: hoursFromNow(1),
    salesEndAt: hoursFromNow(24),
    ...overrides,
  };
}
