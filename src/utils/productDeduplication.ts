import { Product, SupplierLedgerEntry } from '../types';

/**
 * Normalizes a product name into a canonical key.
 * Handles:
 * - Differences in parentheses / brackets: "CH-Charger-33W (Type-C)" vs "CH-Charger-33W(Type-C)"
 * - Dashes, underscores, slashes, periods, commas, colons
 * - Multiple whitespace, uppercase / lowercase
 * - Unicode dashes (en-dash, em-dash, etc.)
 */
export const normalizeProductKey = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    // Replace all unicode dashes with a simple hyphen or space
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, ' ')
    // Replace brackets, parentheses, slashes, underscores, commas, colons, hyphens with spaces
    .replace(/[()[\]{}<>\/\\_,.:;+\-]/g, ' ')
    // Collapse multiple whitespaces
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Checks if two product names or SKUs refer to the same physical product.
 */
export const areProductNamesEquivalent = (nameA?: string, nameB?: string): boolean => {
  if (!nameA || !nameB) return false;
  const aTrim = nameA.trim().toLowerCase();
  const bTrim = nameB.trim().toLowerCase();
  if (aTrim === bTrim) return true;
  const keyA = normalizeProductKey(nameA);
  const keyB = normalizeProductKey(nameB);
  return Boolean(keyA && keyB && keyA === keyB);
};

export interface MergeProductsResult {
  merged: Product[];
  duplicateIdsRemoved: string[];
  mergedGroupsCount: number;
}

/**
 * Merges duplicate products in a product array into unified unique products.
 * Sums stock quantities and merges challanReferences across duplicates.
 */
export const mergeDuplicateProductsList = (
  items: Product[],
  onDeleteIds?: (ids: string[]) => void
): MergeProductsResult => {
  const merged: Product[] = [];
  const duplicateIdsRemoved: string[] = [];
  const keyMap = new Map<string, number>(); // normKey -> index in merged
  const skuMap = new Map<string, number>(); // sku -> index in merged
  let mergedGroupsCount = 0;

  for (const prod of items) {
    if (!prod || !prod.id) continue;
    const normKey = normalizeProductKey(prod.name || prod.bnName || '');
    const normBnKey = prod.bnName ? normalizeProductKey(prod.bnName) : '';
    const skuKey = prod.sku ? prod.sku.trim().toLowerCase() : '';

    let existingIndex = -1;

    if (normKey && keyMap.has(normKey)) {
      existingIndex = keyMap.get(normKey)!;
    } else if (normBnKey && keyMap.has(normBnKey)) {
      existingIndex = keyMap.get(normBnKey)!;
    } else if (skuKey && skuMap.has(skuKey)) {
      existingIndex = skuMap.get(skuKey)!;
    } else {
      // Linear fallback check
      existingIndex = merged.findIndex((m) => {
        return (
          areProductNamesEquivalent(m.name, prod.name) ||
          areProductNamesEquivalent(m.bnName, prod.name) ||
          areProductNamesEquivalent(m.name, prod.bnName) ||
          (m.sku && prod.sku && m.sku.trim().toLowerCase() === prod.sku.trim().toLowerCase())
        );
      });
    }

    if (existingIndex >= 0) {
      // Merge with existing
      mergedGroupsCount++;
      const target = merged[existingIndex];
      duplicateIdsRemoved.push(prod.id);

      const targetStock = Number(target.stockQuantity) || 0;
      const incomingStock = Number(prod.stockQuantity) || 0;
      const combinedStock = targetStock + incomingStock;

      // Merge challan references
      const targetRefs = target.challanReferences || [];
      const incomingRefs = prod.challanReferences || [];
      const refMap = new Map<string, NonNullable<Product['challanReferences']>[0]>();

      // Load existing refs
      for (const r of targetRefs) {
        if (!r || !r.challanNo) continue;
        const cKey = r.challanNo.trim().toLowerCase();
        refMap.set(cKey, { ...r });
      }

      // Merge incoming refs
      for (const r of incomingRefs) {
        if (!r || !r.challanNo) continue;
        const cKey = r.challanNo.trim().toLowerCase();
        if (refMap.has(cKey)) {
          const prev = refMap.get(cKey)!;
          refMap.set(cKey, {
            ...prev,
            quantity: (Number(prev.quantity) || 0) + (Number(r.quantity) || 0),
            costPrice: r.costPrice || prev.costPrice,
            date: r.date || prev.date,
          });
        } else {
          refMap.set(cKey, { ...r });
        }
      }

      const mergedRefs = Array.from(refMap.values());
      const latestChallanNo = prod.latestChallanNo || target.latestChallanNo;

      merged[existingIndex] = {
        ...target,
        // Prefer the most descriptive name
        name: target.name.length >= prod.name.length ? target.name : prod.name,
        bnName: target.bnName || prod.bnName || target.name,
        stockQuantity: combinedStock,
        costPrice: prod.costPrice > 0 ? (target.costPrice > 0 ? Math.min(target.costPrice, prod.costPrice) : prod.costPrice) : target.costPrice,
        wholesalePrice: prod.wholesalePrice > 0 ? Math.max(target.wholesalePrice, prod.wholesalePrice) : target.wholesalePrice,
        retailPrice: prod.retailPrice || target.retailPrice,
        mrp: prod.mrp || target.mrp,
        image: target.image || prod.image,
        supplierName: target.supplierName || prod.supplierName,
        supplierId: target.supplierId || prod.supplierId,
        latestChallanNo,
        challanReferences: mergedRefs,
      };
    } else {
      // First time seeing this product
      const newIdx = merged.length;
      merged.push({ ...prod });
      if (normKey) keyMap.set(normKey, newIdx);
      if (normBnKey) keyMap.set(normBnKey, newIdx);
      if (skuKey) skuMap.set(skuKey, newIdx);
    }
  }

  if (onDeleteIds && duplicateIdsRemoved.length > 0) {
    onDeleteIds(duplicateIdsRemoved);
  }

  return { merged, duplicateIdsRemoved, mergedGroupsCount };
};

