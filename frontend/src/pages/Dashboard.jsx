import { useState, useEffect } from 'react';
import { dashboardService, seasonService } from '../services/api';
import { Users, Banknote, Landmark, CreditCard, Scale, Plus, Settings, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList
} from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [activeSeason, setActiveSeason] = useState(null);


  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const seasonRes = await seasonService.getActive();
        setActiveSeason(seasonRes.data);
        if (seasonRes.data) {
          const statsRes = await dashboardService.getStats(seasonRes.data._id);
          setStats(statsRes.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const barData = stats ? [
    { name: 'Collection', amount: stats.totalCollection, color: '#6366f1' },
    { name: 'Expense', amount: stats.totalExpense, color: '#f43f5e' }
  ] : [];

  if (!activeSeason) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center">
        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 text-amber-800 max-w-md">
          <Settings className="w-12 h-12 mb-4 mx-auto opacity-50" />
          <h2 className="text-xl font-bold mb-2">No Active Season</h2>
          <p className="mb-4">You must create and activate a season before managing teams.</p>
          <Link to="/season" className="btn-primary inline-flex items-center gap-2">
            Go to Season Management
          </Link>
        </div>
      </div>
    );
  }

  // Use all teams data directly
  const pieData = stats?.teams ? [...stats.teams].sort((a, b) => b.collection - a.collection) : [];

  // Custom Scrollable Legend
  const renderLegend = (props) => {
    const { payload } = props;
    return (
      <div className="flex overflow-x-auto gap-4 pb-2 mt-4 px-2 w-full custom-scrollbar">
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center gap-2 whitespace-nowrap min-w-fit">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs font-semibold text-slate-600">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">Managing collection for: <span className="text-indigo-600 font-semibold">{activeSeason.name}</span></p>
        </div>
        <div className="flex gap-4">
          <Link to="/reports" className="btn-secondary flex items-center gap-2">
            View All Reports
          </Link>
          <Link to="/add-team" className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Add New Team
          </Link>
        </div>
      </div>

      {stats && (
        <div className="space-y-8">
          {/* Row 1: Core Financials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="stat-card border-l-4 border-indigo-500">
              <div className="flex justify-between items-start">
                <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Banknote size={18} /></span>
              </div>
              <span className="text-2xl font-black text-slate-900 mt-2">₹{stats.totalCollection.toLocaleString()}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Collection</span>
            </div>

            <div className="stat-card border-l-4 border-rose-500">
              <div className="flex justify-between items-start">
                <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg"><Scale size={18} /></span>
              </div>
              <span className="text-2xl font-black text-slate-900 mt-2">₹{stats.totalExpense.toLocaleString()}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Expense</span>
            </div>

            <div className="stat-card bg-slate-900 text-white border-none shadow-indigo-200">
              <div className="flex justify-between items-start">
                <span className="p-1.5 bg-white/10 text-emerald-400 rounded-lg"><Banknote size={18} /></span>
                <span className="text-[9px] font-black bg-emerald-500 px-2 py-0.5 rounded text-white uppercase tracking-tighter">Net Profit</span>
              </div>
              <span className="text-2xl font-black text-emerald-400 mt-2">₹{stats.netBalance.toLocaleString()}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Balance</span>
            </div>
          </div>

          {/* Row 2: Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="stat-card">
              <div className="flex justify-between items-start">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Landmark size={18} /></span>
              </div>
              <span className="text-xl font-bold text-slate-800 mt-2">₹{stats.bankTotal.toLocaleString()}</span>
              <span className="text-xs text-slate-500">Bank Total</span>
            </div>

            <div className="stat-card">
              <div className="flex justify-between items-start">
                <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><CreditCard size={18} /></span>
              </div>
              <span className="text-xl font-bold text-slate-800 mt-2">₹{stats.cashTotal.toLocaleString()}</span>
              <span className="text-xs text-slate-500">Cash Total</span>
            </div>

            <div className="stat-card relative group cursor-help transition-all duration-300 hover:ring-2 hover:ring-slate-100 overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="p-1.5 bg-slate-50 text-slate-600 rounded-lg group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors"><Users size={18} /></span>
              </div>
              <span className="text-xl font-bold text-slate-800 mt-2">{stats.totalTeams}</span>
              <span className="text-xs text-slate-500">Total Teams</span>

              {/* Hover Details Overlay */}
              <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm p-4 flex flex-col justify-center translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Settled</span>
                  <span className="text-lg font-black text-white">{stats.settledTeams || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Pending</span>
                  <span className="text-lg font-black text-white">{stats.pendingTeams || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Visual Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-card p-6 border-none bg-white">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Users className="text-indigo-600" size={18} /> Team Collection Share
              </h2>
              <div className="h-[350px] w-full flex flex-col">
                <ResponsiveContainer width="100%" height="85%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius="50%"
                      outerRadius="80%"
                      paddingAngle={2}
                      dataKey="collection"
                      nameKey="name"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      formatter={(value) => `₹${value.toLocaleString()}`}
                    />
                    <Legend content={renderLegend} verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-6 border-none bg-white">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Scale className="text-indigo-600" size={18} /> Collection vs Expense
              </h2>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      formatter={(value) => `₹${value.toLocaleString()}`}
                    />
                    <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={60}>
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                      <LabelList
                        dataKey="amount"
                        position="top"
                        formatter={(v) => `₹${v.toLocaleString()}`}
                        style={{ fill: '#64748b', fontSize: '12px', fontWeight: 'bold' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-8">
        {[
          { icon: <Plus size={20} />, label: "Add New Team", path: "/add-team", color: "bg-indigo-600" },
          { icon: <Users size={20} />, label: "Team Management", path: "/teams", color: "bg-blue-600" },
          { icon: <BookOpen size={20} />, label: "Assign Books", path: "/assign-book", color: "bg-indigo-700" },
          { icon: <Scale size={20} />, label: "Collection & Settlement", path: "/collection", color: "bg-indigo-900" },
        ].map((action, idx) => (
          <Link key={idx} to={action.path} className="glass-card hover:bg-slate-50 border-none p-6 md:p-8 flex flex-col items-center justify-center gap-4 group transition-all duration-300">
            <div className={`p-4 md:p-5 rounded-2xl text-white ${action.color} shadow-lg shadow-black/10 group-hover:scale-110 transition-transform`}>
              {action.icon}
            </div>
            <span className="font-bold text-slate-800 text-base md:text-lg text-center">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
