"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams, useSearchParams } from 'next/navigation';

interface Log {
    id: string;
    timestamp: string;
    log_type: string;
    status: string;
    fine_amount: number;
    bonus_amount: number;
}

interface Employee {
    id: string;
    name: string;
    base_wage: number;
    wage_type: string;
}

export default function EmployeeReportDetail() {
    const { role } = useAuth();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();

    // Get ID from URL params and Month from search query
    const employeeId = params?.id as string;
    const selectedMonth = searchParams?.get('month') || new Date().toISOString().slice(0, 7);

    const [employee, setEmployee] = useState<Employee | null>(null);
    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (role !== 'admin') {
            // router.push('/'); 
        }
    }, [role, router]);

    useEffect(() => {
        if (employeeId) fetchDetails();
    }, [employeeId, selectedMonth]);

    const fetchDetails = async () => {
        setLoading(true);

        // Fetch Employee Info
        const { data: empData } = await supabase
            .from('employees')
            .select('*')
            .eq('id', employeeId)
            .single();

        if (empData) setEmployee(empData);

        // Fetch Logs for Month
        const year = parseInt(selectedMonth.split('-')[0]);
        const month = parseInt(selectedMonth.split('-')[1]);
        const startDate = new Date(year, month - 1, 1).toISOString();
        const endDate = new Date(year, month, 0).toISOString();

        const { data: logData } = await supabase
            .from('attendance_logs')
            .select('*')
            .eq('employee_id', employeeId)
            .gte('timestamp', startDate)
            .lte('timestamp', endDate)
            .order('timestamp', { ascending: true }); // Chronological order

        if (logData) setLogs(logData);
        setLoading(false);
    };

    // Calculations
    const totalFines = logs.reduce((sum, l) => sum + (l.fine_amount || 0), 0);
    const totalBonuses = logs.reduce((sum, l) => sum + (l.bonus_amount || 0), 0);
    const daysPresent = logs.filter(l => l.log_type === 'check_in').length;

    let salary = 0;
    if (employee) {
        if (employee.wage_type === 'monthly') {
            salary = (employee.base_wage || 0) + totalBonuses - totalFines;
        } else {
            salary = ((employee.base_wage || 0) * daysPresent) + totalBonuses - totalFines;
        }
    }

    const formattedMonth = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    if (loading) return <div className="p-8 text-black">Loading Details...</div>;
    if (!employee) return <div className="p-8 text-red-500">Employee not found.</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-5xl mx-auto">
                <button
                    onClick={() => router.back()}
                    className="mb-6 text-gray-500 hover:text-gray-800 flex items-center font-bold"
                >
                    &larr; Back to Payroll Report
                </button>

                <div className="bg-white rounded-lg shadow-md p-8 mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">{employee.name}</h1>
                            <p className="text-gray-500 mt-1">Payroll Detail for <span className="text-blue-600 font-bold">{formattedMonth}</span></p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500 uppercase font-bold">Total Salary</p>
                            <p className="text-4xl font-bold text-blue-600">Rp {salary.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mt-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Base Wage ({employee.wage_type})</p>
                            <p className="font-bold text-gray-800">Rp {employee.base_wage.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Days Present</p>
                            <p className="font-bold text-gray-800">{daysPresent} Days</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Total Bonuses</p>
                            <p className="font-bold text-green-600">+ Rp {totalBonuses.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Total Fines</p>
                            <p className="font-bold text-red-600">- Rp {totalFines.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                        <h3 className="font-bold text-gray-700">Daily Logs ({formattedMonth})</h3>
                    </div>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                                <th className="p-4">Date & Time</th>
                                <th className="p-4">Event</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-green-600">Bonus</th>
                                <th className="p-4 text-red-600">Fine</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {logs.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-400">No logs found for this month.</td></tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50 text-sm">
                                        <td className="p-4 text-black font-medium">
                                            {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
                                        </td>
                                        <td className="p-4 capitalize text-black">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${log.log_type === 'check_in' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                {log.log_type.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4 capitalize">
                                            {log.log_type === 'check_in' && (
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${log.status === 'late' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                                    }`}>
                                                    {log.status}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-green-600">{log.bonus_amount > 0 ? `+ ${log.bonus_amount.toLocaleString()}` : '-'}</td>
                                        <td className="p-4 text-red-600">{log.fine_amount > 0 ? `- ${log.fine_amount.toLocaleString()}` : '-'}</td>
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
