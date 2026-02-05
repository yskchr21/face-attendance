"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

interface Employee {
    id: string;
    name: string;
}

interface DailyStatus {
    employee: Employee;
    check_in?: { time: string; status: string };
    break_out?: { time: string; status: string };
    break_in?: { time: string; status: string };
    check_out?: { time: string; status: string };
}

export default function AdminDashboard() {
    const { role, logout } = useAuth();
    const router = useRouter();
    const { t } = useLanguage();
    const [stats, setStats] = useState({ totalEmployees: 0, todayAttendance: 0, lateCount: 0 });
    const [dailyStatus, setDailyStatus] = useState<DailyStatus[]>([]);

    useEffect(() => {
        fetchStats();
        fetchDailyAttendance();
    }, []);

    const fetchStats = async () => {
        const { count: employeeCount } = await supabase.from('employees').select('*', { count: 'exact', head: true });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: checkInLogs } = await supabase
            .from('attendance_logs')
            .select('employee_id')
            .eq('log_type', 'check_in')
            .gte('timestamp', today.toISOString());

        const uniqueEmployees = new Set(checkInLogs?.map(l => l.employee_id) || []);

        const { count: lateCount } = await supabase
            .from('attendance_logs')
            .select('*', { count: 'exact', head: true })
            .gte('timestamp', today.toISOString())
            .eq('status', 'late')
            .eq('log_type', 'check_in');

        setStats({
            totalEmployees: employeeCount || 0,
            todayAttendance: uniqueEmployees.size,
            lateCount: lateCount || 0
        });
    };

    const fetchDailyAttendance = async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { data: employees } = await supabase.from('employees').select('id, name').eq('is_active', true).order('name');
        if (!employees) return;

        const { data: logs } = await supabase
            .from('attendance_logs')
            .select('employee_id, log_type, status, timestamp')
            .gte('timestamp', today.toISOString())
            .lt('timestamp', tomorrow.toISOString());

        const logMap = new Map<string, DailyStatus>();
        employees.forEach(emp => {
            logMap.set(emp.id, { employee: emp });
        });

        logs?.forEach(log => {
            const status = logMap.get(log.employee_id);
            if (!status) return;
            const time = new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            if (log.log_type === 'check_in') status.check_in = { time, status: log.status };
            if (log.log_type === 'break_out') status.break_out = { time, status: log.status };
            if (log.log_type === 'break_in') status.break_in = { time, status: log.status };
            if (log.log_type === 'check_out') status.check_out = { time, status: log.status };
        });

        setDailyStatus(Array.from(logMap.values()));
    };

    const getStatusBadge = (log?: { time: string; status: string }) => {
        if (!log) return <span className="text-gray-300">-</span>;
        const color = log.status === 'late' ? 'bg-red-100 text-red-800' : log.status === 'early_departure' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
        return <span className={`px-2 py-1 rounded text-xs font-bold ${color}`}>{log.time}</span>;
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">{t('dashboard')}</h1>
                    <div className="space-x-4">
                        {role === 'superadmin' && (
                            <>
                                <button
                                    onClick={() => router.push('/admin/finance')}
                                    className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700 font-bold border-2 border-white shadow-md"
                                >
                                    💰 {t('finance_dashboard')}
                                </button>
                                <button
                                    onClick={() => router.push('/admin/reports')}
                                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                                >
                                    {t('payroll_report')}
                                </button>
                            </>
                        )}
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

                {/* Daily Attendance Table */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-800">📋 Status Absensi Hari Ini</h2>
                        <span className="text-sm text-gray-500">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-black text-sm uppercase tracking-wider">
                                    <th className="p-4 border-b">Karyawan</th>
                                    <th className="p-4 border-b text-center">Check In</th>
                                    <th className="p-4 border-b text-center">Break Out</th>
                                    <th className="p-4 border-b text-center">Break In</th>
                                    <th className="p-4 border-b text-center">Check Out</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {dailyStatus.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-4 text-center text-gray-500">Tidak ada karyawan aktif</td>
                                    </tr>
                                ) : (
                                    dailyStatus.map((s) => (
                                        <tr key={s.employee.id} className="hover:bg-gray-50">
                                            <td className="p-4 font-medium text-gray-800">{s.employee.name}</td>
                                            <td className="p-4 text-center">{getStatusBadge(s.check_in)}</td>
                                            <td className="p-4 text-center">{getStatusBadge(s.break_out)}</td>
                                            <td className="p-4 text-center">{getStatusBadge(s.break_in)}</td>
                                            <td className="p-4 text-center">{getStatusBadge(s.check_out)}</td>
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
