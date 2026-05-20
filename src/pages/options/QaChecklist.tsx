import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { CheckSquare, Square, RefreshCcw } from 'lucide-react';
import clsx from 'clsx';

const QA_CHECKLIST = [
  {
    category: '1. Access Control Matrix',
    items: [
      'Login as system_admin -> /options/project-types accessible',
      'Login as view_only -> Admin buttons hidden',
      'Login as field_engineer -> Redirects to /engineer',
    ],
  },
  {
    category: '2. DB Resiliency',
    items: [
      'Kill DB process -> App shows "Offline Mode"',
      'Restart DB -> App recovers within 3 seconds',
    ],
  },
  {
    category: '3. Data Flows',
    items: [
      'Field Engineer uploads photo -> DB size increments, visible in System Admin UI',
      'Update "Survey" status offline -> Syncs when online',
    ],
  },
];

export default function QaChecklist() {
  const { currentUser } = useAuth();
  
  if (currentUser?.role !== 'system_admin') {
    return <Navigate to="/" replace />;
  }

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = localStorage.getItem('qa_checklist_state');
    if (saved) {
      try {
        setCheckedItems(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const toggleItem = (category: string, item: string) => {
    const key = `${category}-${item}`;
    setCheckedItems(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('qa_checklist_state', JSON.stringify(next));
      return next;
    });
  };

  const resetAll = () => {
    if (confirm('Reset all QA checklist progress?')) {
      setCheckedItems({});
      localStorage.removeItem('qa_checklist_state');
    }
  };

  const totalItems = QA_CHECKLIST.reduce((acc, cat) => acc + cat.items.length, 0);
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const progress = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 mb-1">QA Release Checklist</h1>
          <p className="text-sm text-slate-500">Manual test matrix to be executed post-deployment.</p>
        </div>
        <button
          onClick={resetAll}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCcw className="w-4 h-4" /> Reset
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-slate-700">Test Progress</span>
          <span className="text-sm font-black text-slate-800">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-6">
        {QA_CHECKLIST.map(category => (
          <div key={category.category} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
              <h2 className="font-black text-slate-800">{category.category}</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {category.items.map(item => {
                const key = `${category.category}-${item}`;
                const isChecked = !!checkedItems[key];
                return (
                  <div
                    key={item}
                    className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => toggleItem(category.category, item)}
                  >
                    <div className="shrink-0 mt-0.5">
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300" />
                      )}
                    </div>
                    <div className={clsx("flex-1 text-sm font-medium transition-colors", isChecked ? "text-slate-400 line-through" : "text-slate-700")}>
                      {item}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
