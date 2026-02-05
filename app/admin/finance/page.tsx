"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';

export default function FinanceDashboard() {
    const { role } = useAuth();
    const router = useRouter();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalMonthlyPayroll: 0,
        totalOvertimeCost: 0,
        employeesWithOvertime: 0,
        avgDailyCost: 0
    });

    useEffect(() => {
        if (role && role !== 'superadmin') {
            router.push('/admin/dashboard');
        } else if (role === 'superadmin') {
            fetchFinanceStats();
        }
    }, [role, router]);

    const fetchFinanceStats = async () => {
        setLoading(true);
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

        // Fetch valid employees
        const { data: employees } = await supabase.from('employees').select('id, base_wage, wage_type, overtime_hourly_rate');

        // Fetch logs for this month to calc overtime roughly
        // This is a simplified estimation for the dashboard
        const { data: logs } = await supabase
            .from('attendance_logs')
            .select('*')
            .gte('timestamp', startOfMonth)
            .eq('log_type', 'check_out'); // We interpret check_out as end of a shift (simplified)

        let estimatedPayroll = 0;
        let overtimeCost = 0;

        if (employees) {
            // Base payroll (assuming full attendance for monthly, actual for daily)
            // For dashboard, we just show "Projected" monthly cost based on active employees
            employees.forEach(emp => {
                if (emp.wage_type === 'monthly') {
                    estimatedPayroll += emp.base_wage;
                } else {
                    // Daily: estimate 22 working days
                    estimatedPayroll += (emp.base_wage * 22);
                }
            });
        }

        // Overtime estimation from verified logs would be complex here without a backend function
        // For now, we set placeholder or calculated from recent logs if possible.
        // Let's just show 0 explicitly or calc if we have logs.

        setStats({
            totalMonthlyPayroll: estimatedPayroll,
            totalOvertimeCost: overtimeCost,
            employeesWithOvertime: 0,
            avgDailyCost: estimatedPayroll / 22 // rough estimate
        });
        setLoading(false);
    };

    if (loading) return <div className="p-8 text-center">Loading Finance Data...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-800">&larr; Back</button>
                        <h1 className="text-3xl font-bold text-teal-800">💰 Finance Dashboard</h1>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-gray-500 text-sm font-medium uppercase">Est. Monthly Payroll</h3>
                        <p className="text-2xl font-bold text-gray-800 mt-2">Rp {stats.totalMonthlyPayroll.toLocaleString()}</p>
                        <p className="text-xs text-green-600 mt-1">Base wages only</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-gray-500 text-sm font-medium uppercase">Overtime (MTD)</h3>
                        <p className="text-2xl font-bold text-gray-800 mt-2">Rp {stats.totalOvertimeCost.toLocaleString()}</p>
                        <p className="text-xs text-gray-400 mt-1">Month to Date</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Detailed Reports</h2>
                    <p className="text-gray-600 mb-6">Generate detailed payroll breakdowns including attendance counts and specific overtime calculations.</p>
                    <button
                        onClick={() => router.push('/admin/reports')}
                        className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 font-bold shadow-lg transform transition hover:scale-105"
                    >
                        Go to Restricted Payroll Reports
                    </button>
                </div>
            </div>
        </div>
    );
}
