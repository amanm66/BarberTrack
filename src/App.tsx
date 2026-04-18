/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  auth, db 
} from './firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  User
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  PlusCircle, 
  BarChart3, 
  CreditCard, 
  LogOut, 
  Scissors, 
  User as UserIcon,
  TrendingUp,
  DollarSign,
  Calendar,
  ChevronRight,
  Menu,
  X,
  CheckCircle2,
  Lightbulb,
  Download,
  Pencil,
  Trash2,
  Baby,
  Palette,
  Sparkles,
  Brush,
  Smile,
  Droplet,
  Crop,
  CircleDashed,
  Zap,
  Users
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, subDays, eachDayOfInterval } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface Sale {
  id: string;
  uid: string;
  serviceType: string;
  paymentMethod: 'cash' | 'card';
  amount: number;
  timestamp: Timestamp;
  notes?: string;
}

interface Suggestion {
  id: string;
  uid: string;
  suggestion: string;
  timestamp: Timestamp;
}

interface UserProfile {
  uid: string;
  email: string;
  plan: 'basic' | 'premium';
  currency?: string;
  premiumSince?: Timestamp | null;
  createdAt: Timestamp;
  role?: string;
}

// Components
const Auth = ({ onAuthSuccess }: { onAuthSuccess: () => void }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const actionCodeSettings = {
        url: window.location.origin,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setLinkSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = async () => {
    setError('');
    setLoading(true);
    const demoEmail = 'demo@barbertrack.uk';
    const demoPassword = 'password123';
    
    try {
      let user;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
        user = userCredential.user;
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          const userCredential = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
          user = userCredential.user;
        } else {
          throw err;
        }
      }

      // Ensure demo user is always premium and has a profile
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        plan: 'premium',
        currency: 'GBP',
        createdAt: serverTimestamp()
      }, { merge: true });

      // Clear existing demo sales first to ensure fresh data
      const existingSalesQuery = query(collection(db, 'sales'), where('uid', '==', user.uid));
      const existingSalesSnapshot = await getDocs(existingSalesQuery);
      for (const d of existingSalesSnapshot.docs) {
        await deleteDoc(d.ref);
      }

      // Seed fresh demo data summing to 258
      const demoSales = [
        { serviceType: 'Adult Haircut', amount: 10, paymentMethod: 'card', daysAgo: 0 },
        { serviceType: 'Adult Haircut', amount: 10, paymentMethod: 'card', daysAgo: 0 },
        { serviceType: 'Beard Trim', amount: 10, paymentMethod: 'card', daysAgo: 1 },
        { serviceType: 'Beard Trim', amount: 10, paymentMethod: 'card', daysAgo: 1 },
        { serviceType: 'Kids Haircut', amount: 10, paymentMethod: 'card', daysAgo: 2 },
        { serviceType: 'Kids Haircut', amount: 10, paymentMethod: 'card', daysAgo: 2 },
        { serviceType: 'Shave', amount: 10, paymentMethod: 'card', daysAgo: 3 },
        { serviceType: 'Headshave', amount: 10, paymentMethod: 'card', daysAgo: 3 },
        { serviceType: 'Hair Color', amount: 10, paymentMethod: 'card', daysAgo: 4 },
        { serviceType: 'Adult Haircut', amount: 16, paymentMethod: 'card', daysAgo: 4 },
        { serviceType: 'Adult Haircut', amount: 15, paymentMethod: 'cash', daysAgo: 5 },
        { serviceType: 'Adult Haircut', amount: 15, paymentMethod: 'cash', daysAgo: 5 },
        { serviceType: 'Beard Trim', amount: 15, paymentMethod: 'cash', daysAgo: 6 },
        { serviceType: 'Beard Trim', amount: 15, paymentMethod: 'cash', daysAgo: 6 },
        { serviceType: 'Kids Haircut', amount: 15, paymentMethod: 'cash', daysAgo: 7 },
        { serviceType: 'Kids Haircut', amount: 15, paymentMethod: 'cash', daysAgo: 7 },
        { serviceType: 'Shave', amount: 15, paymentMethod: 'cash', daysAgo: 8 },
        { serviceType: 'Headshave', amount: 15, paymentMethod: 'cash', daysAgo: 8 },
        { serviceType: 'Hair Color', amount: 15, paymentMethod: 'cash', daysAgo: 9 },
        { serviceType: 'Adult Haircut', amount: 17, paymentMethod: 'cash', daysAgo: 9 },
      ];

      for (const s of demoSales) {
        const timestamp = Timestamp.fromDate(subDays(new Date(), s.daysAgo));
        await addDoc(collection(db, 'sales'), {
          uid: user.uid,
          serviceType: s.serviceType,
          amount: s.amount,
          paymentMethod: s.paymentMethod,
          timestamp
        });
      }

      onAuthSuccess();
    } catch (err: any) {
      setError('Demo mode failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0] p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-[#5A5A40] rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
              <Scissors className="text-white w-8 h-8" />
            </div>
          </div>
          <h2 className="text-3xl font-serif text-center text-[#1A1A1A] mb-2">
            Welcome to BarberTrack
          </h2>
          <p className="text-center text-gray-500 mb-8 font-sans">
            Sign in securely with a magic link
          </p>

          {linkSent ? (
            <div className="bg-green-50 text-green-800 p-6 rounded-2xl text-center">
              <h3 className="font-bold text-lg mb-2">Check your email!</h3>
              <p className="text-sm">We've sent a secure login link to <strong>{email}</strong>. Click the link to sign in instantly.</p>
              <button 
                onClick={() => setLinkSent(false)}
                className="mt-6 text-sm text-[#5A5A40] font-semibold hover:underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#5A5A40] text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-[#4A4A30] transition-all disabled:opacity-50 mt-4"
              >
                {loading ? 'Sending Link...' : 'Send Magic Link'}
              </button>
            </form>
          )}

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-400">Or explore the app</span>
            </div>
          </div>

          <button
            onClick={handleDemoMode}
            disabled={loading}
            className="w-full bg-white text-[#5A5A40] border-2 border-[#5A5A40] py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            Try Demo Mode
          </button>
        </div>
      </div>
    </div>
  );
};

