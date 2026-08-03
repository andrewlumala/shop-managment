import { useState, useEffect, useMemo } from 'react';
import type {
  InventoryItem,
  SaleRecord,
  Note,
  User,
  CurrentUser,
  Tab,
  Page,
  ToastMessage,
  AppSettings,
  InventorySort,
} from '@/types';
import {
  getUsers,
  saveUsers,
  loadUserInventory,
  saveUserInventory,
  loadUserSales,
  saveUserSales,
  loadUserNotes,
  saveUserNotes,
  loadUserSettings,
  saveUserSettings,
  hasSeededData,
  markSeeded,
} from '@/lib/storage';
import { formatDateDMY, todayISO, startOfWeekISO, startOfMonthISO } from '@/lib/format';
import { formatMoney } from '@/lib/currency';
import { downloadCSV } from '@/lib/csv';
import { downloadJSON, parseBackup } from '@/lib/backup';
import { ToastContainer } from '@/components/Toast';
import { ConfirmDialog, type ConfirmState } from '@/components/ConfirmDialog';
import { EditItemModal } from '@/components/EditItemModal';
import { SettingsPanel } from '@/components/SettingsPanel';
import { RevenueChart } from '@/components/RevenueChart';
import { Pagination } from '@/components/Pagination';

// Sample data — only used to seed a brand-new account's first sign-in.
const initialInventory: InventoryItem[] = [
  { id: 'ITM-001', name: 'Body Lotion 250ml', buyingPrice: 8000, sellingPrice: 12000, currentStock: 25, reorderLevel: 5 },
  { id: 'ITM-002', name: 'Bathing Soap (pack)', buyingPrice: 4500, sellingPrice: 6000, currentStock: 3, reorderLevel: 3 },
  { id: 'ITM-003', name: 'sugar', buyingPrice: 3000, sellingPrice: 4000, currentStock: 50, reorderLevel: 10 },
];

const initialSales: SaleRecord[] = [
  { id: '1', date: '2026-07-19', itemName: 'Body Lotion 250ml', quantitySold: 2, totalRevenue: 24000, totalProfit: 8000 },
  { id: '2', date: '2026-07-19', itemName: 'sugar', quantitySold: 4, totalRevenue: 16000, totalProfit: 4000 },
];

