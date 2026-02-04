"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportRow {
    employeeId: string;
    name: string;
    wageType: string;
    baseWage: number;
    daysPresent: number;
    lateCount: number;
    totalFines: number;
    totalBonuses: number;
    estimatedSalary: number;
}

export default function MonthlyReportPage() {
    const { role } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState<ReportRow[]>([]);

    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    useEffect(() => {
        if (role !== 'admin') {
            // router.push('/'); 
        }
    }, [role, router]);

    useEffect(() => {
        fetchReport();
    }, [selectedMonth]);

    const fetchReport = async () => {
        setLoading(true);

        // 1. Get all employees
        const { data: employees } = await supabase.from('employees').select('*');
        if (!employees) return;

        // 2. Get range for selected month
        const year = parseInt(selectedMonth.split('-')[0]);
        const month = parseInt(selectedMonth.split('-')[1]);
        const startDate = new Date(year, month - 1, 1).toISOString();
        const endDate = new Date(year, month, 0).toISOString(); // Last day of month

        // 3. Get all logs for this month
        const { data: logs } = await supabase
            .from('attendance_logs')
            .select('*')
            .gte('timestamp', startDate)
            .lte('timestamp', endDate);

        // 4. Calculate Data
        const report: ReportRow[] = employees.map(emp => {
            const empLogs = logs?.filter(log => log.employee_id === emp.id) || [];

            // Count unique days present (check_in count is good approx)
            const checkIns = empLogs.filter(l => l.log_type === 'check_in');
            const daysPresent = checkIns.length;

            const lateCount = empLogs.filter(l => l.status === 'late').length;

            // Sum Fines and Bonuses
            const totalFines = empLogs.reduce((sum, l) => sum + (l.fine_amount || 0), 0);
            const totalBonuses = empLogs.reduce((sum, l) => sum + (l.bonus_amount || 0), 0);

            // Calculate Salary
            let salary = 0;
            if (emp.wage_type === 'monthly') {
                salary = (emp.base_wage || 0) + totalBonuses - totalFines;
            } else {
                // Daily
                salary = ((emp.base_wage || 0) * daysPresent) + totalBonuses - totalFines;
            }

            return {
                employeeId: emp.id,
                name: emp.name,
                wageType: emp.wage_type || 'monthly',
                baseWage: emp.base_wage || 0,
                daysPresent,
                lateCount,
                totalFines,
                totalBonuses,
                estimatedSalary: salary
            };
        });

        setReportData(report);
        setLoading(false);
    };

    const downloadPDF = () => {
        const doc = new jsPDF();

        // Month Formatting
        const date = new Date(selectedMonth + '-01');
        const formattedMonth = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        doc.setFontSize(18);
        doc.text(`Payroll Report: ${formattedMonth}`, 14, 22);

        const tableData = reportData.map(row => [
            row.name,
            row.wageType.toUpperCase(),
            `Rp ${row.baseWage.toLocaleString()}`,
            row.daysPresent,
            row.lateCount,
            `Rp ${row.totalFines.toLocaleString()}`,
            `Rp ${row.totalBonuses.toLocaleString()}`,
            `Rp ${row.estimatedSalary.toLocaleString()}`
        ]);

        autoTable(doc, {
            head: [['Employee', 'Type', 'Base', 'Days', 'Late', 'Fines', 'Bonus', 'Total Pay']],
            body: tableData,
            startY: 30,
        });

        doc.save(`payroll_report_${selectedMonth}.pdf`);
    };

    const formattedMonthHeader = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => router.push('/admin/dashboard')} className="text-gray-500 hover:text-gray-800">&larr; Dashboard</button>
                        <h1 className="text-3xl font-bold text-gray-800">
                            Payroll Report: <span className="text-blue-600">{formattedMonthHeader}</span>
                        </h1>
                    </div>

                    <div className="flex space-x-4">
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="p-2 border rounded shadow-sm bg-white text-black"
                        />
                        <button
                            onClick={downloadPDF}
                            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 shadow-md flex items-center"
                        >
                            📄 Export PDF
                        </button>
                    </div>
                </header>

                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-black text-xs uppercase tracking-wider">
                                    <th className="p-4 border-b">Employee</th>
                                    <th className="p-4 border-b">Wage Type</th>
                                    <th className="p-4 border-b">Base Wage</th>
                                    <th className="p-4 border-b">Days Present</th>
                                    <th className="p-4 border-b">Lates</th>
                                    <th className="p-4 border-b text-red-600">Fines</th>
                                    <th className="p-4 border-b text-green-600">Bonuses</th>
                                    <th className="p-4 border-b font-bold bg-blue-50 text-blue-900">Est. Take Home</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {loading ? (
                                    <tr><td colSpan={8} className="p-8 text-center text-black">Loading Data...</td></tr>
                                ) : reportData.length === 0 ? (
                                    <tr><td colSpan={8} className="p-8 text-center text-gray-500">No data found for this month.</td></tr>
                                ) : (
                                    reportData.map((row) => (
                                        <tr key={row.employeeId} className="hover:bg-gray-50 text-sm">
                                            <td className="p-4 font-bold text-gray-900">
                                                <Link
                                                    href={`/admin/reports/${row.employeeId}?month=${selectedMonth}`}
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {row.name}
                                                </Link>
                                            </td>
                                            <td className="p-4 capitalize text-black">{row.wageType}</td>
                                            <td className="p-4 text-black">Rp {row.baseWage.toLocaleString()}</td>
                                            <td className="p-4 font-medium text-black">{row.daysPresent} Days</td>
                                            <td className="p-4 text-orange-600 font-medium">{row.lateCount}</td>
                                            <td className="p-4 text-red-600">Rp {row.totalFines.toLocaleString()}</td>
                                            <td className="p-4 text-green-600">Rp {row.totalBonuses.toLocaleString()}</td>
                                            <td className="p-4 font-bold text-blue-900 bg-blue-50">Rp {row.estimatedSalary.toLocaleString()}</td>
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
