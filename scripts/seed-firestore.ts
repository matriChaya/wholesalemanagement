import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import config from '../firebase-applet-config.json';
import {
  initialUsers,
  initialSuppliers,
  initialProducts,
  initialRetailers,
  initialSupplierLedger,
  initialOrders,
  initialCashTransfers,
  initialCapitalTransactions,
  initialReplacements,
  initialBankAccounts,
  initialActivityLogs,
} from '../src/data/mockData';

const app = initializeApp(config);
const db = getFirestore(app, (config as any).firestoreDatabaseId);

function cleanPayload(data: any): any {
  return JSON.parse(JSON.stringify(data));
}

async function seed() {
  console.log('Seeding 23 sales invoices and wholesale data into Firestore...');
  
  // 1. Orders (23 sales invoices)
  console.log(`Writing ${initialOrders.length} orders...`);
  for (const o of initialOrders) {
    await setDoc(doc(db, 'orders', o.id), cleanPayload(o), { merge: true });
  }

  // 2. Retailers (12 retailers)
  console.log(`Writing ${initialRetailers.length} retailers...`);
  for (const r of initialRetailers) {
    await setDoc(doc(db, 'retailers', r.id), cleanPayload(r), { merge: true });
  }

  // 3. Products
  console.log(`Writing ${initialProducts.length} products...`);
  for (const p of initialProducts) {
    await setDoc(doc(db, 'products', p.id), cleanPayload(p), { merge: true });
  }

  // 4. Users (Admin, Counter, DSR Razo Alom)
  console.log(`Writing ${initialUsers.length} users...`);
  for (const u of initialUsers) {
    await setDoc(doc(db, 'users', u.id), cleanPayload(u), { merge: true });
  }

  // 5. Cash Transfers
  console.log(`Writing ${initialCashTransfers.length} cash transfers...`);
  for (const t of initialCashTransfers) {
    await setDoc(doc(db, 'cash_transfers', t.id), cleanPayload(t), { merge: true });
  }

  // 6. Capital Transactions
  console.log(`Writing ${initialCapitalTransactions.length} capital transactions...`);
  for (const c of initialCapitalTransactions) {
    await setDoc(doc(db, 'capital_transactions', c.id), cleanPayload(c), { merge: true });
  }

  // 7. Suppliers & Ledger
  console.log(`Writing ${initialSuppliers.length} suppliers and ${initialSupplierLedger.length} ledger entries...`);
  for (const s of initialSuppliers) {
    await setDoc(doc(db, 'suppliers', s.id), cleanPayload(s), { merge: true });
  }
  for (const l of initialSupplierLedger) {
    await setDoc(doc(db, 'supplier_ledger', l.id), cleanPayload(l), { merge: true });
  }

  // 8. Bank Accounts
  console.log(`Writing ${initialBankAccounts.length} bank accounts...`);
  for (const b of initialBankAccounts) {
    await setDoc(doc(db, 'bank_accounts', b.id), cleanPayload(b), { merge: true });
  }

  console.log('Done seeding Firestore successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
