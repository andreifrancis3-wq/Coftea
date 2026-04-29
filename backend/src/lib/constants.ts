export const ROLE_VALUES = ['admin', 'staff', 'customer'] as const;
export const ORDER_STATUSES = ['pending', 'processing', 'completed', 'cancelled'] as const;

export type Role = (typeof ROLE_VALUES)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const SEEDED_PRODUCTS = [
  {
    name: 'Midnight Espresso',
    imageUrl: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=900&q=80',
    price: 4.5,
    description: 'Bold espresso with cocoa depth and a smooth, velvety finish.',
  },
  {
    name: 'Caramel Cloud',
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80',
    price: 5.25,
    description: 'Silky milk, espresso, and caramel layered into a sweet signature drink.',
  },
  {
    name: 'Iced Velvet Latte',
    imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=80',
    price: 4.75,
    description: 'Chilled espresso and milk over ice for a crisp afternoon reset.',
  },
  {
    name: 'Mocha Ember',
    imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80',
    price: 5.5,
    description: 'A rich chocolate-and-coffee blend balanced with a warm roast profile.',
  },
];