const DEFAULT_SETTINGS: AppSettings = { businessName: 'Kikuubo Wholesale Tracker', currency: 'UGX' };
const INVENTORY_PAGE_SIZE = 8;
const SALES_PAGE_SIZE = 10;

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [newNote, setNewNote] = useState('');
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [inventorySearch, setInventorySearch] = useState('');
  const [salesSearch, setSalesSearch] = useState('');
  const [salesFrom, setSalesFrom] = useState('');
  const [salesTo, setSalesTo] = useState('');
  const [inventorySort, setInventorySort] = useState<InventorySort | null>(null);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);

  const addToast = (message: string, type: ToastMessage['type'] = 'info') => {
    const id = String(Date.now() + Math.random());
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };
  const dismissToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Restore session on mount
  useEffect(() => {
    const savedLogin = localStorage.getItem('wholesale-logged-in');
    const savedUser = localStorage.getItem('wholesale-current-user');
    if (savedLogin === 'true' && savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setPage('app');
    }
  }, []);

  // Load this user's data whenever they sign in (each account has its own
  // inventory / sales / notes / settings, namespaced by username).
  useEffect(() => {
    if (!currentUser) {
      setDataLoaded(false);
      return;
    }
    if (!hasSeededData(currentUser.username)) {
      setInventory(initialInventory);
      setSales(initialSales);
      markSeeded(currentUser.username);
    } else {
      setInventory(loadUserInventory(currentUser.username, []));
      setSales(loadUserSales(currentUser.username, []));
    }
    setNotes(loadUserNotes(currentUser.username));
    setSettings(loadUserSettings(currentUser.username));
    setDataLoaded(true);
  }, [currentUser]);

  // Persist on change (skip the very first render after login so we don't
  // immediately overwrite freshly-loaded data with empty state).
  useEffect(() => {
    if (currentUser && dataLoaded) saveUserInventory(currentUser.username, inventory);
  }, [inventory, currentUser, dataLoaded]);

  useEffect(() => {
    if (currentUser && dataLoaded) saveUserSales(currentUser.username, sales);
  }, [sales, currentUser, dataLoaded]);

  useEffect(() => {
    if (currentUser && dataLoaded) saveUserNotes(currentUser.username, notes);
  }, [notes, currentUser, dataLoaded]);

  useEffect(() => {
    if (currentUser && dataLoaded) saveUserSettings(currentUser.username, settings);
  }, [settings, currentUser, dataLoaded]);

  // Handle registration
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerForm.name || !registerForm.username || !registerForm.password) {
      setRegisterError('Please fill in all fields');
      return;
    }
    if (registerForm.password.length < 4) {
      setRegisterError('Password must be at least 4 characters');
      return;
    }

    const users = getUsers();

    if (users.find((u) => u.username.toLowerCase() === registerForm.username.toLowerCase())) {
      setRegisterError('Username already taken. Please choose another.');
      return;
    }

    const newUser: User = {
      name: registerForm.name,
      username: registerForm.username,
      password: registerForm.password,
    };

    users.push(newUser);
    saveUsers(users);

    setCurrentUser({ name: newUser.name, username: newUser.username });
    localStorage.setItem('wholesale-logged-in', 'true');
    localStorage.setItem('wholesale-current-user', JSON.stringify({ name: newUser.name, username: newUser.username }));
    setPage('app');
    setRegisterError('');
  };

  // Handle login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginForm.username || !loginForm.password) {
      setLoginError('Please enter username and password');
      return;
    }

    const users = getUsers();
    const user = users.find((u) => u.username === loginForm.username && u.password === loginForm.password);

    if (user) {
      setCurrentUser({ name: user.name, username: user.username });
      localStorage.setItem('wholesale-logged-in', 'true');
      localStorage.setItem('wholesale-current-user', JSON.stringify({ name: user.name, username: user.username }));
      setPage('app');
      setLoginError('');
    } else {
      setLoginError('Invalid username or password');
    }
  };

  // Handle logout
  const handleLogout = () => {
    setCurrentUser(null);
    setInventory([]);
    setSales([]);
    setNotes([]);
    setSettings(DEFAULT_SETTINGS);
    setPage('home');
    localStorage.removeItem('wholesale-logged-in');
    localStorage.removeItem('wholesale-current-user');
    setSideMenuOpen(false);
  };

  // Notes
  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const note: Note = { id: String(Date.now()), content: newNote, createdAt: new Date().toISOString() };
    setNotes([note, ...notes]);
    setNewNote('');
  };

  const handleDeleteNote = (id: string) => {
    setConfirmState({
      title: 'Delete note?',
      message: 'This note will be permanently removed.',
      onConfirm: () => {
        setNotes(notes.filter((note) => note.id !== id));
        addToast('Note deleted', 'info');
      },
    });
  };

  const handleUpdateNote = (id: string, content: string) => {
    setNotes(notes.map((note) => (note.id === id ? { ...note, content } : note)));
  };

  // Settings, account, and data-management handlers
  const handleSaveSettings = (next: AppSettings) => {
    setSettings(next);
    addToast('Business settings saved', 'success');
  };

  const handleChangePassword = (current: string, next: string): { success: boolean; error?: string } => {
    if (!currentUser) return { success: false, error: 'Not signed in.' };
    const users = getUsers();
    const idx = users.findIndex((u) => u.username === currentUser.username);
    if (idx === -1 || users[idx].password !== current) {
      return { success: false, error: 'Current password is incorrect.' };
    }
    users[idx] = { ...users[idx], password: next };
    saveUsers(users);
    return { success: true };
  };

  const handleExportBackup = () => {
    if (!currentUser) return;
    downloadJSON(`kikuubo-backup-${currentUser.username}-${todayISO()}.json`, {
      exportedAt: new Date().toISOString(),
      username: currentUser.username,
      inventory,
      sales,
      notes,
      settings,
    });
    addToast('Backup downloaded', 'success');
  };

  const handleImportBackup = (raw: string) => {
    const backup = parseBackup(raw);
    if (!backup) {
      addToast('That file doesn\u2019t look like a valid backup', 'error');
      return;
    }
    setConfirmState({
      title: 'Restore this backup?',
      message: `This will replace your current inventory, sales, and notes with the contents of the backup file (exported ${formatDateDMY(backup.exportedAt)}).`,
      onConfirm: () => {
        setInventory(backup.inventory);
        setSales(backup.sales);
        setNotes(backup.notes);
        setSettings(backup.settings);
        addToast('Backup restored', 'success');
      },
    });
  };

  const handleClearData = () => {
    setConfirmState({
      title: 'Clear all data?',
      message: 'This permanently deletes every item, sale, and note on this account. This cannot be undone.',
      onConfirm: () => {
        setInventory([]);
        setSales([]);
        setNotes([]);
        addToast('All data cleared', 'info');
      },
    });
  };

  // New item form state
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({});
  const [newSale, setNewSale] = useState<Partial<SaleRecord>>({ date: todayISO() });

  const today = todayISO();
  const weekStart = startOfWeekISO();
  const monthStart = startOfMonthISO();

  const todaySales = useMemo(() => sales.filter((s) => s.date === today), [sales, today]);
  const weekSales = useMemo(() => sales.filter((s) => s.date >= weekStart), [sales, weekStart]);
  const monthSales = useMemo(() => sales.filter((s) => s.date >= monthStart), [sales, monthStart]);

  const totalRevenueToday = todaySales.reduce((sum, s) => sum + s.totalRevenue, 0);
  const totalProfitToday = todaySales.reduce((sum, s) => sum + s.totalProfit, 0);
  const totalRevenueWeek = weekSales.reduce((sum, s) => sum + s.totalRevenue, 0);
  const totalProfitWeek = weekSales.reduce((sum, s) => sum + s.totalProfit, 0);
  const totalRevenueMonth = monthSales.reduce((sum, s) => sum + s.totalRevenue, 0);
  const totalProfitMonth = monthSales.reduce((sum, s) => sum + s.totalProfit, 0);
  const inventoryValue = useMemo(() => inventory.reduce((sum, i) => sum + i.buyingPrice * i.currentStock, 0), [inventory]);

  const topItems = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sales) counts.set(s.itemName, (counts.get(s.itemName) || 0) + s.quantitySold);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [sales]);

  const lowStockItems = useMemo(() => inventory.filter((i) => i.currentStock <= i.reorderLevel), [inventory]);

  // Add new inventory item
  const handleAddItem = () => {
    if (!newItem.name?.trim()) {
      addToast('Item name is required', 'error');
      return;
    }
    if (!newItem.buyingPrice || !newItem.sellingPrice) {
      addToast('Buying and selling price are required', 'error');
      return;
    }
    if (inventory.some((i) => i.name.toLowerCase() === newItem.name!.trim().toLowerCase())) {
      addToast('An item with this name already exists', 'error');
      return;
    }

    const item: InventoryItem = {
      id: `ITM-${String(inventory.length + 1).padStart(3, '0')}`,
      name: newItem.name!.trim(),
      buyingPrice: Number(newItem.buyingPrice),
      sellingPrice: Number(newItem.sellingPrice),
      currentStock: Number(newItem.currentStock) || 0,
      reorderLevel: Number(newItem.reorderLevel) || 5,
    };

    setInventory([...inventory, item]);
    setNewItem({});
    addToast(`${item.name} added to inventory`, 'success');
  };

  const handleSaveEditedItem = (updated: InventoryItem) => {
    setInventory(inventory.map((i) => (i.id === updated.id ? updated : i)));
    setEditingItem(null);
    addToast(`${updated.name} updated`, 'success');
  };

  // Update inventory stock
  const updateStock = (id: string, delta: number) => {
    setInventory(inventory.map((item) => (item.id === id ? { ...item, currentStock: Math.max(0, item.currentStock + delta) } : item)));
  };

  // Record a sale
  const handleRecordSale = () => {
    if (!newSale.itemName || !newSale.quantitySold) {
      addToast('Select an item and enter a quantity', 'error');
      return;
    }

    const item = inventory.find((i) => i.name === newSale.itemName);
    if (!item) {
      addToast('Item not found', 'error');
      return;
    }
    if (item.currentStock < (newSale.quantitySold || 0)) {
      addToast(`Not enough stock — only ${item.currentStock} left`, 'error');
      return;
    }

    const quantity = Number(newSale.quantitySold);
    const revenue = quantity * item.sellingPrice;
    const profit = quantity * (item.sellingPrice - item.buyingPrice);

    const sale: SaleRecord = {
      id: String(Date.now()),
      date: newSale.date || today,
      itemName: newSale.itemName,
      quantitySold: quantity,
      totalRevenue: revenue,
      totalProfit: profit,
    };

    setSales([...sales, sale]);
    updateStock(item.id, -quantity);
    setNewSale({ date: today });
    addToast(`Sale recorded: ${quantity} × ${item.name}`, 'success');
  };

  // Delete inventory item
  const deleteItem = (id: string) => {
    const item = inventory.find((i) => i.id === id);
    setConfirmState({
      title: 'Delete item?',
      message: `"${item?.name}" will be permanently removed from inventory.`,
      onConfirm: () => {
        setInventory(inventory.filter((i) => i.id !== id));
        addToast(`${item?.name} removed`, 'info');
      },
    });
  };

  // Delete sale record
  const deleteSale = (id: string) => {
    setConfirmState({
      title: 'Delete sale record?',
      message: 'This will remove the sale from your log. Stock levels will not be restored automatically.',
      onConfirm: () => {
        setSales(sales.filter((sale) => sale.id !== id));
        addToast('Sale record deleted', 'info');
      },
    });
  };

  // Navigate to tab and close mobile menu
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSideMenuOpen(false);
  };

  const filteredInventory = useMemo(() => {
    const q = inventorySearch.trim().toLowerCase();
    if (!q) return inventory;
    return inventory.filter((i) => i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q));
  }, [inventory, inventorySearch]);

  const sortedInventory = useMemo(() => {
    if (!inventorySort) return filteredInventory;
    const { key, direction } = inventorySort;
    return [...filteredInventory].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      const cmp = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : Number(av) - Number(bv);
      return direction === 'asc' ? cmp : -cmp;
    });
  }, [filteredInventory, inventorySort]);

  const inventoryPageCount = Math.max(1, Math.ceil(sortedInventory.length / INVENTORY_PAGE_SIZE));
  const clampedInventoryPage = Math.min(inventoryPage, inventoryPageCount);
  const paginatedInventory = sortedInventory.slice(
    (clampedInventoryPage - 1) * INVENTORY_PAGE_SIZE,
    clampedInventoryPage * INVENTORY_PAGE_SIZE
  );

  const handleSortInventory = (key: InventorySort['key']) => {
    setInventorySort((prev) => (prev?.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }));
    setInventoryPage(1);
  };

  const sortIndicator = (key: InventorySort['key']) => {
    if (inventorySort?.key !== key) return null;
    return <span className="text-cyan-400">{inventorySort.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  const filteredSales = useMemo(() => {
    const q = salesSearch.trim().toLowerCase();
    return sales
      .filter((s) => !q || s.itemName.toLowerCase().includes(q) || s.date.includes(q))
      .filter((s) => !salesFrom || s.date >= salesFrom)
      .filter((s) => !salesTo || s.date <= salesTo)
      .slice()
      .reverse();
  }, [sales, salesSearch, salesFrom, salesTo]);

  const salesFiltersActive = Boolean(salesSearch || salesFrom || salesTo);

  const salesPageCount = Math.max(1, Math.ceil(filteredSales.length / SALES_PAGE_SIZE));
  const clampedSalesPage = Math.min(salesPage, salesPageCount);
  const paginatedSales = filteredSales.slice((clampedSalesPage - 1) * SALES_PAGE_SIZE, clampedSalesPage * SALES_PAGE_SIZE);

  const exportInventoryCSV = () => {
    downloadCSV(
      `kikuubo-inventory-${today}.csv`,
      ['Item ID', 'Item Name', 'Buying Price', 'Selling Price', 'Current Stock', 'Reorder Level'],
      sortedInventory.map((i) => [i.id, i.name, i.buyingPrice, i.sellingPrice, i.currentStock, i.reorderLevel])
    );
    addToast('Inventory exported', 'success');
  };

  const exportSalesCSV = () => {
    downloadCSV(
      `kikuubo-sales-${today}.csv`,
      ['Date', 'Item Name', 'Qty Sold', 'Revenue', 'Profit'],
      filteredSales.map((s) => [s.date, s.itemName, s.quantitySold, s.totalRevenue, s.totalProfit])
    );
    addToast('Sales log exported', 'success');
  };

  const money = (amount: number) => formatMoney(amount, settings.currency);

  // ============ HOME PAGE ============
  if (page === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-white">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-2xl shadow-cyan-500/30">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="mt-8 text-5xl font-bold tracking-tight">KIKUUBO WHOLESALE TRACKER</h1>
              <p className="mt-4 text-xl text-neutral-400 max-w-2xl mx-auto">
                Manage your inventory, track sales, and monitor profits all in one place.
                Perfect for wholesale businesses.
              </p>

              {/* CTA Buttons */}
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setPage('register')}
                  className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-emerald-600 transition-all shadow-lg shadow-cyan-500/30"
                >
                  Create Account
                </button>
                <button
                  onClick={() => setPage('login')}
                  className="px-8 py-4 bg-neutral-800 text-white font-semibold rounded-xl hover:bg-neutral-700 transition-all border border-neutral-700"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-neutral-900/50 rounded-2xl p-8 border border-neutral-800">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Inventory Management</h3>
              <p className="text-neutral-400">Track stock levels, set reorder points, and never run out of products.</p>
            </div>

            <div className="bg-neutral-900/50 rounded-2xl p-8 border border-neutral-800">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Sales Tracking</h3>
              <p className="text-neutral-400">Record sales instantly and track revenue and profits in real-time.</p>
            </div>

            <div className="bg-neutral-900/50 rounded-2xl p-8 border border-neutral-800">
              <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Analytics Dashboard</h3>
              <p className="text-neutral-400">Get insights into your business performance with visual dashboards.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-neutral-800 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-cyan-500/50">
                <img src="/andrew-profile.jpg" alt="Andrew Lumala" className="w-full h-full object-cover" />
              </div>
              <p className="text-neutral-400">
                Built by <span className="text-cyan-400 font-semibold">Andrew Lumala</span>
              </p>
              <p className="text-neutral-600 text-sm">
                Kikuubo Wholesale Tracker © {new Date().getFullYear()} - All rights reserved
              </p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // ============ LOGIN PAGE ============
  if (page === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <button onClick={() => setPage('home')} className="mb-8 flex items-center gap-2 text-neutral-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </button>

          <div className="bg-neutral-900/50 rounded-2xl p-8 border border-neutral-800">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="mt-4 text-2xl font-bold">Welcome Back</h2>
              <p className="text-neutral-400 mt-2">Sign in to access your dashboard</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Username</label>
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  placeholder="Enter your password"
                />
              </div>

              {loginError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{loginError}</div>
              )}

              <button
                type="submit"
                className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-emerald-600 transition-all shadow-lg shadow-cyan-500/30"
              >
                Sign In
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-neutral-500 text-sm">
                Don't have an account?{' '}
                <button onClick={() => setPage('register')} className="text-cyan-400 hover:text-cyan-300 font-medium">
                  Create one
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============ REGISTER PAGE ============
  if (page === 'register') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <button onClick={() => setPage('home')} className="mb-8 flex items-center gap-2 text-neutral-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </button>

          <div className="bg-neutral-900/50 rounded-2xl p-8 border border-neutral-800">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h2 className="mt-4 text-2xl font-bold">Create Account</h2>
              <p className="text-neutral-400 mt-2">Start tracking your wholesale business</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Full Name</label>
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Username</label>
                <input
                  type="text"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  placeholder="Choose a username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Password</label>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  placeholder="Create a password"
                />
              </div>

              {registerError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{registerError}</div>
              )}

              <button
                type="submit"
                className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-emerald-600 transition-all shadow-lg shadow-cyan-500/30"
              >
                Create Account
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-neutral-500 text-sm">
                Already have an account?{' '}
                <button onClick={() => setPage('login')} className="text-cyan-400 hover:text-cyan-300 font-medium">
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  // ============ MAIN APP ============
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <ConfirmDialog state={confirmState} onCancel={() => setConfirmState(null)} />
      {editingItem && (
        <EditItemModal item={editingItem} onSave={handleSaveEditedItem} onClose={() => setEditingItem(null)} />
      )}

      {/* Side Menu Overlay */}
      {sideMenuOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSideMenuOpen(false)} />}

      {/* Side Menu */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-neutral-900 border-r border-neutral-800 z-50 transform transition-transform duration-300 lg:translate-x-0 ${sideMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="font-bold text-lg block truncate">{settings.businessName}</span>
              <span className="text-xs text-neutral-400">{currentUser.name}</span>
            </div>
          </div>

          <nav className="space-y-2 flex-1">
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-cyan-500/10 text-cyan-400' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </button>

            <button
              onClick={() => handleTabChange('inventory')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'inventory' ? 'bg-cyan-500/10 text-cyan-400' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Inventory
              {lowStockItems.length > 0 && (
                <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">{lowStockItems.length}</span>
              )}
            </button>

            <button
              onClick={() => handleTabChange('sales')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'sales' ? 'bg-cyan-500/10 text-cyan-400' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Sales Log
            </button>

            <button
              onClick={() => handleTabChange('notes')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'notes' ? 'bg-cyan-500/10 text-cyan-400' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Notes
            </button>

            <button
              onClick={() => handleTabChange('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-cyan-500/10 text-cyan-400' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>
          </nav>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-neutral-400 hover:bg-red-500/10 hover:text-red-400 transition-all mt-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:ml-72">
        <header className="sticky top-0 z-30 bg-neutral-900/80 backdrop-blur-sm border-b border-neutral-800">
          <div className="flex items-center justify-between h-16 px-4">
            <button onClick={() => setSideMenuOpen(true)} className="lg:hidden p-2 text-neutral-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <h1 className="text-lg font-semibold capitalize">{activeTab}</h1>

            <div className="text-sm text-neutral-400">{formatDateDMY(new Date().toISOString())}</div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {lowStockItems.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
                  <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-amber-400 text-sm">
                    {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} low on stock:{' '}
                    <span className="font-medium">{lowStockItems.map((i) => i.name).join(', ')}</span>
                  </p>
                </div>
              )}

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-xl p-6 border border-neutral-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-cyan-400 text-sm font-medium uppercase tracking-wider">Revenue Today</p>
                      <p className="text-2xl font-bold text-white mt-2">{money(totalRevenueToday)}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center">
                      <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-xl p-6 border border-neutral-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-400 text-sm font-medium uppercase tracking-wider">Profit Today</p>
                      <p className="text-2xl font-bold text-white mt-2">{money(totalProfitToday)}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-xl p-6 border border-neutral-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-violet-400 text-sm font-medium uppercase tracking-wider">Total Items</p>
                      <p className="text-2xl font-bold text-white mt-2">{inventory.length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center">
                      <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-xl p-6 border border-neutral-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-400 text-sm font-medium uppercase tracking-wider">Low Stock</p>
                      <p className="text-2xl font-bold text-white mt-2">{lowStockItems.length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Weekly / Monthly / Inventory value summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-6">
                  <p className="text-neutral-400 text-sm font-medium uppercase tracking-wider mb-3">This Week</p>
                  <div className="flex justify-between items-baseline">
                    <span className="text-neutral-500 text-sm">Revenue</span>
                    <span className="text-lg font-semibold text-cyan-400">{money(totalRevenueWeek)}</span>
                  </div>
                  <div className="flex justify-between items-baseline mt-2">
                    <span className="text-neutral-500 text-sm">Profit</span>
                    <span className="text-lg font-semibold text-emerald-400">{money(totalProfitWeek)}</span>
                  </div>
                </div>
                <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-6">
                  <p className="text-neutral-400 text-sm font-medium uppercase tracking-wider mb-3">This Month</p>
                  <div className="flex justify-between items-baseline">
                    <span className="text-neutral-500 text-sm">Revenue</span>
                    <span className="text-lg font-semibold text-cyan-400">{money(totalRevenueMonth)}</span>
                  </div>
                  <div className="flex justify-between items-baseline mt-2">
                    <span className="text-neutral-500 text-sm">Profit</span>
                    <span className="text-lg font-semibold text-emerald-400">{money(totalProfitMonth)}</span>
                  </div>
                </div>
                <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-6">
                  <p className="text-neutral-400 text-sm font-medium uppercase tracking-wider mb-3">Inventory Value</p>
                  <div className="flex justify-between items-baseline">
                    <span className="text-neutral-500 text-sm">At cost</span>
                    <span className="text-lg font-semibold text-violet-400">{money(inventoryValue)}</span>
                  </div>
                  <div className="flex justify-between items-baseline mt-2">
                    <span className="text-neutral-500 text-sm">Items tracked</span>
                    <span className="text-lg font-semibold text-white">{inventory.length}</span>
                  </div>
                </div>
              </div>

              {/* Revenue Chart */}
              <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-800">
                  <h3 className="text-lg font-semibold text-white">Revenue — Last 7 Days</h3>
                </div>
                <div className="p-6">
                  <RevenueChart sales={sales} currency={settings.currency} />
                </div>
              </div>

              {/* Top Selling Items + Recent Sales */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 overflow-hidden">
                  <div className="px-6 py-4 border-b border-neutral-800">
                    <h3 className="text-lg font-semibold text-white">Top Selling Items</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {topItems.length === 0 && <p className="text-neutral-500 text-sm">No sales recorded yet.</p>}
                    {topItems.map(([name, qty], idx) => (
                      <div key={name} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-400 text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="flex-1 text-sm text-white truncate">{name}</span>
                        <span className="text-sm text-cyan-400 font-medium">{qty} sold</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2 bg-neutral-900/50 rounded-xl border border-neutral-800 overflow-hidden">
                  <div className="px-6 py-4 border-b border-neutral-800">
                    <h3 className="text-lg font-semibold text-white">Recent Sales</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-neutral-800/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Item</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Qty</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Revenue</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800">
                        {sales
                          .slice(-5)
                          .reverse()
                          .map((sale) => (
                            <tr key={sale.id} className="hover:bg-neutral-800/30">
                              <td className="px-6 py-4 text-sm text-neutral-300">{sale.date}</td>
                              <td className="px-6 py-4 text-sm text-white">{sale.itemName}</td>
                              <td className="px-6 py-4 text-sm text-neutral-300">{sale.quantitySold}</td>
                              <td className="px-6 py-4 text-sm text-cyan-400">{money(sale.totalRevenue)}</td>
                              <td className="px-6 py-4 text-sm text-emerald-400">{money(sale.totalProfit)}</td>
                            </tr>
                          ))}
                        {sales.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-neutral-500 text-sm">
                              No sales recorded yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              {/* Add New Item Form */}
              <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Add New Item</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  <input
                    type="text"
                    placeholder="Item Name"
                    value={newItem.name || ''}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    type="number"
                    placeholder="Buying Price"
                    value={newItem.buyingPrice || ''}
                    onChange={(e) => setNewItem({ ...newItem, buyingPrice: Number(e.target.value) })}
                    className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    type="number"
                    placeholder="Selling Price"
                    value={newItem.sellingPrice || ''}
                    onChange={(e) => setNewItem({ ...newItem, sellingPrice: Number(e.target.value) })}
                    className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    type="number"
                    placeholder="Current Stock"
                    value={newItem.currentStock || ''}
                    onChange={(e) => setNewItem({ ...newItem, currentStock: Number(e.target.value) })}
                    className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    type="number"
                    placeholder="Reorder Level"
                    value={newItem.reorderLevel || ''}
                    onChange={(e) => setNewItem({ ...newItem, reorderLevel: Number(e.target.value) })}
                    className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <button
                    onClick={handleAddItem}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-emerald-600 transition-all"
                  >
                    Add Item
                  </button>
                </div>
              </div>

              {/* Inventory Table */}
              <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h3 className="text-lg font-semibold text-white">
                    Inventory Master <span className="text-neutral-500 font-normal text-sm">({sortedInventory.length})</span>
                  </h3>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={inventorySearch}
                      onChange={(e) => {
                        setInventorySearch(e.target.value);
                        setInventoryPage(1);
                      }}
                      className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <button
                      onClick={exportInventoryCSV}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm text-neutral-300 whitespace-nowrap transition-all"
                    >
                      Export CSV
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-800/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Item ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">
                          <button onClick={() => handleSortInventory('name')} className="flex items-center gap-1 hover:text-white transition-colors">
                            Item Name {sortIndicator('name')}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">
                          <button onClick={() => handleSortInventory('buyingPrice')} className="flex items-center gap-1 hover:text-white transition-colors">
                            Buying Price {sortIndicator('buyingPrice')}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">
                          <button onClick={() => handleSortInventory('sellingPrice')} className="flex items-center gap-1 hover:text-white transition-colors">
                            Selling Price {sortIndicator('sellingPrice')}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">
                          <button onClick={() => handleSortInventory('currentStock')} className="flex items-center gap-1 hover:text-white transition-colors">
                            Stock {sortIndicator('currentStock')}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {paginatedInventory.map((item) => (
                        <tr key={item.id} className="hover:bg-neutral-800/30">
                          <td className="px-6 py-4 text-sm text-neutral-400 font-mono">{item.id}</td>
                          <td className="px-6 py-4 text-sm text-white">{item.name}</td>
                          <td className="px-6 py-4 text-sm text-neutral-300">{money(item.buyingPrice)}</td>
                          <td className="px-6 py-4 text-sm text-cyan-400">{money(item.sellingPrice)}</td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateStock(item.id, -1)} className="w-6 h-6 rounded bg-neutral-700 hover:bg-neutral-600 flex items-center justify-center">-</button>
                              <span className={item.currentStock <= item.reorderLevel ? 'text-amber-400' : 'text-white'}>{item.currentStock}</span>
                              <button onClick={() => updateStock(item.id, 1)} className="w-6 h-6 rounded bg-neutral-700 hover:bg-neutral-600 flex items-center justify-center">+</button>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {item.currentStock <= item.reorderLevel ? (
                              <span className="px-2 py-1 text-xs bg-amber-500/20 text-amber-400 rounded-full">Low Stock</span>
                            ) : (
                              <span className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">In Stock</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <button onClick={() => setEditingItem(item)} className="text-cyan-400 hover:text-cyan-300">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-300">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {paginatedInventory.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-neutral-500 text-sm">
                            {inventory.length === 0 ? 'No items in inventory yet. Add your first item above!' : 'No items match your search.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={clampedInventoryPage}
                  pageCount={inventoryPageCount}
                  total={sortedInventory.length}
                  pageSize={INVENTORY_PAGE_SIZE}
                  onPageChange={setInventoryPage}
                />
              </div>
            </div>
          )}

          {/* Sales Tab */}
          {activeTab === 'sales' && (
            <div className="space-y-6">
              {/* Record Sale Form */}
              <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Record New Sale</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <input
                    type="date"
                    value={newSale.date || ''}
                    onChange={(e) => setNewSale({ ...newSale, date: e.target.value })}
                    className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <select
                    value={newSale.itemName || ''}
                    onChange={(e) => setNewSale({ ...newSale, itemName: e.target.value })}
                    className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Select Item</option>
                    {inventory.map((item) => (
                      <option key={item.id} value={item.name}>
                        {item.name} (Stock: {item.currentStock})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={newSale.quantitySold || ''}
                    onChange={(e) => setNewSale({ ...newSale, quantitySold: Number(e.target.value) })}
                    className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <button
                    onClick={handleRecordSale}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-emerald-600 transition-all"
                  >
                    Record Sale
                  </button>
                </div>
              </div>

              {/* Sales Table */}
              <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h3 className="text-lg font-semibold text-white">
                      Daily Sales Log <span className="text-neutral-500 font-normal text-sm">({filteredSales.length})</span>
                    </h3>
                    <button
                      onClick={exportSalesCSV}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm text-neutral-300 whitespace-nowrap transition-all self-start sm:self-auto"
                    >
                      Export CSV
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      type="text"
                      placeholder="Search by item or date..."
                      value={salesSearch}
                      onChange={(e) => {
                        setSalesSearch(e.target.value);
                        setSalesPage(1);
                      }}
                      className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 flex-1"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={salesFrom}
                        onChange={(e) => {
                          setSalesFrom(e.target.value);
                          setSalesPage(1);
                        }}
                        className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                      <span className="text-neutral-500 text-sm">to</span>
                      <input
                        type="date"
                        value={salesTo}
                        onChange={(e) => {
                          setSalesTo(e.target.value);
                          setSalesPage(1);
                        }}
                        className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                      {salesFiltersActive && (
                        <button
                          onClick={() => {
                            setSalesSearch('');
                            setSalesFrom('');
                            setSalesTo('');
                            setSalesPage(1);
                          }}
                          className="text-xs text-neutral-500 hover:text-white whitespace-nowrap"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-800/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Item Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Qty Sold</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Revenue</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Profit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {paginatedSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-neutral-800/30">
                          <td className="px-6 py-4 text-sm text-neutral-300">{sale.date}</td>
                          <td className="px-6 py-4 text-sm text-white">{sale.itemName}</td>
                          <td className="px-6 py-4 text-sm text-neutral-300">{sale.quantitySold}</td>
                          <td className="px-6 py-4 text-sm text-cyan-400">{money(sale.totalRevenue)}</td>
                          <td className="px-6 py-4 text-sm text-emerald-400">{money(sale.totalProfit)}</td>
                          <td className="px-6 py-4">
                            <button onClick={() => deleteSale(sale.id)} className="text-red-400 hover:text-red-300">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {paginatedSales.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-neutral-500 text-sm">
                            {sales.length === 0 ? 'No sales recorded yet.' : 'No sales match your filters.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={clampedSalesPage}
                  pageCount={salesPageCount}
                  total={filteredSales.length}
                  pageSize={SALES_PAGE_SIZE}
                  onPageChange={setSalesPage}
                />
              </div>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              {/* Add Note */}
              <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Notes</h3>
                <div className="flex gap-4">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Write a quick note..."
                    rows={3}
                    className="flex-1 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                  />
                  <button
                    onClick={handleAddNote}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-medium rounded-xl hover:from-cyan-600 hover:to-emerald-600 transition-all self-end"
                  >
                    Add Note
                  </button>
                </div>
              </div>

              {/* Notes List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {notes.map((note) => (
                  <div key={note.id} className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-xs text-neutral-500">
                        {new Date(note.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <button onClick={() => handleDeleteNote(note.id)} className="text-neutral-500 hover:text-red-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <textarea
                      value={note.content}
                      onChange={(e) => handleUpdateNote(note.id, e.target.value)}
                      className="w-full bg-transparent text-white text-sm resize-none focus:outline-none"
                      rows={4}
                    />
                  </div>
                ))}

                {notes.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <svg className="w-16 h-16 mx-auto text-neutral-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <p className="text-neutral-500">No notes yet. Add your first note above!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <SettingsPanel
              settings={settings}
              onSaveSettings={handleSaveSettings}
              currentUser={currentUser}
              onChangePassword={handleChangePassword}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
              onClearData={handleClearData}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-neutral-800 py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-cyan-500/50">
                  <img src="/andrew-profile.jpg" alt="Andrew Lumala" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-neutral-400 text-sm">
                    Built by <span className="text-cyan-400 font-semibold">Andrew Lumala</span>
                  </p>
                  <p className="text-neutral-600 text-xs">© {new Date().getFullYear()} {settings.businessName}</p>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
