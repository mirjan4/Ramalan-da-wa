import { useState, useEffect, useMemo } from 'react';
import { dashboardService, seasonService } from '../services/api';
import {
  Users, Banknote, Landmark, CreditCard, Scale, Plus, Settings, BookOpen,
  ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, CheckCircle2, Award, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
  LineChart, Line
} from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [activeSeason, setActiveSeason] = useState(null);
  const [showUmrahModal, setShowUmrahModal] = useState(false);

  const COLORS = [
    "#2563EB",
    "#0EA5E9",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#6366F1",
    "#14B8A6",
    "#9333EA",
    "#F97316",
    "#06B6D4",
    "#84CC16",
    "#EC4899",
    "#22C55E",
    "#F43F5E",
    "#3B82F6",
    "#4ADE80",
    "#A855F7",
    "#FB923C",
    "#EAB308",
    "#0EA5E9"
  ];

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
    { name: 'Collection', amount: stats.totalCollection, color: '#1E5FA8' },
    { name: 'Expense', amount: stats.totalExpense, color: '#EF4444' }
  ] : [];

  const chartData = useMemo(() => {
    return (stats?.teams || [])
      .sort((a, b) => b.collection - a.collection)
      .map((team, index) => ({
        ...team,
        fill: COLORS[index % COLORS.length]
      }));
  }, [stats?.teams]);

  const umrahQualifiers = useMemo(() => {
    if (!stats?.teams) return [];
    return stats.teams
      .map(team => {
        let slots = 0;
        if (team.collection >= 700000) slots = 2;
        else if (team.collection >= 500000) slots = 1;
        return { ...team, slots };
      })
      .filter(team => team.slots > 0)
      .sort((a, b) => b.collection - a.collection);
  }, [stats?.teams]);

  const totalUmrahSlots = useMemo(() => {
    return umrahQualifiers.reduce((sum, team) => sum + team.slots, 0);
  }, [umrahQualifiers]);

  if (!activeSeason) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center">
        <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 text-slate-600 max-w-md shadow-sm">
          <Settings className="w-12 h-12 mb-4 mx-auto opacity-20" />
          <h2 className="text-xl font-bold mb-2 text-[#0F3B66]">No Active Season</h2>
          <p className="mb-6 text-sm text-slate-500">You must create and activate a campaign season before managing team data.</p>
          <Link to="/season" className="btn-primary inline-flex items-center gap-2">
            Go to Season Management
          </Link>
        </div>
      </div>
    );
  }

  // Minimal sparkline data
  const sparklineData = [
    { value: 400 }, { value: 380 }, { value: 420 }, { value: 410 },
    { value: 450 }, { value: 440 }, { value: 480 }
  ];

  const expensePercentage = stats?.totalCollection > 0
    ? ((stats.totalExpense / stats.totalCollection) * 100).toFixed(1)
    : 0;

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-2xl font-bold text-[#0F3B66] tracking-tight">Overview</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-[#E6F0FA] text-[#1E5FA8] rounded text-[10px] font-bold uppercase tracking-wider">
              {activeSeason.name}
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">• Operational Overview</span>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link to="/add-team" className="btn-primary text-sm flex items-center gap-2 px-5 py-2.5">
            <Plus size={18} /> New Team
          </Link>
          <Link to="/reports" className="btn-secondary text-sm flex items-center gap-2 px-5 py-2.5">
            <BookOpen size={18} /> Reports
          </Link>
        </div>
      </div>

      {stats && (
        <div className="space-y-10">
          {/* Row 1: Minimalist Financial Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 border-l-4 border-l-[#1E5FA8] shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Collection</p>
                  <h3 className="text-2xl font-bold text-[#0F3B66] tracking-tight">₹{stats.totalCollection.toLocaleString()}</h3>
                </div>
                <div className="p-2 bg-[#E6F0FA] text-[#1E5FA8] rounded-lg">
                  <Banknote size={18} />
                </div>
              </div>
              <div className="h-8 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData}>
                    <Line type="monotone" dataKey="value" stroke="#1E5FA8" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 border-l-4 border-l-[#EF4444] shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Expenses</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-[#0F3B66] tracking-tight">₹{stats.totalExpense.toLocaleString()}</h3>
                    <span className="text-[10px] font-bold text-rose-500">{expensePercentage}%</span>
                  </div>
                </div>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                  <Scale size={18} />
                </div>
              </div>
              <div className="h-8 w-full opacity-30">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...sparklineData].reverse()}>
                    <Line type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 border-l-4 border-l-[#10B981] shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Net Balance</p>
                  <h3 className="text-2xl font-bold text-[#10B981] tracking-tight">₹{stats.netBalance.toLocaleString()}</h3>
                </div>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="h-8 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData}>
                    <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 2: Payment & Team Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-50 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Bank Assets</p>
                <p className="text-lg font-bold text-[#0F3B66]">₹{stats.bankTotal.toLocaleString()}</p>
              </div>
              <Landmark size={18} className="text-[#1E5FA8]" />
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-50 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cash In Hand</p>
                <p className="text-lg font-bold text-[#0F3B66]">₹{stats.cashTotal.toLocaleString()}</p>
              </div>
              <CreditCard size={18} className="text-[#F59E0B]" />
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-50 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Teams</p>
                <p className="text-lg font-bold text-[#0F3B66]">{stats.totalTeams}</p>
              </div>
              <Users size={18} className="text-slate-400" />
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-50 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Finalized</p>
                <p className="text-lg font-bold text-[#10B981]">{stats.settledTeams || 0} <span className="text-[10px] text-slate-300 ml-1">/ {stats.totalTeams}</span></p>
              </div>
              <CheckCircle2 size={18} className="text-[#10B981]" />
            </div>

            <div
              onClick={() => setShowUmrahModal(true)}
              className="bg-white p-5 rounded-xl border border-slate-50 flex items-center justify-between shadow-sm cursor-pointer hover:border-amber-200 hover:shadow-md transition-all group"
            >
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Umrah Rewards</p>
                <p className="text-lg font-bold text-[#0F3B66]">🕋 {totalUmrahSlots} Slots</p>
              </div>
              <Award size={18} className="text-amber-500 group-hover:scale-110 transition-transform" />
            </div>
          </div>

          {/* Row 3: Refined Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm col-span-1 lg:col-span-1">
              <h2 className="text-sm font-bold text-[#0F3B66] mb-6 border-b border-slate-50 pb-4">Team Collections</h2>
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="h-[280px] w-full md:w-[45%] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius="65%"
                        outerRadius="90%"
                        paddingAngle={3}
                        dataKey="collection"
                        nameKey="name"
                        stroke="none"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', fontSize: '11px', fontWeight: '600' }}
                        formatter={(value) => `₹${value.toLocaleString()}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="w-full md:w-[55%] max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="space-y-1">
                    {chartData.map((team, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: team.fill }} />
                          <span className="text-xs font-semibold text-slate-600 truncate max-w-[120px]">{team.name}</span>
                        </div>
                        <span className="text-[11px] font-bold text-[#0F3B66]">₹{team.collection.toLocaleString()}</span>
                      </div>
                    ))}
                    {chartData.length === 0 && (
                      <div className="py-10 text-center text-slate-400 text-xs italic">No data available</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
              <h2 className="text-base font-bold text-[#0F3B66] mb-6 border-b border-slate-50 pb-4">Expenses vs Collections</h2>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '8px', border: '1px solid #f1f5f9', fontSize: '12px' }} formatter={(value) => `₹${value.toLocaleString()}`} />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={60}>
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
            {[
              { icon: <Plus size={20} />, label: "Add New Team", path: "/add-team", bg: "bg-[#E6F0FA]", text: "text-[#1E5FA8]" },
              { icon: <Users size={20} />, label: "Manage Teams", path: "/teams", bg: "bg-slate-50", text: "text-slate-600" },
              { icon: <BookOpen size={20} />, label: "Book Audit", path: "/book-report", bg: "bg-slate-50", text: "text-slate-600" },
              { icon: <Scale size={20} />, label: "Settlements", path: "/collection", bg: "bg-slate-50", text: "text-slate-600" },
            ].map((action, idx) => (
              <Link key={idx} to={action.path} className="bg-white border border-slate-100 hover:border-[#1E5FA8]/30 hover:shadow-md p-6 rounded-2xl flex flex-col items-center gap-4 transition-all duration-300">
                <div className={`p-4 rounded-xl ${action.bg} ${action.text}`}>
                  {action.icon}
                </div>
                <span className="font-bold text-slate-700 text-sm">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Umrah Rewards Detail Modal */}
      {showUmrahModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Award size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#0F3B66]">Umrah Reward Qualifiers</h2>
                  <p className="text-xs text-slate-500 font-medium">Institutional targets: <span className="font-bold text-amber-600">🕋 {totalUmrahSlots} Slots Archived</span></p>
                </div>
              </div>
              <button onClick={() => setShowUmrahModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {umrahQualifiers.length > 0 ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="pb-3 px-2">Team Unit</th>
                      <th className="pb-3 px-2 text-center">Collection</th>
                      <th className="pb-3 px-2 text-right">Umrah Slots</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {umrahQualifiers.map((team, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-2">
                          <p className="font-bold text-[#0F3B66]">{team.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Qualified Entry</p>
                        </td>
                        <td className="py-4 px-2 text-center">
                          <span className="font-bold text-slate-700">₹{team.collection.toLocaleString()}</span>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <div className="flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-black">
                              {Array(team.slots).fill("🕋").join(" ")}
                            </span>
                            <span className="text-[10px] font-bold text-amber-600 mt-1 uppercase tracking-widest">{team.slots} Slot{team.slots > 1 ? 's' : ''} Achieved</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-20 text-center">
                  <Award size={48} className="mx-auto text-slate-100 mb-4" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No teams have reached reward thresholds yet.</p>
                  <p className="text-[10px] text-slate-300 mt-1 italic">Qualifying starts at ₹5,00,000</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowUmrahModal(false)}
                className="px-8 py-3 bg-[#0F3B66] text-white font-bold rounded-xl hover:bg-[#1E5FA8] transition-all shadow-lg shadow-blue-900/10"
              >
                Close 
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
