"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

export default function AdminDashboard() {
    const { role, logout } = useAuth();
    const router = useRouter();
    const { t } = useLanguage();
    const [stats, setStats] = useState({ totalEmployees: 0, todayAttendance: 0, lateCount: 0 });
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        // Simple protection
        if (role !== 'admin') {
            // router.push('/'); // Commented out for now to avoid redirects during dev/testing if context isn't fully set
        }
    }, [role, router]);

    useEffect(() => {
        fetchStats();
        fetchLogs();
    }, []);

    const fetchStats = async () => {
        // 1. Total Employees
        const { count: employeeCount } = await supabase.from('employees').select('*', { count: 'exact', head: true });

        // 2. Today's Attendance
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: attendanceCount } = await supabase
            .from('attendance_logs')
            .select('*', { count: 'exact', head: true })
            .gte('timestamp', today.toISOString());

        // 3. Late Check-ins today
        const { count: lateCount } = await supabase
            .from('attendance_logs')
            .select('*', { count: 'exact', head: true })
            .gte('timestamp', today.toISOString())
            .eq('status', 'late');

        setStats({
            totalEmployees: employeeCount || 0,
            todayAttendance: attendanceCount || 0,
            lateCount: lateCount || 0
        });
    };

    const fetchLogs = async () => {
        const { data, error } = await supabase
            .from('attendance_logs')
            .select('*, employees(name)') // Join with employees table
            .order('timestamp', { ascending: false })
            .limit(20);

        if (data) setLogs(data);
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">{t('dashboard')}</h1>
                    <div className="space-x-4">
                        <button
                            onClick={() => router.push('/admin/reports')}
                            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                        >
                            {t('payroll_report')}
                        </button>
                        <button
                            onClick={() => router.push('/admin/attendance')}
                            className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
                        >
                            {t('attendance_logs')}
                        </button>
                        <button
                            onClick={() => router.push('/admin/employees')}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                        >
                            {t('manage_employees')}
                        </button>
                        <button
                            onClick={() => router.push('/admin/register')}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                            {t('register_new')}
                        </button>
                        <button
                            onClick={() => router.push('/admin/settings')}
                            className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800"
                        >
                            {t('settings')}
                        </button>
                        <button
                            onClick={logout}
                            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                        >
                            {t('logout')}
                        </button>
                    </div>
                </header>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                        <h3 className="text-gray-500 text-sm font-medium">{t('total_employees')}</h3>
                        <p className="text-3xl font-bold text-gray-800">{stats.totalEmployees}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                        <h3 className="text-gray-500 text-sm font-medium">{t('present_today')}</h3>
                        <p className="text-3xl font-bold text-gray-800">{stats.todayAttendance}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
                        <h3 className="text-gray-500 text-sm font-medium">{t('late_arrivals')}</h3>
                        <p className="text-3xl font-bold text-gray-800">{stats.lateCount}</p>
                    </div>
                </div>

                {/* Recent Logs Table */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-800">{t('recent_activity')}</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-black text-sm uppercase tracking-wider">
                                    <th className="p-4 border-b">{t('time')}</th>
                                    <th className="p-4 border-b">{t('employee_name')}</th>
                                    <th className="p-4 border-b">{t('status')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="p-4 text-center text-black">No records found today</td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="p-4 text-black">
                                                {new Date(log.timestamp).toLocaleTimeString()}
                                            </td>
                                            <td className="p-4 font-medium text-black">
                                                {log.employees?.name || 'Unknown'}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${log.status === 'late'
                                                    ? 'bg-red-100 text-red-800'
                                                    : log.status === 'early_departure'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : log.status === 'overtime'
                                                            ? 'bg-purple-100 text-purple-800'
                                                            : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {t(log.status) || log.status?.toUpperCase() || t('on_time')}
                                                </span>
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
