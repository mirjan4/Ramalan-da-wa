import { useState, useEffect, useMemo } from 'react';
import { dashboardService, seasonService } from '../services/api';
import { 
  Users, Banknote, Landmark, CreditCard, Scale, Plus, Settings, BookOpen,
  ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown 
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

  const pieData = stats?.teams ? [...stats.teams].sort((a, b) => b.collection - a.collection) : [];

  const renderLegend = (props) => {
    const { payload } = props;
    return (
      <div className="flex overflow-x-auto gap-4 pb-2 mt-4 px-2 w-full custom-scrollbar">
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center gap-2 whitespace-nowrap min-w-fit">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-xs font-semibold text-slate-600">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  // Minimal sparkline data
  const sparklineData = [
    { value: 400 }, { value: 380 }, { value: 420 }, { value: 410 }, 
    { value: 450 }, { value: 440 }, { value: 480 }
  ];

  const expensePercentage = stats?.totalCollection > 0 
    ? ((stats.totalExpense / stats.totalCollection) * 100).toFixed(1) 
    : 0;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto bg-slate-50/30 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Overview</h1>
          <p className="text-slate-500 font-medium mt-2 flex items-center gap-2 text-xs">
            <span className="text-indigo-600 font-semibold">{activeSeason.name}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Campaign Status: Active</span>
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link to="/add-team" className="flex-1 md:flex-none bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
            <Plus size={18} /> New Team
          </Link>
          <Link to="/reports" className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
            <BookOpen size={18} /> Reports
          </Link>
        </div>
      </div>  

      {stats && (
        <div className="space-y-10">
          {/* Row 1: Minimalist Financial Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Collection</p>
                  <h3 className="text-3xl font-bold text-slate-900 tracking-tight">₹{stats.totalCollection.toLocaleString()}</h3>
                </div>
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Banknote size={20} />
                </div>
              </div>
              <div className="h-10 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData}>
                    <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Operational Expense</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-slate-900 tracking-tight">₹{stats.totalExpense.toLocaleString()}</h3>
                    <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full">{expensePercentage}%</span>
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 text-slate-600 rounded-xl">
                  <Scale size={20} />
                </div>
              </div>
              <div className="h-10 w-full mt-4 opacity-50">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...sparklineData].reverse()}>
                    <Line type="monotone" dataKey="value" stroke="#94a3b8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Net Balance</p>
                  <h3 className="text-3xl font-bold text-emerald-600 tracking-tight">₹{stats.netBalance.toLocaleString()}</h3>
                </div>
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="h-10 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData}>
                    <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 2: Payment & Team Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center justify-between group cursor-default shadow-sm sm:shadow-none hover:shadow-sm transition-all">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Bank Assets</p>
                <p className="text-xl font-bold text-slate-900 tracking-tight">₹{stats.bankTotal.toLocaleString()}</p>
              </div>
              <Landmark size={20} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center justify-between group cursor-default shadow-sm sm:shadow-none hover:shadow-sm transition-all">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cash Handling</p>
                <p className="text-xl font-bold text-slate-900 tracking-tight">₹{stats.cashTotal.toLocaleString()}</p>
              </div>
              <CreditCard size={20} className="text-slate-300 group-hover:text-amber-400 transition-colors" />
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center justify-between group cursor-default shadow-sm sm:shadow-none hover:shadow-sm transition-all">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Teams</p>
                <p className="text-xl font-bold text-slate-900 tracking-tight">{stats.totalTeams}</p>
              </div>
              <Users size={20} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center justify-between group cursor-default shadow-sm sm:shadow-none hover:shadow-sm transition-all">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Settlement</p>
                <div className="flex items-center gap-2">
                   <span className="text-xs font-bold text-emerald-600">{stats.settledTeams || 0} Settled</span>
                   <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                   <span className="text-xs font-bold text-rose-400">{stats.pendingTeams || 0} Open</span>
                </div>
              </div>
              <Scale size={20} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>
          </div>

          {/* Row 3: Refined Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Collection Distribution</h2>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div> Team Contribution
                </div>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="85%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius="65%"
                      outerRadius="85%"
                      paddingAngle={4}
                      dataKey="collection"
                      nameKey="name"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', padding: '12px' }}
                      itemStyle={{ fontWeight: 'bold' }}
                      formatter={(value) => `₹${value.toLocaleString()}`}
                    />
                    <Legend content={renderLegend} verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Profit vs Cost</h2>
                <div className="flex items-center gap-3">
                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                     <div className="w-2 h-2 rounded-sm bg-indigo-500"></div> Collection
                   </div>
                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                     <div className="w-2 h-2 rounded-sm bg-rose-500"></div> Expense
                   </div>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ fill: '#f8fafc', radius: 10 }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}
                      formatter={(value) => `₹${value.toLocaleString()}`}
                    />
                    <Bar dataKey="amount" radius={[12, 12, 12, 12]} barSize={50}>
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-8">
            {[
              { icon: <Plus size={20} />, label: "Add New Team", path: "/add-team", color: "bg-indigo-600" },
              { icon: <Users size={20} />, label: "Team Management", path: "/teams", color: "bg-blue-600" },
              { icon: <BookOpen size={20} />, label: "Assign Books", path: "/assign-book", color: "bg-indigo-700" },
              { icon: <Scale size={20} />, label: "Collections", path: "/collection", color: "bg-indigo-900" },
            ].map((action, idx) => (
              <Link key={idx} to={action.path} className="bg-white border border-slate-100 hover:bg-slate-50 p-6 md:p-8 rounded-3xl flex flex-col items-center justify-center gap-4 group transition-all duration-300 shadow-sm">
                <div className={`p-4 md:p-5 rounded-2xl text-white ${action.color} shadow-lg shadow-black/5 group-hover:scale-110 transition-transform`}>
                  {action.icon}
                </div>
                <span className="font-bold text-slate-800 text-base md:text-lg text-center">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
