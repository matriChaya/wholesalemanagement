import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
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
} from '../src/data/mockData';

const app = initializeApp(config);
const db = getFirestore(app, (config as any).firestoreDatabaseId);

function cleanPayload(data: any): any {
  return JSON.parse(JSON.stringify(data));
}

async function cleanAndSeed() {
  console.log('Cleaning old fake data and seeding authentic data into Firestore...');

  // 1. Delete all existing orders from Firestore to remove any fake/bogus ones completely
  try {
    const ordersSnap = await getDocs(collection(db, 'orders'));
    console.log(`Found ${ordersSnap.size} existing orders in Firestore, deleting legacy orders...`);
    for (const d of ordersSnap.docs) {
      await deleteDoc(doc(db, 'orders', d.id));
    }
  } catch (err) {
    console.warn('Error reading/deleting old orders:', err);
  }

  // 2. Delete all existing retailers to purge fake ones (ret_6 to ret_12)
  try {
    const retSnap = await getDocs(collection(db, 'retailers'));
    console.log(`Found ${retSnap.size} existing retailers in Firestore, cleaning up...`);
    for (const d of retSnap.docs) {
      await deleteDoc(doc(db, 'retailers', d.id));
    }
  } catch (err) {
    console.warn('Error reading/deleting old retailers:', err);
  }

  // 3. Write clean authentic 16 orders
  console.log(`Writing ${initialOrders.length} authentic orders (7 DSR, 6 Counter, 3 Admin)...`);
  for (const o of initialOrders) {
    await setDoc(doc(db, 'orders', o.id), cleanPayload(o), { merge: true });
  }

  // 4. Write clean authentic 5 retailers
  console.log(`Writing ${initialRetailers.length} authentic retailers...`);
  for (const r of initialRetailers) {
    await setDoc(doc(db, 'retailers', r.id), cleanPayload(r), { merge: true });
  }

  // 5. Write users (Admin, Counter, DSR Razo Alom)
  console.log(`Writing ${initialUsers.length} users with clean cash drawer balances...`);
  for (const u of initialUsers) {
    await setDoc(doc(db, 'users', u.id), cleanPayload(u), { merge: true });
  }

  // 6. Write cash transfers
  console.log(`Writing ${initialCashTransfers.length} cash transfers...`);
  for (const t of initialCashTransfers) {
    await setDoc(doc(db, 'cash_transfers', t.id), cleanPayload(t), { merge: true });
  }

  // 7. Write capital transactions
  console.log(`Writing ${initialCapitalTransactions.length} capital transactions...`);
  for (const c of initialCapitalTransactions) {
    await setDoc(doc(db, 'capital_transactions', c.id), cleanPayload(c), { merge: true });
  }

  // 8. Write products
  console.log(`Writing ${initialProducts.length} products...`);
  for (const p of initialProducts) {
    await setDoc(doc(db, 'products', p.id), cleanPayload(p), { merge: true });
  }

  // 9. Write suppliers & ledger
  console.log(`Writing ${initialSuppliers.length} suppliers and ${initialSupplierLedger.length} ledger entries...`);
  for (const s of initialSuppliers) {
    await setDoc(doc(db, 'suppliers', s.id), cleanPayload(s), { merge: true });
  }
  for (const l of initialSupplierLedger) {
    await setDoc(doc(db, 'supplier_ledger', l.id), cleanPayload(l), { merge: true });
  }

  // 10. Write bank accounts
  console.log(`Writing ${initialBankAccounts.length} bank accounts...`);
  for (const b of initialBankAccounts) {
    await setDoc(doc(db, 'bank_accounts', b.id), cleanPayload(b), { merge: true });
  }

  console.log('✅ Clean and seed completed successfully!');
  process.exit(0);
}

cleanAndSeed().catch((err) => {
  console.error('Clean and seed error:', err);
  process.exit(1);
});
