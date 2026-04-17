import { useState } from 'react';
import People from './People';
import Teams from './Teams';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Users, UserCircle } from 'lucide-react';
import clsx from 'clsx';

export default function Workforce() {
    const { can } = useAuth();
    const [activeTab, setActiveTab] = useState<'people' | 'teams'>('people');

    if (!can('people.view') && !can('teams.view')) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="flex flex-col h-[calc(100vh-60px)] overflow-hidden bg-slate-50/50">
            <div className="bg-white border-b border-slate-200 px-8 pt-6 shadow-sm z-10 shrink-0 relative">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-800">Workforce Management</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage personnel, field assignments, and dynamic teams.</p>
                </div>
                <div className="flex gap-8 -mb-px">
                    <button 
                        onClick={() => setActiveTab('people')}
                        className={clsx(
                            "pb-3 px-1 font-medium text-sm transition-all border-b-2 flex items-center gap-2",
                            activeTab === 'people' ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
                        )}
                    >
                        <UserCircle className={clsx("w-5 h-5", activeTab === 'people' ? "text-blue-600" : "text-slate-400")} />
                        Personnel Data
                    </button>
                    <button 
                        onClick={() => setActiveTab('teams')}
                        className={clsx(
                            "pb-3 px-1 font-medium text-sm transition-all border-b-2 flex items-center gap-2",
                            activeTab === 'teams' ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
                        )}
                    >
                        <Users className={clsx("w-5 h-5", activeTab === 'teams' ? "text-blue-600" : "text-slate-400")} />
                        Field Teams
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-[1600px] mx-auto w-full p-6">
                    {activeTab === 'people' && <People isSubView={true} />}
                    {activeTab === 'teams' && <Teams isSubView={true} />}
                </div>
            </div>
        </div>
    );
}
