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
