import { useState, useEffect } from 'react';

// Types
interface InventoryItem {
  id: string;
  name: string;
  buyingPrice: number;
  sellingPrice: number;
  currentStock: number;
  reorderLevel: number;
}

interface SaleRecord {
  id: string;
  date: string;
  itemName: string;
  quantitySold: number;
  totalRevenue: number;
  totalProfit: number;
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
}

interface User {
  username: string;
  password: string;
  name: string;
}

// Sample Data
const initialInventory: InventoryItem[] = [
  { id: 'ITM-001', name: 'Body Lotion 250ml', buyingPrice: 8000, sellingPrice: 12000, currentStock: 25, reorderLevel: 5 },
  { id: 'ITM-002', name: 'Bathing Soap (pack)', buyingPrice: 4500, sellingPrice: 6000, currentStock: 3, reorderLevel: 3 },
  { id: 'ITM-003', name: 'sugar', buyingPrice: 3000, sellingPrice: 4000, currentStock: 50, reorderLevel: 10 },
];

const initialSales: SaleRecord[] = [
  { id: '1', date: '2026-07-19', itemName: 'Body Lotion 250ml', quantitySold: 2, totalRevenue: 24000, totalProfit: 8000 },
  { id: '2', date: '2026-07-19', itemName: 'sugar', quantitySold: 4, totalRevenue: 16000, totalProfit: 4000 },
];

