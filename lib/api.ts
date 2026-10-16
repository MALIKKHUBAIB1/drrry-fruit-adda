"use client";

// Backend API ka chhota client wrapper.
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || "Something went wrong.");
  }
  return data as T;
}

export type ApiUser = { id: string; name: string; email: string; isAdmin: boolean; createdAt: string };
export type ApiOrderItem = {
  slug: string;
  name: string;
  variant: string;
  qty: number;
  price: number;
  mrp: number;
  image: string;
};
export type ApiOrder = {
  id: string;
  items: ApiOrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  coupon: string | null;
  name: string;
  city: string;
  pin: string;
  payment: "cod" | "online";
  status: string;
  createdAt: string;
};
export type ApiReview = {
  id: string;
  productSlug: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
};