export interface ProductChallanRecord {
  challanNo: string;
  date: string;
  supplierName: string;
  quantity: number;
  costPrice: number;
  totalPrice: number;
  source: 'CHALLAN_REF' | 'LEDGER_ENTRY';
}

export interface ProductChallanBreakdownResult {
  totalPurchasedQty: number;
  totalPurchaseCost: number;
  challans: ProductChallanRecord[];
  currentStock: number;
}

/**
 * Computes how many pieces were purchased for a product across all invoices / challans.
 */
export const getProductChallanBreakdown = (
  product: Product,
  supplierLedger: SupplierLedgerEntry[] = []
): ProductChallanBreakdownResult => {
  if (!product) {
    return { totalPurchasedQty: 0, totalPurchaseCost: 0, challans: [], currentStock: 0 };
  }

  const challanMap = new Map<string, ProductChallanRecord>();

  // 1. From product.challanReferences
  if (Array.isArray(product.challanReferences)) {
    product.challanReferences.forEach((r) => {
      if (!r || !r.challanNo) return;
      const cKey = r.challanNo.trim().toUpperCase();
      const qty = Math.max(0, Number(r.quantity) || 0);
      const cost = Math.max(0, Number(r.costPrice) || Number(product.costPrice) || 0);
      challanMap.set(cKey, {
        challanNo: r.challanNo.trim(),
        date: r.date || '',
        supplierName: r.supplierName || product.supplierName || 'কোম্পানি চালান',
        quantity: qty,
        costPrice: cost,
        totalPrice: qty * cost,
        source: 'CHALLAN_REF',
      });
    });
  }

  // 2. From supplierLedger entries of type PURCHASE
  const pNormKey = normalizeProductKey(product.name || product.bnName || '');
  if (Array.isArray(supplierLedger)) {
    supplierLedger.forEach((entry) => {
      if (entry.type !== 'PURCHASE' || !Array.isArray(entry.items)) return;
      const refNo = (entry.referenceNo || '').trim().toUpperCase();
      entry.items.forEach((it) => {
        const itNormKey = normalizeProductKey(it.name || '');
        const isMatch =
          (it.productId && it.productId === product.id) ||
          (pNormKey && itNormKey === pNormKey) ||
          (product.sku && it.sku && product.sku.trim().toLowerCase() === it.sku.trim().toLowerCase());

        if (isMatch) {
          const qty = Math.max(0, Number(it.quantity) || 0);
          const cost = Math.max(0, Number(it.costPrice) || Number(product.costPrice) || 0);
          if (refNo && challanMap.has(refNo)) {
            const existing = challanMap.get(refNo)!;
            if (qty > 0 && existing.quantity === 0) {
              existing.quantity = qty;
              existing.costPrice = cost;
              existing.totalPrice = qty * cost;
            }
            if (!existing.date && entry.date) existing.date = entry.date;
            if (!existing.supplierName && entry.supplierName) existing.supplierName = entry.supplierName;
          } else if (refNo) {
            challanMap.set(refNo, {
              challanNo: entry.referenceNo || 'চালান',
              date: entry.date || '',
              supplierName: entry.supplierName || product.supplierName || 'কোম্পানি চালান',
              quantity: qty,
              costPrice: cost,
              totalPrice: qty * cost,
              source: 'LEDGER_ENTRY',
            });
          }
        }
      });
    });
  }

  const challans = Array.from(challanMap.values()).sort((a, b) => {
    return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
  });

  const sumQty = challans.reduce((sum, c) => sum + c.quantity, 0);
  const totalPurchaseCost = challans.reduce((sum, c) => sum + c.totalPrice, 0);
  const currentStock = Number(product.stockQuantity) || 0;

  return {
    totalPurchasedQty: sumQty > 0 ? sumQty : currentStock,
    totalPurchaseCost,
    challans,
    currentStock,
  };
};
