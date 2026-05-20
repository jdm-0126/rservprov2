// ─── Types ────────────────────────────────────────────────────────────────────

export type VillaPackage = {
  id: string;
  name: string;
  roomsIncluded: string;
  groupCapacity: string;
  bedTypes: string;
  extraBedCapacity?: string;
  weekdayRate: string;
  weekendRate: string;
};

export type VillaPolicies = {
  checkIn: string;
  checkOut: string;
  extraGuestFee?: string;
  childPolicy?: string;
  petPolicy?: string;
  parking?: string;
  extension?: string;
  cancellation?: string;
};

export type Villa = {
  id: string;
  name: string;
  location: string;
  address?: string;
  price: number;           // base/starting price for display
  guests: number;          // max capacity
  bedrooms: number;
  description: string;
  amenities: string[];
  entertainment?: string[];
  kitchenSupplies?: string[];
  policies?: VillaPolicies;
  additionalServices?: string[];
  promos?: string[];
  packages?: VillaPackage[];
  image: string;
  adminId?: string;        // ref → users (admin)
};

export type Booking = {
  id: string;
  villaId: string;
  userId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled';
};

// ─── Villa data ───────────────────────────────────────────────────────────────

export const VILLAS: Villa[] = [
  // ── Villa 1: Angeles City, Pampanga ────────────────────────────────────────
  {
    id: '1',
    name: 'Casa Luna Suites & Villas',
    location: 'Angeles City, Pampanga',
    address: 'Lot 24 Blk 51 Fresno St Main Road, Savannah Green Plains Cuayan, Angeles City, Pampanga',
    price: 5000,
    guests: 20,
    bedrooms: 5,
    description:
      'A premium private villa in Angeles City, Pampanga — perfect for families and groups of up to 20 guests. Enjoy a fully self-contained experience with a private pool, unlimited entertainment, a fully equipped kitchen, and flexible dining options. Pet-friendly and ideal for reunions, celebrations, and group getaways.',
    amenities: [
      'Private Pool with Safety Rails',
      'Spacious Living & Entertainment Area',
      '10-Seater Dining Table',
      "Kid's High Chair",
      'Fully Equipped Indoor Kitchen',
      'Outdoor Kitchen',
      'Pool Deck with Seating',
      'Outdoor Toilet & Bath',
      'Parking (5–6 cars)',
      'Pet Friendly (up to 2 pets free)',
    ],
    entertainment: [
      '300 Mbps Hi-Speed WiFi',
      'Netflix Access',
      'Platinum Karaoke (2 wireless mics)',
      'PlayStation 4 (2 controllers)',
      '10-in-1 Convertible Billiards Table',
      'Card & Board Games',
      'Kiddie Toys',
    ],
    kitchenSupplies: [
      'Electric Stove',
      'Microwave Oven',
      'Rice Cooker',
      'Electric Kettle',
      'Refrigerator',
      'Water Dispenser (1 free mineral water container)',
      'Cookwares & Knife Set',
      'Tablewares & Pitchers',
      'Samgyupsal Grill Pan',
      'Charcoal Griller (charcoal provided free)',
      'Hand Soap, Dish Soap, Alcohol & Hand Towels',
    ],
    policies: {
      checkIn: '3:00 PM',
      checkOut: '12:00 NN',
      extraGuestFee: '₱500 per head for guests exceeding 15 sleeping pax',
      childPolicy: 'Children 7 years old and below stay free',
      petPolicy: 'Up to 2 pets allowed free of charge',
      parking: 'Accommodates 5–6 cars',
      extension: 'Additional hourly rate applies if no subsequent booking follows (ARO/hour)',
      cancellation: 'Once confirmed, cancellations are subject to a penalty. Please contact us directly.',
    },
    additionalServices: [
      'Massage Services (additional cost)',
      'Nail Spa Services (additional cost)',
    ],
    promos: [
      'Birthday Promo: ₱300 + complimentary cake',
    ],
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
  },

  // ── Villa 2: Silang, Cavite ─────────────────────────────────────────────────
  {
    id: '2',
    name: 'Casa Luna Resort — Silang Tagaytay',
    location: 'Silang, Cavite',
    address: '90 Real St Malabag, Silang, Cavite',
    price: 10000,          // starting price (Package 1 weekday)
    guests: 35,
    bedrooms: 6,
    description:
      'A private resort and events place in the cool highlands of Silang, Cavite — just minutes from Tagaytay. Offers 8 flexible packages for groups of 6 to 35 guests, with weekday and weekend/holiday pricing. Perfect for reunions, corporate events, and large celebrations with multiple room configurations.',
    amenities: [
      'Private Pool with Safety Rails',
      'Spacious Living & Entertainment Area',
      '10-Seater Dining Table',
      "Kid's High Chair",
      'Fully Equipped Indoor Kitchen',
      'Outdoor Kitchen',
      'Pool Deck with Seating',
      'Outdoor Toilet & Bath',
      'Parking (5–6 cars)',
      'Pet Friendly (up to 2 pets free)',
    ],
    entertainment: [
      '300 Mbps Hi-Speed WiFi',
      'Netflix Access',
      'Platinum Karaoke (2 wireless mics)',
      'PlayStation 4 (2 controllers)',
      '10-in-1 Convertible Billiards Table',
      'Card & Board Games',
      'Kiddie Toys',
    ],
    kitchenSupplies: [
      'Electric Stove',
      'Microwave Oven',
      'Rice Cooker',
      'Electric Kettle',
      'Refrigerator',
      'Water Dispenser (1 free mineral water container)',
      'Cookwares & Knife Set',
      'Tablewares & Pitchers',
      'Samgyupsal Grill Pan',
      'Charcoal Griller (charcoal provided free)',
      'Hand Soap, Dish Soap, Alcohol & Hand Towels',
    ],
    policies: {
      checkIn: '3:00 PM',
      checkOut: '12:00 NN',
      extraGuestFee: '₱500 per head for guests exceeding package capacity',
      childPolicy: 'Children 7 years old and below stay free',
      petPolicy: 'Up to 2 pets allowed free of charge',
      parking: 'Accommodates 5–6 cars',
      extension: 'Additional hourly rate applies if no subsequent booking follows (ARO/hour)',
      cancellation: 'Once confirmed, cancellations are subject to a penalty. Please contact us directly.',
    },
    additionalServices: [
      'Massage Services (additional cost)',
      'Nail Spa Services (additional cost)',
    ],
    promos: [
      'Birthday Promo: ₱300 + complimentary cake',
    ],
    packages: [
      {
        id: 'p1',
        name: 'Package 1',
        roomsIncluded: 'Room 3 & Room 1',
        groupCapacity: '6–7 pax',
        bedTypes: '1 Queen, 1 Double, 1 Single',
        extraBedCapacity: 'Not specified',
        weekdayRate: '₱10,000',
        weekendRate: '₱12,000',
      },
      {
        id: 'p2',
        name: 'Package 2',
        roomsIncluded: 'Room 4 & Room 5',
        groupCapacity: '8–10 pax',
        bedTypes: '2 Double, 1 Single',
        extraBedCapacity: 'Up to 5 extra beds',
        weekdayRate: '₱15,000',
        weekendRate: '₱16,500',
      },
      {
        id: 'p3',
        name: 'Package 3',
        roomsIncluded: 'Room 1 & Room 2',
        groupCapacity: '10–15 pax',
        bedTypes: '7 Queen, 3 Double, 1 Single',
        extraBedCapacity: '6 extra beds',
        weekdayRate: '₱25,000',
        weekendRate: '₱27,000',
      },
      {
        id: 'p4',
        name: 'Package 4',
        roomsIncluded: 'Room 1, Room 2 & Room 4',
        groupCapacity: '12–18 pax',
        bedTypes: '2 Queen, 2 Double, 1 Single',
        extraBedCapacity: '6 extra beds',
        weekdayRate: '₱28,000',
        weekendRate: '₱32,000',
      },
      {
        id: 'p5',
        name: 'Package 5',
        roomsIncluded: 'Room 1, Room 2 & Room 3',
        groupCapacity: '16–22 pax',
        bedTypes: '3 Queen, 7 Double, 3 Single',
        extraBedCapacity: '6 extra beds',
        weekdayRate: '₱32,000',
        weekendRate: '₱36,000',
      },
      {
        id: 'p6',
        name: 'Package 6',
        roomsIncluded: 'Room 1, Room 2, Room 3 & Room 4',
        groupCapacity: '18–26 pax',
        bedTypes: '3 Queen, 3 Double, 3 Single',
        extraBedCapacity: '15 extra beds',
        weekdayRate: '₱36,000',
        weekendRate: '₱44,000',
      },
      {
        id: 'p7',
        name: 'Package 7',
        roomsIncluded: 'Room 1, Room 2, Room 3, Room 4 & Room 5',
        groupCapacity: '21–30 pax',
        bedTypes: '3 Queen, 6 Double, 1 Single',
        extraBedCapacity: '7 extra beds',
        weekdayRate: '₱39,000',
        weekendRate: '₱42,000',
      },
      {
        id: 'p8',
        name: 'Package 8 — Full Resort',
        roomsIncluded: 'All 6 rooms',
        groupCapacity: '25–35 pax',
        bedTypes: '3 Queen, 8 Double, 4 Single, 3 Guest Single beds',
        extraBedCapacity: '20 extra beds',
        weekdayRate: '₱45,000',
        weekendRate: '₱50,000',
      },
    ],
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
  },
];