const EditSaleModal = ({ 
  sale, 
  onClose, 
  onSave, 
  onDelete 
}: { 
  sale: Sale; 
  onClose: () => void; 
  onSave: (id: string, data: Partial<Sale>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) => {
  const [service, setService] = useState(sale.serviceType);
  const [amount, setAmount] = useState(sale.amount.toString());
  const [payment, setPayment] = useState<'cash' | 'card'>(sale.paymentMethod);
  const [notes, setNotes] = useState(sale.notes || '');
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');

  const services = ['Adult Haircut', 'Beard Trim', 'Adult Haircut + Beard Trim', 'Kids Haircut', 'Baby Haircut', 'Hair Color', 'Shave', 'Headshave'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid positive amount.");
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onSave(sale.id, {
        serviceType: service,
        amount: parsedAmount,
        paymentMethod: payment,
        notes: notes.trim()
      });
      onClose();
    } catch (err) {
      setError("Failed to save changes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    await onDelete(sale.id);
    setLoading(false);
    onClose();
  };

  if (showDeleteConfirm) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-xl animate-in zoom-in-95 duration-200 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 size={32} />
          </div>
          <h3 className="text-xl font-serif mb-2">Delete Sale?</h3>
          <p className="text-gray-500 mb-6">Are you sure you want to delete this sale? This action cannot be undone.</p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={loading}
              className="flex-1 py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 py-3 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-serif">Edit Sale</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none bg-white"
            >
              {services.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
              <input
                type="number"
                step="0.01"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPayment('card')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-sm font-medium transition-all border",
                    payment === 'card' ? "bg-[#5A5A40] text-white border-[#5A5A40]" : "bg-white text-gray-600 border-gray-200"
                  )}
                >
                  Card
                </button>
                <button
                  type="button"
                  onClick={() => setPayment('cash')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-sm font-medium transition-all border",
                    payment === 'cash' ? "bg-[#5A5A40] text-white border-[#5A5A40]" : "bg-white text-gray-600 border-gray-200"
                  )}
                >
                  Cash
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none resize-none h-24"
              placeholder="Add any comments about this sale..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
              className="px-4 py-3 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              <Trash2 size={20} />
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#5A5A40] text-white py-3 rounded-xl font-semibold hover:bg-[#4A4A30] transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const StraightRazor = ({ size = 24, className = "", ...props }: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M16 8 L5 12 C4 12 3 11 3 10 L4 6 L15 3 Z" />
    <path d="M16 8 C18 12 20 18 18 21 C17 22 15 21 15 20 C14 15 15 9 15 9" />
    <path d="M16 8 L19 5 C20 4 21 5 21 5" />
    <circle cx="16" cy="8" r="1" />
  </svg>
);

const Clipper = ({ size = 24, className = "", ...props }: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="7" y="10" width="10" height="12" rx="2" />
    <path d="M8 10 V6 A1 1 0 0 1 9 5 H15 A1 1 0 0 1 16 6 V10" />
    <path d="M9 5 V3" />
    <path d="M11 5 V3" />
    <path d="M13 5 V3" />
    <path d="M15 5 V3" />
    <circle cx="12" cy="16" r="1" />
  </svg>
);

const SafetyRazor = ({ size = 24, className = "", ...props }: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="5" y="3" width="14" height="6" rx="1" />
    <line x1="5" y1="6" x2="19" y2="6" />
    <path d="M10 9v11a2 2 0 0 0 4 0V9" />
    <line x1="10" y1="13" x2="14" y2="13" />
    <line x1="10" y1="16" x2="14" y2="16" />
  </svg>
);

const getServiceIcon = (serviceType: string) => {
  switch (serviceType) {
    case 'Baby Haircut':
      return Baby;
    case 'Kids Haircut':
      return Smile;
    case 'Hair Color':
      return Palette;
    case 'Beard Trim':
      return Clipper;
    case 'Shave':
      return SafetyRazor;
    case 'Headshave':
      return StraightRazor;
    case 'Adult Haircut + Beard Trim':
      return UserIcon;
    case 'Adult Haircut':
    default:
      return Scissors;
  }
};

const Dashboard = ({ 
  sales, 
  profile,
  onEditSale,
  onDeleteSale
}: { 
  sales: Sale[]; 
  profile: UserProfile | null;
  onEditSale: (id: string, data: Partial<Sale>) => Promise<void>;
  onDeleteSale: (id: string) => Promise<void>;
}) => {
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const totalSales = sales.reduce((acc, sale) => acc + sale.amount, 0);
  const cashSales = sales.filter(s => s.paymentMethod === 'cash').reduce((acc, s) => acc + s.amount, 0);
  const cardSales = sales.filter(s => s.paymentMethod === 'card').reduce((acc, s) => acc + s.amount, 0);

  const serviceData = useMemo(() => {
    const counts: Record<string, number> = {};
    sales.forEach(s => {
      counts[s.serviceType] = (counts[s.serviceType] || 0) + s.amount;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [sales]);

  const [showAllSales, setShowAllSales] = useState(false);
  const displayedSales = showAllSales ? sales : sales.slice(0, 5);

  const COLORS = ['#5A5A40', '#8E8E6E', '#C2C2A3', '#E6E6D6', '#A3A375'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-2xl text-green-600">
              <DollarSign size={24} />
            </div>
          </div>
          <p className="text-gray-500 text-sm font-medium">Total Revenue</p>
          <h3 className="text-3xl font-bold text-[#1A1A1A]">{formatCurrency(totalSales, profile?.currency)}</h3>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
              <TrendingUp size={24} />
            </div>
          </div>
          <p className="text-gray-500 text-sm font-medium">Total Services</p>
          <h3 className="text-3xl font-bold text-[#1A1A1A]">{sales.length}</h3>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-50 rounded-2xl text-orange-600">
              <CreditCard size={24} />
            </div>
          </div>
          <p className="text-gray-500 text-sm font-medium">Card vs Cash</p>
          <div className="flex items-center gap-4 mt-1">
            <div className="flex flex-col">
              <span className="text-xs text-gray-400">Card</span>
              <span className="font-bold">{formatCurrency(cardSales, profile?.currency)}</span>
            </div>
            <div className="h-8 w-px bg-gray-100" />
            <div className="flex flex-col">
              <span className="text-xs text-gray-400">Cash</span>
              <span className="font-bold">{formatCurrency(cashSales, profile?.currency)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-serif">Revenue by Service</h4>
            <button 
              onClick={() => window.location.reload()}
              className="p-2 text-gray-400 hover:text-[#5A5A40] hover:bg-gray-50 rounded-xl transition-all"
              title="Refresh Data"
            >
              <Zap size={18} />
            </button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={serviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {serviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {serviceData.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-xs text-gray-600 truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-serif">Recent Sales</h4>
            {sales.length > 5 && (
              <button 
                onClick={() => setShowAllSales(!showAllSales)}
                className="text-sm font-medium text-[#5A5A40] hover:text-[#4A4A30] transition-colors"
              >
                {showAllSales ? 'Show Less' : 'View All'}
              </button>
            )}
          </div>
          <div className={cn("space-y-4", showAllSales ? "max-h-[600px] overflow-y-auto pr-2" : "")}>
            {displayedSales.map((sale) => {
              const ServiceIcon = getServiceIcon(sale.serviceType);
              return (
                <div key={sale.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-2xl transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#F5F5F0] rounded-xl flex items-center justify-center">
                      <ServiceIcon size={18} className="text-[#5A5A40]" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{sale.serviceType}</p>
                      <p className="text-xs text-gray-400">{sale.timestamp ? format(sale.timestamp.toDate(), 'MMM d, h:mm a') : 'Pending...'}</p>
                      {sale.notes && (
                        <p className="text-xs text-gray-500 mt-1 italic line-clamp-1">{sale.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(sale.amount, profile?.currency)}</p>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{sale.paymentMethod}</p>
                    </div>
                    <button 
                      onClick={() => setEditingSale(sale)}
                      className="p-2 text-gray-400 hover:text-[#5A5A40] hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Edit Sale"
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
            {displayedSales.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p>No sales recorded yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {editingSale && (
        <EditSaleModal
          sale={editingSale}
          onClose={() => setEditingSale(null)}
          onSave={onEditSale}
          onDelete={onDeleteSale}
        />
      )}
    </div>
  );
};

const SalesEntry = ({ onAdd, profile }: { onAdd: (sale: Omit<Sale, 'id' | 'uid' | 'timestamp'>) => void, profile: UserProfile | null }) => {
  const [service, setService] = useState('Adult Haircut');
  const [amount, setAmount] = useState('');
  const [payment, setPayment] = useState<'cash' | 'card'>('card');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const services = ['Adult Haircut', 'Beard Trim', 'Adult Haircut + Beard Trim', 'Kids Haircut', 'Baby Haircut', 'Hair Color', 'Shave', 'Headshave'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid positive amount.");
      return;
    }
    setError('');
    setSuccess(false);
    setLoading(true);
    try {
      await onAdd({
        serviceType: service,
        amount: parsedAmount,
        paymentMethod: payment,
        notes: notes.trim()
      });
      setAmount('');
      setNotes('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Failed to record sale. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-serif mb-6">New Sale</h2>
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 text-green-600 rounded-xl text-sm font-medium flex items-center gap-2">
          <CheckCircle2 size={20} />
          Sale recorded successfully!
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {services.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setService(s)}
                className={cn(
                  "px-4 py-3 rounded-xl text-sm font-medium transition-all border",
                  service === s 
                    ? "bg-[#5A5A40] text-white border-[#5A5A40] shadow-md" 
                    : "bg-white text-gray-600 border-gray-100 hover:border-gray-300"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount ({profile?.currency || 'GBP'})</label>
            <input
              type="number"
              step="0.01"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPayment('card')}
                className={cn(
                  "flex-1 py-3 rounded-xl text-sm font-medium transition-all border flex items-center justify-center gap-2",
                  payment === 'card' 
                    ? "bg-[#5A5A40] text-white border-[#5A5A40]" 
                    : "bg-white text-gray-600 border-gray-100"
                )}
              >
                <CreditCard size={18} />
                Card
              </button>
              <button
                type="button"
                onClick={() => setPayment('cash')}
                className={cn(
                  "flex-1 py-3 rounded-xl text-sm font-medium transition-all border flex items-center justify-center gap-2",
                  payment === 'cash' 
                    ? "bg-[#5A5A40] text-white border-[#5A5A40]" 
                    : "bg-white text-gray-600 border-gray-100"
                )}
              >
                <DollarSign size={18} />
                Cash
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
          <textarea
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none resize-none h-24"
            placeholder="Add any comments about this sale..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#5A5A40] text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-[#4A4A30] transition-all disabled:opacity-50"
        >
          {loading ? 'Recording...' : 'Record Sale'}
        </button>
      </form>
    </div>
  );
};

const Reports = ({ sales, profile }: { sales: Sale[], profile: UserProfile | null }) => {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [error, setError] = useState('');

  const filteredSales = useMemo(() => {
    const now = new Date();
    let start, end;
    if (period === 'week') {
      start = startOfWeek(now);
      end = endOfWeek(now);
    } else if (period === 'month') {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else {
      start = startOfYear(now);
      end = endOfYear(now);
    }
    return sales.filter(s => s.timestamp && isWithinInterval(s.timestamp.toDate(), { start, end }));
  }, [sales, period]);

  const chartData = useMemo(() => {
    const now = new Date();
    if (period === 'week') {
      const days = eachDayOfInterval({ start: startOfWeek(now), end: endOfWeek(now) });
      return days.map(day => {
        const daySales = sales.filter(s => s.timestamp && format(s.timestamp.toDate(), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'));
        return {
          name: format(day, 'EEE'),
          amount: daySales.reduce((acc, s) => acc + s.amount, 0)
        };
      });
    }
    // Simplified for month/year
    const counts: Record<string, number> = {};
    filteredSales.forEach(s => {
      if (!s.timestamp) return;
      const key = period === 'month' ? format(s.timestamp.toDate(), 'MMM d') : format(s.timestamp.toDate(), 'MMM');
      counts[key] = (counts[key] || 0) + s.amount;
    });
    return Object.entries(counts).map(([name, amount]) => ({ name, amount }));
  }, [filteredSales, period, sales]);

  const exportToExcel = () => {
    if (profile?.plan !== 'premium') {
      setError("Export to Excel is a Premium feature. Please upgrade your plan.");
      setTimeout(() => setError(''), 3000);
      return;
    }

    const headers = ['Date', 'Service Type', 'Amount', 'Payment Method', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...filteredSales.map(s => [
        s.timestamp ? format(s.timestamp.toDate(), 'yyyy-MM-dd HH:mm') : 'Pending',
        `"${s.serviceType}"`,
        s.amount,
        s.paymentMethod,
        `"${(s.notes || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `barbertrack_sales_${period}_${format(new Date(), 'yyyyMMdd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium animate-in slide-in-from-top-2">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex gap-2">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => {
                if (profile?.plan !== 'premium' && p !== 'week') {
                  setError("Monthly and Yearly reports are Premium features. Please upgrade your plan.");
                  setTimeout(() => setError(''), 3000);
                  return;
                }
                setPeriod(p);
              }}
              className={cn(
                "px-4 py-2 rounded-2xl text-sm font-medium transition-all capitalize flex items-center gap-1",
                period === p ? "bg-[#5A5A40] text-white" : "text-gray-500 hover:bg-gray-50",
                profile?.plan !== 'premium' && p !== 'week' ? "opacity-50 cursor-not-allowed" : ""
              )}
            >
              {p}
              {profile?.plan !== 'premium' && p !== 'week' && <span className="text-[10px] ml-1">🔒</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 text-sm font-medium text-[#5A5A40] hover:text-[#4A4A30] transition-colors"
          >
            <Download size={16} />
            Export to Excel
          </button>
          <div className="text-right border-l border-gray-100 pl-6">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total for Period</p>
            <p className="text-xl font-bold text-[#5A5A40]">{formatCurrency(filteredSales.reduce((acc, s) => acc + s.amount, 0), profile?.currency)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-serif mb-8">Revenue Trend</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#999' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#999' }} />
              <Tooltip 
                cursor={{ fill: '#F5F5F0' }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="amount" fill="#5A5A40" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h4 className="text-lg font-serif mb-4">Top Services</h4>
          <div className="space-y-3">
            {Object.entries(
              filteredSales.reduce((acc, s) => {
                acc[s.serviceType] = (acc[s.serviceType] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            )
              .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
              .map(([name, count], idx) => (
                <div key={name} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-4">{idx + 1}</span>
                    <span className="font-medium">{name}</span>
                  </div>
                  <span className="text-sm font-bold text-[#5A5A40]">{count} bookings</span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h4 className="text-lg font-serif mb-4">Payment Distribution</h4>
          <div className="flex items-center justify-around h-48">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-2 mx-auto">
                <CreditCard size={24} />
              </div>
              <p className="text-xs text-gray-400 font-bold">CARD</p>
              <p className="text-lg font-bold">{formatCurrency(filteredSales.filter(s => s.paymentMethod === 'card').reduce((acc, s) => acc + s.amount, 0), profile?.currency)}</p>
            </div>
            <div className="w-px h-24 bg-gray-100" />
            <div className="text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-600 mb-2 mx-auto">
                <DollarSign size={24} />
              </div>
              <p className="text-xs text-gray-400 font-bold">CASH</p>
              <p className="text-lg font-bold">{formatCurrency(filteredSales.filter(s => s.paymentMethod === 'cash').reduce((acc, s) => acc + s.amount, 0), profile?.currency)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const WORLD_CURRENCIES = [
  { code: 'AED', label: 'United Arab Emirates Dirham (AED)' },
  { code: 'AFN', label: 'Afghan Afghani (AFN)' },
  { code: 'ALL', label: 'Albanian Lek (ALL)' },
  { code: 'AMD', label: 'Armenian Dram (AMD)' },
  { code: 'ANG', label: 'Netherlands Antillean Guilder (ANG)' },
  { code: 'AOA', label: 'Angolan Kwanza (AOA)' },
  { code: 'ARS', label: 'Argentine Peso (ARS)' },
  { code: 'AUD', label: 'Australian Dollar (A$)' },
  { code: 'AWG', label: 'Aruban Florin (AWG)' },
  { code: 'AZN', label: 'Azerbaijani Manat (AZN)' },
  { code: 'BAM', label: 'Bosnia-Herzegovina Convertible Mark (BAM)' },
  { code: 'BBD', label: 'Barbadian Dollar (BBD)' },
  { code: 'BDT', label: 'Bangladeshi Taka (BDT)' },
  { code: 'BGN', label: 'Bulgarian Lev (BGN)' },
  { code: 'BHD', label: 'Bahraini Dinar (BHD)' },
  { code: 'BIF', label: 'Burundian Franc (BIF)' },
  { code: 'BMD', label: 'Bermudan Dollar (BMD)' },
  { code: 'BND', label: 'Brunei Dollar (BND)' },
  { code: 'BOB', label: 'Bolivian Boliviano (BOB)' },
  { code: 'BRL', label: 'Brazilian Real (R$)' },
  { code: 'BSD', label: 'Bahamian Dollar (BSD)' },
  { code: 'BTN', label: 'Bhutanese Ngultrum (BTN)' },
  { code: 'BWP', label: 'Botswanan Pula (BWP)' },
  { code: 'BYN', label: 'Belarusian Ruble (BYN)' },
  { code: 'BZD', label: 'Belize Dollar (BZD)' },
  { code: 'CAD', label: 'Canadian Dollar (C$)' },
  { code: 'CDF', label: 'Congolese Franc (CDF)' },
  { code: 'CHF', label: 'Swiss Franc (CHF)' },
  { code: 'CLP', label: 'Chilean Peso (CLP)' },
  { code: 'CNY', label: 'Chinese Yuan (CN¥)' },
  { code: 'COP', label: 'Colombian Peso (COP)' },
  { code: 'CRC', label: 'Costa Rican Colón (CRC)' },
  { code: 'CUP', label: 'Cuban Peso (CUP)' },
  { code: 'CVE', label: 'Cape Verdean Escudo (CVE)' },
  { code: 'CZK', label: 'Czech Koruna (CZK)' },
  { code: 'DJF', label: 'Djiboutian Franc (DJF)' },
  { code: 'DKK', label: 'Danish Krone (DKK)' },
  { code: 'DOP', label: 'Dominican Peso (DOP)' },
  { code: 'DZD', label: 'Algerian Dinar (DZD)' },
  { code: 'EGP', label: 'Egyptian Pound (EGP)' },
  { code: 'ERN', label: 'Eritrean Nakfa (ERN)' },
  { code: 'ETB', label: 'Ethiopian Birr (ETB)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'FJD', label: 'Fijian Dollar (FJD)' },
  { code: 'FKP', label: 'Falkland Islands Pound (FKP)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'GEL', label: 'Georgian Lari (GEL)' },
  { code: 'GHS', label: 'Ghanaian Cedi (GHS)' },
  { code: 'GIP', label: 'Gibraltar Pound (GIP)' },
  { code: 'GMD', label: 'Gambian Dalasi (GMD)' },
  { code: 'GNF', label: 'Guinean Franc (GNF)' },
  { code: 'GTQ', label: 'Guatemalan Quetzal (GTQ)' },
  { code: 'GYD', label: 'Guyanaese Dollar (GYD)' },
  { code: 'HKD', label: 'Hong Kong Dollar (HK$)' },
  { code: 'HNL', label: 'Honduran Lempira (HNL)' },
  { code: 'HRK', label: 'Croatian Kuna (HRK)' },
  { code: 'HTG', label: 'Haitian Gourde (HTG)' },
  { code: 'HUF', label: 'Hungarian Forint (HUF)' },
  { code: 'IDR', label: 'Indonesian Rupiah (IDR)' },
  { code: 'ILS', label: 'Israeli New Shekel (₪)' },
  { code: 'INR', label: 'Indian Rupee (₹)' },
  { code: 'IQD', label: 'Iraqi Dinar (IQD)' },
  { code: 'IRR', label: 'Iranian Rial (IRR)' },
  { code: 'ISK', label: 'Icelandic Króna (ISK)' },
  { code: 'JMD', label: 'Jamaican Dollar (JMD)' },
  { code: 'JOD', label: 'Jordanian Dinar (JOD)' },
  { code: 'JPY', label: 'Japanese Yen (¥)' },
  { code: 'KES', label: 'Kenyan Shilling (KES)' },
  { code: 'KGS', label: 'Kyrgystani Som (KGS)' },
  { code: 'KHR', label: 'Cambodian Riel (KHR)' },
  { code: 'KMF', label: 'Comorian Franc (KMF)' },
  { code: 'KPW', label: 'North Korean Won (KPW)' },
  { code: 'KRW', label: 'South Korean Won (₩)' },
  { code: 'KWD', label: 'Kuwaiti Dinar (KWD)' },
  { code: 'KYD', label: 'Cayman Islands Dollar (KYD)' },
  { code: 'KZT', label: 'Kazakhstani Tenge (KZT)' },
  { code: 'LAK', label: 'Laotian Kip (LAK)' },
  { code: 'LBP', label: 'Lebanese Pound (LBP)' },
  { code: 'LKR', label: 'Sri Lankan Rupee (LKR)' },
  { code: 'LRD', label: 'Liberian Dollar (LRD)' },
  { code: 'LSL', label: 'Lesotho Loti (LSL)' },
  { code: 'LYD', label: 'Libyan Dinar (LYD)' },
  { code: 'MAD', label: 'Moroccan Dirham (MAD)' },
  { code: 'MDL', label: 'Moldovan Leu (MDL)' },
  { code: 'MGA', label: 'Malagasy Ariary (MGA)' },
  { code: 'MKD', label: 'Macedonian Denar (MKD)' },
  { code: 'MMK', label: 'Myanmar Kyat (MMK)' },
  { code: 'MNT', label: 'Mongolian Tugrik (MNT)' },
  { code: 'MOP', label: 'Macanese Pataca (MOP)' },
  { code: 'MRU', label: 'Mauritanian Ouguiya (MRU)' },
  { code: 'MUR', label: 'Mauritian Rupee (MUR)' },
  { code: 'MVR', label: 'Maldivian Rufiyaa (MVR)' },
  { code: 'MWK', label: 'Malawian Kwacha (MWK)' },
  { code: 'MXN', label: 'Mexican Peso (MX$)' },
  { code: 'MYR', label: 'Malaysian Ringgit (MYR)' },
  { code: 'MZN', label: 'Mozambican Metical (MZN)' },
  { code: 'NAD', label: 'Namibian Dollar (NAD)' },
  { code: 'NGN', label: 'Nigerian Naira (NGN)' },
  { code: 'NIO', label: 'Nicaraguan Córdoba (NIO)' },
  { code: 'NOK', label: 'Norwegian Krone (NOK)' },
  { code: 'NPR', label: 'Nepalese Rupee (NPR)' },
  { code: 'NZD', label: 'New Zealand Dollar (NZ$)' },
  { code: 'OMR', label: 'Omani Rial (OMR)' },
  { code: 'PAB', label: 'Panamanian Balboa (PAB)' },
  { code: 'PEN', label: 'Peruvian Sol (PEN)' },
  { code: 'PGK', label: 'Papua New Guinean Kina (PGK)' },
  { code: 'PHP', label: 'Philippine Peso (PHP)' },
  { code: 'PKR', label: 'Pakistani Rupee (PKR)' },
  { code: 'PLN', label: 'Polish Zloty (PLN)' },
  { code: 'PYG', label: 'Paraguayan Guarani (PYG)' },
  { code: 'QAR', label: 'Qatari Rial (QAR)' },
  { code: 'RON', label: 'Romanian Leu (RON)' },
  { code: 'RSD', label: 'Serbian Dinar (RSD)' },
  { code: 'RUB', label: 'Russian Ruble (RUB)' },
  { code: 'RWF', label: 'Rwandan Franc (RWF)' },
  { code: 'SAR', label: 'Saudi Riyal (SAR)' },
  { code: 'SBD', label: 'Solomon Islands Dollar (SBD)' },
  { code: 'SCR', label: 'Seychellois Rupee (SCR)' },
  { code: 'SDG', label: 'Sudanese Pound (SDG)' },
  { code: 'SEK', label: 'Swedish Krona (SEK)' },
  { code: 'SGD', label: 'Singapore Dollar (SGD)' },
  { code: 'SHP', label: 'St. Helena Pound (SHP)' },
  { code: 'SLL', label: 'Sierra Leonean Leone (SLL)' },
  { code: 'SOS', label: 'Somali Shilling (SOS)' },
  { code: 'SRD', label: 'Surinamese Dollar (SRD)' },
  { code: 'SSP', label: 'South Sudanese Pound (SSP)' },
  { code: 'STN', label: 'São Tomé & Príncipe Dobra (STN)' },
  { code: 'SYP', label: 'Syrian Pound (SYP)' },
  { code: 'SZL', label: 'Swazi Lilangeni (SZL)' },
  { code: 'THB', label: 'Thai Baht (THB)' },
  { code: 'TJS', label: 'Tajikistani Somoni (TJS)' },
  { code: 'TMT', label: 'Turkmenistani Manat (TMT)' },
  { code: 'TND', label: 'Tunisian Dinar (TND)' },
  { code: 'TOP', label: 'Tongan Paʻanga (TOP)' },
  { code: 'TRY', label: 'Turkish Lira (TRY)' },
  { code: 'TTD', label: 'Trinidad & Tobago Dollar (TTD)' },
  { code: 'TWD', label: 'New Taiwan Dollar (NT$)' },
  { code: 'TZS', label: 'Tanzanian Shilling (TZS)' },
  { code: 'UAH', label: 'Ukrainian Hryvnia (UAH)' },
  { code: 'UGX', label: 'Ugandan Shilling (UGX)' },
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'UYU', label: 'Uruguayan Peso (UYU)' },
  { code: 'UZS', label: 'Uzbekistani Som (UZS)' },
  { code: 'VES', label: 'Venezuelan Bolívar (VES)' },
  { code: 'VND', label: 'Vietnamese Dong (₫)' },
  { code: 'VUV', label: 'Vanuatu Vatu (VUV)' },
  { code: 'WST', label: 'Samoan Tala (WST)' },
  { code: 'XAF', label: 'Central African CFA Franc (FCFA)' },
  { code: 'XCD', label: 'East Caribbean Dollar (EC$)' },
  { code: 'XOF', label: 'West African CFA Franc (CFA)' },
  { code: 'XPF', label: 'CFP Franc (CFPF)' },
  { code: 'YER', label: 'Yemeni Rial (YER)' },
  { code: 'ZAR', label: 'South African Rand (ZAR)' },
  { code: 'ZMW', label: 'Zambian Kwacha (ZMW)' },
  { code: 'ZWL', label: 'Zimbabwean Dollar (ZWL)' }
].sort((a, b) => a.label.localeCompare(b.label));

const Suggestions = ({ profile }: { profile: UserProfile | null }) => {
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim() || !profile) return;
    
    setLoading(true);
    setSuccess(false);
    try {
      // 1. Save to database (for Admin Dashboard)
      await addDoc(collection(db, 'suggestions'), {
        uid: profile.uid,
        suggestion: suggestion.trim(),
        timestamp: serverTimestamp()
      });

      // 2. Trigger free email via Web3Forms
      const web3formsKey = (import.meta as any).env.VITE_WEB3FORMS_ACCESS_KEY;
      if (web3formsKey) {
        await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            access_key: web3formsKey,
            subject: 'New Suggestion for BarberTrack',
            from_name: 'BarberTrack App',
            email: profile.email, // Sets the reply-to address so you can reply directly to the user
            message: `A new suggestion was submitted by ${profile.email}:\n\n${suggestion.trim()}`
          })
        });
      } else {
        console.warn('Web3Forms key not found. Email notification skipped.');
      }

      setSuggestion('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'suggestions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 animate-in fade-in duration-700 space-y-8">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-serif mb-4">Feature Suggestions</h2>
        <p className="text-gray-500">Help us improve BarberTrack! What features would you like to see next?</p>
      </div>

      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Suggestion</label>
            <textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder="I would love to see a feature that..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none bg-white min-h-[150px] resize-y"
              required
              maxLength={2000}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !suggestion.trim()}
            className="w-full md:w-auto px-8 py-4 rounded-2xl font-bold bg-[#5A5A40] text-white shadow-lg hover:bg-[#4A4A30] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Lightbulb size={20} />
                Submit Suggestion
              </>
            )}
          </button>
          {success && (
            <div className="p-4 bg-green-50 text-green-700 rounded-xl flex items-center gap-2">
              <CheckCircle2 size={20} />
              Thank you! Your suggestion has been submitted successfully.
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

const Billing = ({ profile, onDowngrade, onUpdateCurrency }: { profile: UserProfile | null, onDowngrade: () => void, onUpdateCurrency: (currency: string) => void }) => {
  const [exchangeRate, setExchangeRate] = useState(1);
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const targetCurrency = profile?.currency || 'GBP';
        if (targetCurrency === 'GBP') {
          setExchangeRate(1);
          return;
        }
        const res = await fetch('https://open.er-api.com/v6/latest/GBP');
        const data = await res.json();
        if (data && data.rates && data.rates[targetCurrency]) {
          setExchangeRate(data.rates[targetCurrency]);
        }
      } catch (e) {
        console.error("Failed to fetch exchange rates", e);
      }
    };
    fetchRate();
  }, [profile?.currency]);

  const premiumPrice = 9.99 * exchangeRate;

  const calculateRefund = () => {
    if (!profile?.premiumSince) return 0;
    const now = new Date();
    const premiumDate = profile.premiumSince.toDate();
    const diffTime = Math.abs(now.getTime() - premiumDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Assuming a 30-day billing cycle
    const daysUsed = Math.min(diffDays, 30);
    const daysRemaining = 30 - daysUsed;
    
    const refundAmount = (premiumPrice / 30) * daysRemaining;
    return Math.max(0, refundAmount);
  };

  const handleConfirmDowngrade = () => {
    onDowngrade();
    setShowDowngradeConfirm(false);
  };

  const handleProcessPayment = async () => {
    if (!profile) return;
    setIsProcessingPayment(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile.email, uid: profile.uid })
      });
      const data = await response.json();
      if (data.url) {
        // Stripe Checkout cannot be embedded in an iframe (like the AI Studio preview).
        // If we are in an iframe, open in a new tab. Otherwise, redirect in the same tab.
        if (window !== window.parent) {
          window.open(data.url, '_blank');
          setIsProcessingPayment(false);
        } else {
          window.location.href = data.url;
        }
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error(error);
      alert('Could not initiate checkout. Please try again.');
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 animate-in fade-in duration-700 space-y-12">
      {/* Settings Section */}
      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
        <h2 className="text-2xl font-serif mb-6">App Settings</h2>
        <div className="max-w-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">Display Currency</label>
          <select 
            value={profile?.currency || 'GBP'}
            onChange={(e) => onUpdateCurrency(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none bg-white"
          >
            {WORLD_CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-2">This currency will be used across all your dashboards and reports.</p>
        </div>
      </div>

      <div>
        <div className="text-center mb-12">
          <h2 className="text-4xl font-serif mb-4">Choose Your Plan</h2>
          <p className="text-gray-500">Simple pricing for barbers of all sizes</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Basic Plan */}
          <div className={cn(
            "bg-white p-8 rounded-[40px] border-2 transition-all relative overflow-hidden",
            profile?.plan !== 'premium' ? "border-[#5A5A40]" : "border-gray-100"
          )}>
            {profile?.plan !== 'premium' && (
              <div className="absolute top-6 right-6 text-[#5A5A40]">
                <CheckCircle2 size={24} />
              </div>
            )}
            <h3 className="text-2xl font-serif mb-2">Basic</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-bold">{formatCurrency(0, profile?.currency)}</span>
              <span className="text-gray-400">/month</span>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-gray-600">
                <CheckCircle2 size={18} className="text-green-500" />
                Track daily sales
              </li>
            <li className="flex items-center gap-3 text-gray-600">
              <CheckCircle2 size={18} className="text-green-500" />
              Basic weekly reports
            </li>
          </ul>
          <button 
            disabled={profile?.plan !== 'premium'}
            onClick={() => setShowDowngradeConfirm(true)}
            className="w-full py-4 rounded-2xl font-bold border-2 border-gray-100 text-gray-600 hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-400 transition-all"
          >
            {profile?.plan !== 'premium' ? 'Current Plan' : 'Downgrade to Basic'}
          </button>
        </div>

        {/* Premium Plan */}
        <div className={cn(
          "bg-[#1A1A1A] p-8 rounded-[40px] border-2 transition-all relative overflow-hidden text-white shadow-2xl transform md:-translate-y-4",
          profile?.plan === 'premium' ? "border-[#5A5A40]" : "border-transparent"
        )}>
          <div className="absolute top-0 right-0 p-4">
            <div className="bg-[#5A5A40] text-xs font-bold px-3 py-1 rounded-full text-white uppercase tracking-widest">Popular</div>
          </div>
          <h3 className="text-2xl font-serif mb-2">Premium</h3>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-bold">{formatCurrency(premiumPrice, profile?.currency)}</span>
            <span className="text-gray-400">/month</span>
          </div>
          <ul className="space-y-4 mb-8">
            <li className="flex items-center gap-3 text-gray-300">
              <CheckCircle2 size={18} className="text-[#5A5A40]" />
              Unlimited sales tracking
            </li>
            <li className="flex items-center gap-3 text-gray-300">
              <CheckCircle2 size={18} className="text-[#5A5A40]" />
              Advanced Monthly & Yearly reports
            </li>
            <li className="flex items-center gap-3 text-gray-300">
              <CheckCircle2 size={18} className="text-[#5A5A40]" />
              Export data to Excel
            </li>
            <li className="flex items-center gap-3 text-gray-300">
              <CheckCircle2 size={18} className="text-[#5A5A40]" />
              Priority support
            </li>
          </ul>
          <button 
            onClick={handleProcessPayment}
            disabled={profile?.plan === 'premium' || isProcessingPayment}
            className="w-full py-4 rounded-2xl font-bold bg-[#5A5A40] text-white shadow-lg hover:bg-[#4A4A30] transition-all disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isProcessingPayment ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : profile?.plan === 'premium' ? 'Current Plan' : 'Upgrade Now'}
          </button>
        </div>
      </div>
      </div>

      {showDowngradeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-serif mb-4">Cancel Premium Plan?</h3>
            <p className="text-gray-600 mb-6">
              You will be charged only for the days you used the app. The remaining amount for unused days will be refunded to you.
            </p>
            <div className="bg-gray-50 p-4 rounded-2xl mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-500">Estimated Refund:</span>
                <span className="font-bold text-lg text-green-600">{formatCurrency(calculateRefund(), profile?.currency)}</span>
              </div>
              <p className="text-xs text-gray-400">Based on a 30-day billing cycle.</p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowDowngradeConfirm(false)}
                className="flex-1 py-3 rounded-xl font-medium border border-gray-200 hover:bg-gray-50 transition-all"
              >
                Keep Premium
              </button>
              <button 
                onClick={handleConfirmDowngrade}
                className="flex-1 py-3 rounded-xl font-medium bg-red-500 text-white hover:bg-red-600 transition-all"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Error Handling Utility
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, errorInfo: string }> {
  state: { hasError: boolean, errorInfo: string };
  props: { children: React.ReactNode };

  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorInfo: '' };
    this.props = props;
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Something went wrong. Please try refreshing the page.";
      try {
        const parsed = JSON.parse(this.state.errorInfo);
        if (parsed.error && parsed.error.includes('permission-denied')) {
          displayMessage = "You don't have permission to access this data. Please ensure you are logged in correctly.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0] p-4 text-center">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md border border-red-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
              <X size={32} />
            </div>
            <h2 className="text-2xl font-serif mb-4">Application Error</h2>
            <p className="text-gray-500 mb-8">{displayMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-[#5A5A40] text-white py-3 rounded-xl font-bold"
            >
              Refresh App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const formatCurrency = (amount: number, currencyCode: string = 'GBP') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

const AdminDashboard = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersSnapshot, suggestionsSnapshot] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'suggestions'))
        ]);
        
        const usersData = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        const suggestionsData = suggestionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Suggestion));
        
        // Sort suggestions by timestamp descending
        suggestionsData.sort((a, b) => {
          const timeA = a.timestamp?.toMillis() || 0;
          const timeB = b.timestamp?.toMillis() || 0;
          return timeB - timeA;
        });

        setUsers(usersData);
        setSuggestions(suggestionsData);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'admin_data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const premiumCount = users.filter(u => u.plan === 'premium').length;
  const basicCount = users.length - premiumCount;

  if (loading) return <div className="p-8 text-center text-gray-500">Loading admin data...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium">Total Users</p>
          <h3 className="text-3xl font-bold">{users.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium">Premium Users</p>
          <h3 className="text-3xl font-bold text-[#5A5A40]">{premiumCount}</h3>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium">Basic Users</p>
          <h3 className="text-3xl font-bold text-gray-600">{basicCount}</h3>
        </div>
      </div>
      
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-serif">User Directory</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm">
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Plan</th>
                <th className="p-4 font-medium">Joined</th>
                <th className="p-4 font-medium">Premium Since</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {users.map(user => (
                <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">{user.email || 'N/A'}</td>
                  <td className="p-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                      user.plan === 'premium' ? "bg-[#5A5A40] text-white" : "bg-gray-200 text-gray-600"
                    )}>
                      {user.plan}
                    </span>
                  </td>
                  <td className="p-4">{user.createdAt ? format(user.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}</td>
                  <td className="p-4">{user.premiumSince ? format(user.premiumSince.toDate(), 'MMM d, yyyy') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-2">
          <Lightbulb className="text-[#5A5A40]" size={20} />
          <h3 className="text-lg font-serif">User Suggestions</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {suggestions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No suggestions yet.</div>
          ) : (
            suggestions.map(suggestion => {
              const user = users.find(u => u.uid === suggestion.uid);
              return (
                <div key={suggestion.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm text-gray-900">
                      {user?.email || 'Unknown User'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {suggestion.timestamp ? format(suggestion.timestamp.toDate(), 'MMM d, yyyy h:mm a') : 'N/A'}
                    </div>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap text-sm">{suggestion.suggestion}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'entry' | 'reports' | 'billing' | 'suggestions' | 'admin'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const emailLinkProcessed = React.useRef(false);
  const [isProcessingLink, setIsProcessingLink] = useState(isSignInWithEmailLink(auth, window.location.href));
  const [linkEmailRequired, setLinkEmailRequired] = useState(false);
  const [linkError, setLinkError] = useState('');

  useEffect(() => {
    const handleStripeRedirects = async () => {
      const query = new URLSearchParams(window.location.search);
      if (query.get('success') && profile && profile.plan !== 'premium') {
        try {
          await updateDoc(doc(db, 'users', profile.uid), {
            plan: 'premium',
            premiumSince: serverTimestamp()
          });
          window.history.replaceState({}, document.title, window.location.pathname);
          alert('Payment successful! You are now a Premium user.');
        } catch (error) {
          console.error('Error upgrading user:', error);
        }
      }
      if (query.get('canceled')) {
        alert('Payment was canceled. You have not been charged.');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };
    handleStripeRedirects();
  }, [profile]);

  useEffect(() => {
    const handleEmailLinkSignIn = async () => {
      if (isSignInWithEmailLink(auth, window.location.href) && !emailLinkProcessed.current) {
        emailLinkProcessed.current = true;
        let email = window.localStorage.getItem('emailForSignIn');
        
        if (!email) {
          setLinkEmailRequired(true);
          setLoading(false);
          return;
        }
        
        try {
          setLoading(true);
          const result = await signInWithEmailLink(auth, email, window.location.href);
          window.localStorage.removeItem('emailForSignIn');
          
          // Check if user profile exists, if not create it
          const user = result.user;
          const profileDoc = await getDoc(doc(db, 'users', user.uid));
          if (!profileDoc.exists()) {
            await setDoc(doc(db, 'users', user.uid), {
              uid: user.uid,
              email: user.email,
              plan: 'basic',
              currency: 'GBP',
              createdAt: serverTimestamp()
            });
          }
          
          // Remove the sign-in link parameters from the URL
          window.history.replaceState(null, '', window.location.pathname);
        } catch (error: any) {
          console.error('Error signing in with email link', error);
          setLinkError(error.message || 'Failed to sign in. The link may be expired or already used.');
        } finally {
          setIsProcessingLink(false);
          setLoading(false);
        }
      }
    };
    
    handleEmailLinkSignIn();
  }, []);

  const handleProvideEmailForLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    
    if (email) {
      setLinkEmailRequired(false);
      setIsProcessingLink(true);
      try {
        setLoading(true);
        const result = await signInWithEmailLink(auth, email, window.location.href);
        window.localStorage.removeItem('emailForSignIn');
        
        const user = result.user;
        const profileDoc = await getDoc(doc(db, 'users', user.uid));
        if (!profileDoc.exists()) {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            plan: 'basic',
            currency: 'GBP',
            createdAt: serverTimestamp()
          });
        }
        
        window.history.replaceState(null, '', window.location.pathname);
      } catch (error: any) {
        console.error('Error signing in with email link', error);
        setLinkError(error.message || 'Failed to sign in. The link may be expired or already used.');
      } finally {
        setIsProcessingLink(false);
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setSales([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setProfile(doc.data() as UserProfile);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching profile', error);
      setLoading(false);
    });

    return () => unsubProfile();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let q;
    const plan = profile?.plan || 'basic';
    
    if (plan === 'premium') {
      q = query(
        collection(db, 'sales'),
        where('uid', '==', user.uid),
        orderBy('timestamp', 'desc'),
        limit(2000)
      );
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      q = query(
        collection(db, 'sales'),
        where('uid', '==', user.uid),
        where('timestamp', '>=', Timestamp.fromDate(thirtyDaysAgo)),
        orderBy('timestamp', 'desc'),
        limit(2000)
      );
    }

    const unsubSales = onSnapshot(q, (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data({ serverTimestamps: 'estimate' })
      })) as Sale[];
      
      // Sort on client side to handle pending timestamps (nulls)
      // Pending sales should be at the top
      const sortedSales = [...salesData].sort((a, b) => {
        if (!a.timestamp) return -1;
        if (!b.timestamp) return 1;
        return b.timestamp.toMillis() - a.timestamp.toMillis();
      });
      
      setSales(sortedSales);
    }, (error) => {
      console.error('Error fetching sales', error);
    });

    return () => unsubSales();
  }, [user, profile?.plan]);

  useEffect(() => {
    // Only set loading to false if we aren't processing a magic link
    if (!isSignInWithEmailLink(auth, window.location.href)) {
      if (!user) {
        setLoading(false);
      }
    }
  }, [user]);

  const handleAddSale = async (saleData: Omit<Sale, 'id' | 'uid' | 'timestamp'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'sales'), {
        ...saleData,
        uid: user.uid,
        timestamp: serverTimestamp()
      });
      setActiveTab('dashboard');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'sales');
    }
  };

  const handleEditSale = async (id: string, data: Partial<Sale>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'sales', id), data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `sales/${id}`);
    }
  };

  const handleDeleteSale = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'sales', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `sales/${id}`);
    }
  };

  const handleDowngrade = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), { plan: 'basic', premiumSince: null }, { merge: true });
      setProfile(prev => prev ? { ...prev, plan: 'basic', premiumSince: null } : null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleUpdateCurrency = async (currency: string) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), { currency }, { merge: true });
      setProfile(prev => prev ? { ...prev, currency } : null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  if (loading || isProcessingLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#5A5A40] mx-auto mb-4"></div>
          <p className="text-[#5A5A40] font-medium">Completing sign in...</p>
        </div>
      </div>
    );
  }

  if (linkEmailRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0] p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-8">
          <h2 className="text-2xl font-serif text-center text-[#1A1A1A] mb-4">
            Confirm your email
          </h2>
          <p className="text-center text-gray-500 mb-6 font-sans text-sm">
            You opened this link on a different device or browser. Please enter your email to complete sign in.
          </p>
          {linkError && <p className="text-red-500 text-sm mb-4 text-center">{linkError}</p>}
          <form onSubmit={handleProvideEmailForLink} className="space-y-4">
            <div>
              <input
                type="email"
                name="email"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#5A5A40] text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-[#4A4A30] transition-all"
            >
              Complete Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        {linkError && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-100 text-red-800 px-6 py-3 rounded-xl shadow-lg font-medium text-sm flex items-center gap-3">
            <span>{linkError}</span>
            <button onClick={() => setLinkError('')} className="text-red-600 hover:text-red-900 text-xl leading-none">&times;</button>
          </div>
        )}
        <Auth onAuthSuccess={() => {}} />
      </>
    );
  }

  const isAdminUser = profile?.role === 'admin';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'entry', label: 'New Sale', icon: PlusCircle },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'suggestions', label: 'Suggestions', icon: Lightbulb },
  ];

  if (isAdminUser) {
    menuItems.push({ id: 'admin', label: 'Admin', icon: Users });
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#F5F5F0] flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-10 h-10 bg-[#5A5A40] rounded-xl flex items-center justify-center shadow-md">
            <Scissors className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-serif font-bold text-[#1A1A1A]">BarberTrack</h1>
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all",
                activeTab === item.id 
                  ? "bg-[#5A5A40] text-white shadow-lg shadow-[#5A5A40]/20" 
                  : "text-gray-500 hover:bg-gray-50"
              )}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-gray-100">
          <div className="flex items-center gap-3 px-2 mb-6">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <UserIcon size={20} className="text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{user.email?.split('@')[0]}</p>
              <p className="text-[10px] text-[#5A5A40] font-bold uppercase tracking-widest">{profile?.plan} Plan</p>
            </div>
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white z-50 px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#5A5A40] rounded-lg flex items-center justify-center">
            <Scissors className="text-white w-5 h-5" />
          </div>
          <span className="font-serif font-bold">BarberTrack</span>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2">
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] md:hidden" onClick={() => setIsSidebarOpen(false)}>
          <div 
            className="w-72 h-full bg-white p-6 flex flex-col animate-in slide-in-from-left duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-2">
                <Scissors className="text-[#5A5A40]" />
                <span className="font-serif font-bold">BarberTrack</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <nav className="flex-1 space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all",
                    activeTab === item.id 
                      ? "bg-[#5A5A40] text-white" 
                      : "text-gray-500"
                  )}
                >
                  <item.icon size={20} />
                  {item.label}
                </button>
              ))}
            </nav>
            <button 
              onClick={() => signOut(auth)}
              className="mt-auto flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-red-500"
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 mt-16 md:mt-0 overflow-y-auto">
        <header className="mb-8 hidden md:block">
          <h2 className="text-4xl font-serif text-[#1A1A1A] capitalize">{activeTab}</h2>
          <p className="text-gray-400 mt-1">Manage and track your shop performance</p>
        </header>

        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard sales={sales} profile={profile} onEditSale={handleEditSale} onDeleteSale={handleDeleteSale} />}
          {activeTab === 'entry' && <SalesEntry onAdd={handleAddSale} profile={profile} />}
          {activeTab === 'reports' && <Reports sales={sales} profile={profile} />}
          {activeTab === 'billing' && <Billing profile={profile} onDowngrade={handleDowngrade} onUpdateCurrency={handleUpdateCurrency} />}
          {activeTab === 'suggestions' && <Suggestions profile={profile} />}
          {activeTab === 'admin' && isAdminUser && <AdminDashboard />}
        </div>
      </main>
    </div>
    </ErrorBoundary>
  );
}
