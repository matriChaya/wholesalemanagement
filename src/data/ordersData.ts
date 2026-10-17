import { OrderInvoice } from '../types';

/**
 * Clean slate initial orders:
 * All automatic dummy entries are reset so the user can freshly input and sync
 * genuine sales from Mobile App, Laptop Counter POS, and DSR Field Sales.
 */
export const initialOrders: OrderInvoice[] = [];
