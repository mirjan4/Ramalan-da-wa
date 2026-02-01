import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import AddTeam from './pages/AddTeam';
import AssignReceiptBook from './pages/AssignReceiptBook';
import CollectionEntry from './pages/CollectionEntry';
import Settlement from './pages/Settlement';
import Reports from './pages/Reports';
import Season from './pages/Season';
import TeamsList from './pages/TeamsList';
import Settings from './pages/Settings';
import FieldDataList from './pages/FieldDataList';
import FieldDataForm from './pages/FieldDataForm';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    return (
        <Router>
            <div className="min-h-screen flex bg-slate-50 relative overflow-x-hidden">
                {user && (
                    <>
                        {/* Mobile Overlay */}
                        {sidebarOpen && (
                            <div
                                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden"
                                onClick={() => setSidebarOpen(false)}
                            />
                        )}
                        <Sidebar
                            setUser={setUser}
                            isOpen={sidebarOpen}
                            onClose={() => setSidebarOpen(false)}
                        />
                    </>
                )}
                <div className="flex-1 flex flex-col min-w-0">
                    {user && <Navbar user={user} onMenuClick={toggleSidebar} />}
                    <main className="flex-1 overflow-y-auto w-full">
                        <Routes>
                            <Route path="/login" element={user ? <Navigate to="/" /> : <Login setUser={setUser} />} />

                            <Route element={<ProtectedRoute user={user} />}>
                                <Route path="/" element={user?.role === 'data_collector' ? <Navigate to="/field-data" /> : <Dashboard />} />
                                <Route path="/season" element={<Season />} />
                                <Route path="/teams" element={<TeamsList />} />
                                <Route path="/add-team" element={<AddTeam />} />
                                <Route path="/edit-team/:id" element={<AddTeam />} />
                                <Route path="/assign-book" element={<AssignReceiptBook />} />
                                <Route path="/collection" element={<CollectionEntry />} />
                                <Route path="/reports" element={<Reports />} />
                                <Route path="/settings" element={<Settings />} />
                                <Route path="/field-data" element={<FieldDataList />} />
                                <Route path="/field-data/new" element={<FieldDataForm />} />
                                <Route path="/field-data/edit/:id" element={<FieldDataForm />} />
                            </Route>
                        </Routes>
                    </main>
                </div>
            </div>
        </Router>
    );
}

export default App;
