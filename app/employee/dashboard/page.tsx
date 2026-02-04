"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

import { useLanguage } from '@/context/LanguageContext';

export default function EmployeeDashboard() {
    const router = useRouter();
    const { t } = useLanguage();
    const [emp, setEmp] = useState<{ id: string, name: string } | null>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check session
        const session = localStorage.getItem('employee_session');
        if (!session) {
            router.push('/employee/login');
            return;
        }
        const user = JSON.parse(session);
        setEmp(user);
        fetchLogs(user.id);
    }, []);

    const fetchLogs = async (employeeId: string) => {
        const { data } = await supabase
            .from('attendance_logs')
            .select('*')
            .eq('employee_id', employeeId)
            .order('timestamp', { ascending: false })
            .limit(50);

        if (data) setLogs(data);
        setLoading(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('employee_session');
        router.push('/employee/login');
    };

    if (!emp) return null;

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Welcome, {emp.name} 👋</h1>
                        <p className="text-gray-500 text-sm">{t('employee_portal')}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-200 transition-colors"
                    >
                        {t('logout')}
                    </button>
                </header>

                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800">{t('attendance_logs')}</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                    <th className="p-4">{t('time')}</th>
                                    <th className="p-4">{t('mode')}</th>
                                    <th className="p-4">{t('status')}</th>
                                    <th className="p-4">{t('fines')} / {t('bonuses')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-gray-400">{t('loading_data')}</td></tr>
                                ) : logs.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-gray-400">{t('no_records')}</td></tr>
                                ) : (
                                    logs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50 text-sm">
                                            <td className="p-4 text-gray-900 font-medium">
                                                {new Date(log.timestamp).toLocaleDateString()} <span className="text-gray-400">|</span> {new Date(log.timestamp).toLocaleTimeString()}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${log.log_type === 'check_in' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                                    }`}>
                                                    {log.log_type === 'check_in' ? t('check_in') : t('check_out')}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${log.status === 'late'
                                                        ? 'bg-red-100 text-red-700'
                                                        : log.status === 'early_departure'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : log.status === 'overtime'
                                                                ? 'bg-purple-100 text-purple-700'
                                                                : 'bg-green-100 text-green-700'
                                                    }`}>
                                                    {t(log.status) || log.status?.toUpperCase() || t('on_time')}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-500">
                                                {log.fine_amount > 0 && <span className="text-red-500 text-xs block">- {t('fines')}: {log.fine_amount.toLocaleString()}</span>}
                                                {log.bonus_amount > 0 && <span className="text-green-500 text-xs block">+ {t('bonuses')}: {log.bonus_amount.toLocaleString()}</span>}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