type Tab = 'dashboard' | 'inventory' | 'sales' | 'notes';
type Page = 'home' | 'login' | 'register' | 'app';

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [sales, setSales] = useState<SaleRecord[]>(initialSales);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [currentUser, setCurrentUser] = useState<{name: string, username: string} | null>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('wholesale-notes');
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
    
    const savedLogin = localStorage.getItem('wholesale-logged-in');
    const savedUser = localStorage.getItem('wholesale-current-user');
    if (savedLogin === 'true' && savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setPage('app');
    }
  }, []);

  // Save notes to localStorage
  useEffect(() => {
    localStorage.setItem('wholesale-notes', JSON.stringify(notes));
  }, [notes]);

  // Get users from localStorage
  const getUsers = (): User[] => {
    const users = localStorage.getItem('wholesale-users');
    return users ? JSON.parse(users) : [];
  };

  // Handle registration
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registerForm.name || !registerForm.username || !registerForm.password) {
      setRegisterError('Please fill in all fields');
      return;
    }

    const users = getUsers();
    
    // Check if username already exists
    if (users.find(u => u.username === registerForm.username)) {
      setRegisterError('Username already taken. Please choose another.');
      return;
    }

    // Save new user
    const newUser: User = {
      name: registerForm.name,
      username: registerForm.username,
      password: registerForm.password,
    };
    
    users.push(newUser);
    localStorage.setItem('wholesale-users', JSON.stringify(users));
    
    // Auto login after registration
    setCurrentUser({ name: newUser.name, username: newUser.username });
    localStorage.setItem('wholesale-logged-in', 'true');
    localStorage.setItem('wholesale-current-user', JSON.stringify({ name: newUser.name, username: newUser.username }));
    setPage('app');
  };

  // Handle login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginForm.username || !loginForm.password) {
      setLoginError('Please enter username and password');
      return;
    }

    const users = getUsers();
    const user = users.find(u => u.username === loginForm.username && u.password === loginForm.password);

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
    setPage('home');
    localStorage.removeItem('wholesale-logged-in');
    localStorage.removeItem('wholesale-current-user');
    setSideMenuOpen(false);
  };

  // Add new note
  const handleAddNote = () => {
    if (!newNote.trim()) return;
    
    const note: Note = {
      id: String(Date.now()),
      content: newNote,
      createdAt: new Date().toISOString(),
    };
    
    setNotes([note, ...notes]);
    setNewNote('');
  };

  // Delete note
  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  // Update note
  const handleUpdateNote = (id: string, content: string) => {
    setNotes(notes.map(note => 
      note.id === id ? { ...note, content } : note
    ));
  };
  
  // New item form state
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({});
  
  // New sale form state
  const [newSale, setNewSale] = useState<Partial<SaleRecord>>({ date: new Date().toISOString().split('T')[0] });
  
  // Calculate today's metrics
  const today = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(sale => sale.date === today);
  const totalRevenueToday = todaySales.reduce((sum, sale) => sum + sale.totalRevenue, 0);
  const totalProfitToday = todaySales.reduce((sum, sale) => sum + sale.totalProfit, 0);

  // Format currency
  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  // Add new inventory item
  const handleAddItem = () => {
    if (!newItem.name || !newItem.buyingPrice || !newItem.sellingPrice) return;
    
    const item: InventoryItem = {
      id: `ITM-${String(inventory.length + 1).padStart(3, '0')}`,
      name: newItem.name!,
      buyingPrice: Number(newItem.buyingPrice),
      sellingPrice: Number(newItem.sellingPrice),
      currentStock: Number(newItem.currentStock) || 0,
      reorderLevel: Number(newItem.reorderLevel) || 5,
    };
    
    setInventory([...inventory, item]);
    setNewItem({});
  };

  // Update inventory stock
  const updateStock = (id: string, delta: number) => {
    setInventory(inventory.map(item => 
      item.id === id ? { ...item, currentStock: Math.max(0, item.currentStock + delta) } : item
    ));
  };

  // Record a sale
  const handleRecordSale = () => {
    if (!newSale.itemName || !newSale.quantitySold) return;
    
    const item = inventory.find(i => i.name === newSale.itemName);
    if (!item || item.currentStock < (newSale.quantitySold || 0)) return;
    
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
  };

  // Delete inventory item
  const deleteItem = (id: string) => {
    setInventory(inventory.filter(item => item.id !== id));
  };

  // Delete sale record
  const deleteSale = (id: string) => {
    setSales(sales.filter(sale => sale.id !== id));
  };

  // Navigate to tab and close mobile menu
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSideMenuOpen(false);
  };

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
                <img 
                  src="/andrew-profile.jpg" 
                  alt="Andrew Lumala" 
                  className="w-full h-full object-cover"
                />
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
          {/* Back Button */}
          <button
            onClick={() => setPage('home')}
            className="mb-8 flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </button>

          {/* Login Card */}
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
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                  {loginError}
                </div>
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
                <button
                  onClick={() => setPage('register')}
                  className="text-cyan-400 hover:text-cyan-300 font-medium"
                >
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
          {/* Back Button */}
          <button
            onClick={() => setPage('home')}
            className="mb-8 flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </button>

          {/* Register Card */}
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
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                  {registerError}
                </div>
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
                <button
                  onClick={() => setPage('login')}
                  className="text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============ MAIN APP ============
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Side Menu Overlay */}
      {sideMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSideMenuOpen(false)}
        />
      )}

      {/* Side Menu */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-neutral-900 border-r border-neutral-800 z-50 transform transition-transform duration-300 lg:translate-x-0 ${sideMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-lg block">Kikuubo</span>
              {currentUser && (
                <span className="text-xs text-neutral-400">{currentUser.name}</span>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'dashboard' 
                  ? 'bg-cyan-500/10 text-cyan-400' 
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </button>

            <button
              onClick={() => handleTabChange('inventory')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'inventory' 
                  ? 'bg-cyan-500/10 text-cyan-400' 
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Inventory
            </button>

            <button
              onClick={() => handleTabChange('sales')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'sales' 
                  ? 'bg-cyan-500/10 text-cyan-400' 
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Sales Log
            </button>

            <button
              onClick={() => handleTabChange('notes')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'notes' 
                  ? 'bg-cyan-500/10 text-cyan-400' 
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Notes
            </button>
          </nav>

          {/* Logout */}
          <div className="absolute bottom-6 left-6 right-6">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-neutral-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:ml-72">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-neutral-900/80 backdrop-blur-sm border-b border-neutral-800">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSideMenuOpen(true)}
              className="lg:hidden p-2 text-neutral-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <h1 className="text-lg font-semibold capitalize">{activeTab}</h1>

            <div className="text-sm text-neutral-400">
              {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-xl p-6 border border-neutral-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-cyan-400 text-sm font-medium uppercase tracking-wider">Revenue Today</p>
                      <p className="text-2xl font-bold text-white mt-2">{formatCurrency(totalRevenueToday)}</p>
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
                      <p className="text-2xl font-bold text-white mt-2">{formatCurrency(totalProfitToday)}</p>
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
                      <p className="text-2xl font-bold text-white mt-2">{inventory.filter(i => i.currentStock <= i.reorderLevel).length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Sales */}
              <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 overflow-hidden">
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
                      {sales.slice(-5).reverse().map((sale) => (
                        <tr key={sale.id} className="hover:bg-neutral-800/30">
                          <td className="px-6 py-4 text-sm text-neutral-300">{sale.date}</td>
                          <td className="px-6 py-4 text-sm text-white">{sale.itemName}</td>
                          <td className="px-6 py-4 text-sm text-neutral-300">{sale.quantitySold}</td>
                          <td className="px-6 py-4 text-sm text-cyan-400">{formatCurrency(sale.totalRevenue)}</td>
                          <td className="px-6 py-4 text-sm text-emerald-400">{formatCurrency(sale.totalProfit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                <div className="px-6 py-4 border-b border-neutral-800">
                  <h3 className="text-lg font-semibold text-white">Inventory Master</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-800/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Item ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Item Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Buying Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Selling Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {inventory.map((item) => (
                        <tr key={item.id} className="hover:bg-neutral-800/30">
                          <td className="px-6 py-4 text-sm text-neutral-400 font-mono">{item.id}</td>
                          <td className="px-6 py-4 text-sm text-white">{item.name}</td>
                          <td className="px-6 py-4 text-sm text-neutral-300">{formatCurrency(item.buyingPrice)}</td>
                          <td className="px-6 py-4 text-sm text-cyan-400">{formatCurrency(item.sellingPrice)}</td>
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
                            <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-300">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                      <option key={item.id} value={item.name}>{item.name} (Stock: {item.currentStock})</option>
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
                <div className="px-6 py-4 border-b border-neutral-800">
                  <h3 className="text-lg font-semibold text-white">Daily Sales Log</h3>
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
                      {sales.slice().reverse().map((sale) => (
                        <tr key={sale.id} className="hover:bg-neutral-800/30">
                          <td className="px-6 py-4 text-sm text-neutral-300">{sale.date}</td>
                          <td className="px-6 py-4 text-sm text-white">{sale.itemName}</td>
                          <td className="px-6 py-4 text-sm text-neutral-300">{sale.quantitySold}</td>
                          <td className="px-6 py-4 text-sm text-cyan-400">{formatCurrency(sale.totalRevenue)}</td>
                          <td className="px-6 py-4 text-sm text-emerald-400">{formatCurrency(sale.totalProfit)}</td>
                          <td className="px-6 py-4">
                            <button onClick={() => deleteSale(sale.id)} className="text-red-400 hover:text-red-300">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                          minute: '2-digit'
                        })}
                      </span>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-neutral-500 hover:text-red-400 transition-colors"
                      >
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
        </main>

        {/* Footer */}
        <footer className="border-t border-neutral-800 py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-cyan-500/50">
                  <img 
                    src="/andrew-profile.jpg" 
                    alt="Andrew Lumala" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-neutral-400 text-sm">
                    Built by <span className="text-cyan-400 font-semibold">Andrew Lumala</span>
                  </p>
                  <p className="text-neutral-600 text-xs">
                    © {new Date().getFullYear()} Kikuubo Wholesale Tracker
                  </p>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
