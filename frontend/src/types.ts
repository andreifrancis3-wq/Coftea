export type Role = 'admin' | 'staff' | 'customer';
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

export type User = {
  id: number;
  username: string;
  displayName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
};

export type Product = {
  id: number;
  name: string;
  imageUrl: string;
  price: number;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Order = {
  id: number;
  userId: number;
  username: string;
  status: OrderStatus;
  total: number;
  shippingAddress: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  itemSummary: string;
};

export type StaffAccount = {
  id: number;
  username: string;
  displayName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
};

export type CartItem = {
  productId: number;
  quantity: number;
  name: string;
  price: number;
  imageUrl: string;
};
