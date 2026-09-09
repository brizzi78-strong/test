/**
 * Core domain types for the book marketplace.
 *
 * Sellers (publishers, authors, or members) list Books. A Listing is one
 * seller's offer of one book at a price. Buyers place Orders, paying in USD or
 * in CARD (see ../../BOOKSTORE_PLATFORM_PLAN.md).
 *
 * Two design rules are load-bearing and enforced throughout — they are what
 * keep CARD a payment method rather than an investment product, and keep this
 * platform out of money-transmitter territory:
 *
 *   1. **Prices are always denominated in USD.** CARD amounts are derived at
 *      checkout from a quote that expires. A book costs $18.00, never
 *      "1,200,000 CARD".
 *   2. **CARD payments are non-custodial.** The platform never holds a buyer's
 *      funds. The buyer pays the merchant address from their own wallet and
 *      submits the transaction hash; we store that hash as a receipt reference.
 *
 * Deliberately absent: any profit-sharing, holder distribution, staking or
 * yield mechanism. See the plan doc for why that line matters.
 */

/** Who is offering a book for sale. */
export type SellerKind = 'publisher' | 'author' | 'member';
export const SELLER_KINDS: readonly SellerKind[] = ['publisher', 'author', 'member'];

export interface Seller {
  id: string;
  name: string;
  kind: SellerKind;
  /** Contact for order fulfilment; not payment credentials. */
  email?: string;
  /** Public wallet address that receives CARD payments for this seller. */
  payoutAddress?: string;
  createdAt: string;
}

export type BookFormat = 'paperback' | 'hardcover' | 'ebook' | 'audiobook';
export const BOOK_FORMATS: readonly BookFormat[] = ['paperback', 'hardcover', 'ebook', 'audiobook'];

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  description?: string;
  genres: string[];
  format: BookFormat;
  createdAt: string;
}

export type ListingCondition = 'new' | 'used';
export const LISTING_CONDITIONS: readonly ListingCondition[] = ['new', 'used'];

/** One seller's offer of one book. Price is in USD cents, always. */
export interface Listing {
  id: string;
  bookId: string;
  sellerId: string;
  priceCents: number;
  stock: number;
  condition: ListingCondition;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'usd' | 'card_token';
export const PAYMENT_METHODS: readonly PaymentMethod[] = ['usd', 'card_token'];

/**
 * A USD→CARD conversion offered at checkout, valid for a short window.
 *
 * Quotes expire because the exchange rate moves; this is standard practice for
 * every crypto payment processor and protects both sides from volatility
 * between "add to cart" and "transaction confirmed".
 */
export interface Quote {
  id: string;
  orderId: string;
  usdCents: number;
  /** CARD (whole tokens, decimal string) owed at this quote's rate. */
  cardAmount: string;
  /** USD cents per 1 CARD, as quoted. */
  centsPerCard: number;
  issuedAt: string;
  expiresAt: string;
}

/**
 * A recorded CARD payment. `verified` distinguishes "buyer told us they paid"
 * from "we confirmed it on-chain" — the service never conflates the two.
 */
export interface CardPayment {
  txHash: string;
  fromAddress?: string;
  quoteId: string;
  cardAmount: string;
  recordedAt: string;
  verified: boolean;
  verifiedAt?: string;
}

export type OrderStatus = 'pending_payment' | 'paid' | 'fulfilled' | 'cancelled' | 'refunded';
export const ORDER_STATUSES: readonly OrderStatus[] = [
  'pending_payment',
  'paid',
  'fulfilled',
  'cancelled',
  'refunded',
];

export interface OrderItem {
  listingId: string;
  bookId: string;
  title: string;
  sellerId: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

/** One appended history entry, so an order's timeline is auditable. */
export interface OrderEvent {
  at: string;
  event: string;
  by?: string;
  note?: string;
}

export interface Order {
  id: string;
  buyerName: string;
  buyerEmail?: string;
  items: OrderItem[];
  subtotalCents: number;
  /** Discount applied for paying in CARD. A discount — never a distribution. */
  discountCents: number;
  totalCents: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  cardPayment?: CardPayment;
  history: OrderEvent[];
  createdAt: string;
  updatedAt: string;
}
