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
    overtimeHours: number;
    overtimePay: number;
    estimatedSalary: number;
}

export default function MonthlyReportPage() {
    const { role } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState<ReportRow[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    useEffect(() => {
        // if (role !== 'admin') { router.push('/'); }
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
        const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

        // 3. Get all logs for this month
        const { data: logs } = await supabase
            .from('attendance_logs')
            .select('*')
            .gte('timestamp', startDate)
            .lte('timestamp', endDate)
            .order('timestamp', { ascending: true });

        // Helper to parse time string "HH:MM:SS" to minutes from midnight
        const parseTimeToMinutes = (timeStr: string) => {
            if (!timeStr) return 0;
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        };

        // 4. Calculate Data
        const report: ReportRow[] = employees.map(emp => {
            const empLogs = logs?.filter(log => log.employee_id === emp.id) || [];

            // Group logs by Date (YYYY-MM-DD)
            const logsByDate: { [key: string]: any[] } = {};
            empLogs.forEach(log => {
                const dateKey = new Date(log.timestamp).toLocaleDateString('en-CA'); // YYYY-MM-DD
                if (!logsByDate[dateKey]) logsByDate[dateKey] = [];
                logsByDate[dateKey].push(log);
            });

            let daysPresent = 0;
            let totalOvertimeHours = 0;
            let totalOvertimePay = 0;
            let lateCount = 0;
            let totalFines = 0;
            let totalBonuses = 0;

            // Iterate through each worked day
            Object.keys(logsByDate).forEach(date => {
                const dayLogs = logsByDate[date];

                // Identify key events
                const checkIn = dayLogs.find(l => l.log_type === 'check_in');
                const checkOut = dayLogs.find(l => l.log_type === 'check_out');
                const breakIn = dayLogs.find(l => l.log_type === 'break_in');
                const breakOut = dayLogs.find(l => l.log_type === 'break_out');

                if (checkIn) {
                    daysPresent++;
                    if (checkIn.status === 'late') lateCount++;
                    totalFines += (checkIn.fine_amount || 0);
                    // Check fines/bonuses on other logs if any (rare but possible)
                }

                totalBonuses += dayLogs.reduce((sum, l) => sum + (l.bonus_amount || 0), 0);

                // Calculate Net Work Minutes
                if (checkIn && checkOut) {
                    const checkInTime = new Date(checkIn.timestamp).getTime();
                    const checkOutTime = new Date(checkOut.timestamp).getTime();
                    let workDurationMs = checkOutTime - checkInTime;

                    if (breakIn && breakOut) {
                        const breakInTime = new Date(breakIn.timestamp).getTime();
                        const breakOutTime = new Date(breakOut.timestamp).getTime();
                        const breakDurationMs = breakOutTime - breakInTime;
                        workDurationMs -= breakDurationMs;
                    }

                    const netWorkMinutes = workDurationMs / (1000 * 60);

                    // Calculate Scheduled Duration
                    const startMins = parseTimeToMinutes(emp.work_start_time);
                    const endMins = parseTimeToMinutes(emp.work_end_time);
                    // Handle shift crossing midnight if needed (simple assumption: same day)
                    let scheduledMinutes = endMins - startMins;
                    if (scheduledMinutes < 0) scheduledMinutes += 24 * 60; // Handle overnight shift simply

                    // Overtime Calculation
                    if (netWorkMinutes > scheduledMinutes) {
                        const otMinutes = netWorkMinutes - scheduledMinutes;
                        const otHours = otMinutes / 60;
                        totalOvertimeHours += otHours;
                        totalOvertimePay += otHours * (emp.overtime_hourly_rate || 0);
                    }
                }
            });

            // Calculate Base Salary
            let baseSalary = 0;
            if (emp.wage_type === 'monthly') {
                baseSalary = emp.base_wage || 0;
            } else {
                baseSalary = (emp.base_wage || 0) * daysPresent;
            }

            const estimatedSalary = baseSalary + totalBonuses + totalOvertimePay - totalFines;

            return {
                employeeId: emp.id,
                name: emp.name,
                wageType: emp.wage_type || 'monthly',
                baseWage: emp.base_wage || 0,
                daysPresent,
                lateCount,
                totalFines,
                totalBonuses,
                overtimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
                overtimePay: Math.round(totalOvertimePay),
                estimatedSalary: Math.round(estimatedSalary)
            };
        });

        setReportData(report);
        setLoading(false);
    };

    const downloadPDF = () => {
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for more columns

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
            `${row.overtimeHours} hrs`,
            `Rp ${row.overtimePay.toLocaleString()}`,
            `Rp ${row.totalFines.toLocaleString()}`,
            `Rp ${row.totalBonuses.toLocaleString()}`,
            `Rp ${row.estimatedSalary.toLocaleString()}`
        ]);

        autoTable(doc, {
            head: [['Employe', 'Type', 'Base', 'Days', 'Late', 'OT Hrs', 'OT Pay', 'Fines', 'Bonus', 'Total Pay']],
            body: tableData,
            startY: 30,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [22, 160, 133] }
        });

        doc.save(`payroll_report_${selectedMonth}.pdf`);
    };

    const formattedMonthHeader = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-[100rem] mx-auto">
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

                <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-max">
                        <thead>
                            <tr className="bg-teal-700 text-white text-xs uppercase tracking-wider">
                                <th className="p-4 border-b">Employee</th>
                                <th className="p-4 border-b">Wage Type</th>
                                <th className="p-4 border-b">Base Wage</th>
                                <th className="p-4 border-b">Days Worked</th>
                                <th className="p-4 border-b">OT Hours</th>
                                <th className="p-4 border-b">OT Pay</th>
                                <th className="p-4 border-b">Lates</th>
                                <th className="p-4 border-b text-red-100">Fines</th>
                                <th className="p-4 border-b text-green-100">Bonuses</th>
                                <th className="p-4 border-b font-bold bg-teal-800">Total Take Home</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={10} className="p-8 text-center text-black">Loading detailed payroll data...</td></tr>
                            ) : reportData.length === 0 ? (
                                <tr><td colSpan={10} className="p-8 text-center text-gray-500">No data found for this month.</td></tr>
                            ) : (
                                reportData.map((row) => (
                                    <tr key={row.employeeId} className="hover:bg-gray-50 text-sm font-medium">
                                        <td className="p-4 text-gray-900">{row.name}</td>
                                        <td className="p-4 capitalize text-gray-600">{row.wageType}</td>
                                        <td className="p-4 text-gray-600">Rp {row.baseWage.toLocaleString()}</td>
                                        <td className="p-4 text-gray-800">{row.daysPresent}</td>
                                        <td className="p-4 text-purple-600 font-bold">{row.overtimeHours} h</td>
                                        <td className="p-4 text-purple-600 font-bold">Rp {row.overtimePay.toLocaleString()}</td>
                                        <td className="p-4 text-orange-600">{row.lateCount}</td>
                                        <td className="p-4 text-red-600">Rp {row.totalFines.toLocaleString()}</td>
                                        <td className="p-4 text-green-600">Rp {row.totalBonuses.toLocaleString()}</td>
                                        <td className="p-4 font-bold text-white bg-teal-600">Rp {row.estimatedSalary.toLocaleString()}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
