"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface Employee {
    id: string;
    name: string;
}

interface EmployeeSummary {
    id: string;
    name: string;
    daysPresent: number;
    lateCount: number;
    onTimeCount: number;
}

interface DayLog {
    date: string;
    check_in?: { time: string; status: string; photo_url?: string };
    break_out?: { time: string; status: string; photo_url?: string };
    break_in?: { time: string; status: string; photo_url?: string };
    check_out?: { time: string; status: string; photo_url?: string };
}

export default function AttendanceLogsPage() {
    const { role } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [summaries, setSummaries] = useState<EmployeeSummary[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [employeeLogs, setEmployeeLogs] = useState<DayLog[]>([]);
    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

    // Period Filter
    const [filterType, setFilterType] = useState<'month' | 'custom'>('month');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => { fetchSummaries(); }, [selectedMonth, startDate, endDate, filterType]);

    const getDateRange = () => {
        if (filterType === 'month') {
            const [year, month] = selectedMonth.split('-').map(Number);
            const start = new Date(year, month - 1, 1);
            const end = new Date(year, month, 0, 23, 59, 59);
            return { start: start.toISOString(), end: end.toISOString() };
        } else {
            if (!startDate || !endDate) return null;
            return { start: new Date(startDate).toISOString(), end: new Date(endDate + 'T23:59:59').toISOString() };
        }
    };

    const fetchSummaries = async () => {
        setLoading(true);
        const range = getDateRange();
        if (!range) { setLoading(false); return; }

        const { data: employees } = await supabase.from('employees').select('id, name').eq('is_active', true);
        if (!employees) { setLoading(false); return; }

        const { data: logs } = await supabase.from('attendance_logs')
            .select('employee_id, log_type, status, timestamp')
            .gte('timestamp', range.start)
            .lte('timestamp', range.end);

        const summaryMap = new Map<string, EmployeeSummary>();

        employees.forEach(emp => {
            summaryMap.set(emp.id, { id: emp.id, name: emp.name, daysPresent: 0, lateCount: 0, onTimeCount: 0 });
        });

        // Group logs by employee and date
        const empDays = new Map<string, Set<string>>();
        logs?.forEach(log => {
            const key = log.employee_id;
            const day = log.timestamp.slice(0, 10);
            if (!empDays.has(key)) empDays.set(key, new Set());

            if (log.log_type === 'check_in') {
                empDays.get(key)!.add(day);
                const s = summaryMap.get(key);
                if (s) {
                    if (log.status === 'late') s.lateCount++;
                    else s.onTimeCount++;
                }
            }
        });

        empDays.forEach((days, empId) => {
            const s = summaryMap.get(empId);
            if (s) s.daysPresent = days.size;
        });

        setSummaries(Array.from(summaryMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
        setLoading(false);
    };

    const viewEmployeeLogs = async (emp: Employee) => {
        setSelectedEmployee(emp);
        const range = getDateRange();
        if (!range) return;

        const { data: logs } = await supabase.from('attendance_logs')
            .select('log_type, status, timestamp, photo_url')
            .eq('employee_id', emp.id)
            .gte('timestamp', range.start)
            .lte('timestamp', range.end)
            .order('timestamp', { ascending: true });

        // Group by day - use local date
        const dayMap = new Map<string, DayLog>();
        logs?.forEach(log => {
            const logDate = new Date(log.timestamp);
            const day = logDate.toLocaleDateString('sv-SE'); // YYYY-MM-DD format in local time
            if (!dayMap.has(day)) dayMap.set(day, { date: day });
            const d = dayMap.get(day)!;
            const time = logDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            const logType = log.log_type?.trim();
            if (logType === 'check_in') d.check_in = { time, status: log.status, photo_url: log.photo_url };
            else if (logType === 'break_out') d.break_out = { time, status: log.status, photo_url: log.photo_url };
            else if (logType === 'break_in') d.break_in = { time, status: log.status, photo_url: log.photo_url };
            else if (logType === 'check_out') d.check_out = { time, status: log.status, photo_url: log.photo_url };
        });

        setEmployeeLogs(Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date)));
    };

    const getStatusBadge = (log?: { time: string; status: string; photo_url?: string }) => {
        if (!log) return <span className="text-gray-400">-</span>;

        // Determine color based on status
        let color = 'bg-green-100 text-green-800'; // default: on_time
        if (log.status === 'late') color = 'bg-red-100 text-red-800';
        else if (log.status === 'early_departure') color = 'bg-yellow-100 text-yellow-800';
        else if (log.status === 'break') color = 'bg-blue-100 text-blue-800';
        else if (log.status === 'overtime') color = 'bg-purple-100 text-purple-800';

        if (log.photo_url) {
            return (
                <button onClick={() => setPreviewPhoto(log.photo_url!)} className={`px-2 py-1 rounded text-xs font-bold ${color} hover:ring-2 ring-blue-500 flex items-center gap-1 mx-auto`}>
                    📷 {log.time}
                </button>
            );
        }
        return <span className={`px-2 py-1 rounded text-xs font-bold ${color}`}>{log.time}</span>;
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => router.push('/admin/dashboard')} className="text-gray-500 hover:text-gray-800">&larr; Dashboard</button>
                        <h1 className="text-3xl font-bold text-gray-800">Attendance Reports</h1>
                    </div>
                </header>

                {/* PERIOD FILTER */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center space-x-2">
                            <label className="font-bold text-gray-700">Filter:</label>
                            <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="border rounded p-2 text-black">
                                <option value="month">Per Bulan</option>
                                <option value="custom">Custom Periode</option>
                            </select>
                        </div>
                        {filterType === 'month' ? (
                            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="border rounded p-2 text-black" />
                        ) : (
                            <>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded p-2 text-black" />
                                <span className="text-gray-500">sampai</span>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded p-2 text-black" />
                            </>
                        )}
                    </div>
                </div>

                {/* SUMMARY TABLE */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="p-4 border-b bg-gray-50">
                        <h2 className="font-bold text-gray-800">Ringkasan per Karyawan</h2>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-black text-sm uppercase tracking-wider">
                                <th className="p-4 border-b">Nama Karyawan</th>
                                <th className="p-4 border-b text-center">Hari Hadir</th>
                                <th className="p-4 border-b text-center text-green-600">On Time</th>
                                <th className="p-4 border-b text-center text-red-600">Terlambat</th>
                                <th className="p-4 border-b text-right">Detail</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={5} className="p-4 text-center text-gray-500">Loading...</td></tr>
                            ) : summaries.length === 0 ? (
                                <tr><td colSpan={5} className="p-4 text-center text-gray-500">Tidak ada data</td></tr>
                            ) : (
                                summaries.map(s => (
                                    <tr key={s.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-bold text-gray-900">{s.name}</td>
                                        <td className="p-4 text-center">{s.daysPresent}</td>
                                        <td className="p-4 text-center text-green-600 font-bold">{s.onTimeCount}</td>
                                        <td className="p-4 text-center text-red-600 font-bold">{s.lateCount}</td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => viewEmployeeLogs({ id: s.id, name: s.name })} className="text-blue-600 hover:underline font-medium">
                                                Lihat Detail →
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* EMPLOYEE DETAIL MODAL */}
            {selectedEmployee && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">📋 Detail Absensi: {selectedEmployee.name}</h3>
                            <button onClick={() => setSelectedEmployee(null)} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                        </div>
                        <div className="overflow-auto max-h-[60vh]">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-gray-100">
                                    <tr className="text-black text-sm uppercase">
                                        <th className="p-3 border-b">Tanggal</th>
                                        <th className="p-3 border-b text-center">Check In</th>
                                        <th className="p-3 border-b text-center">Break Out</th>
                                        <th className="p-3 border-b text-center">Break In</th>
                                        <th className="p-3 border-b text-center">Check Out</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {employeeLogs.length === 0 ? (
                                        <tr><td colSpan={5} className="p-4 text-center text-gray-500">Tidak ada data</td></tr>
                                    ) : (
                                        employeeLogs.map(d => (
                                            <tr key={d.date} className="hover:bg-gray-50">
                                                <td className="p-3 font-medium text-gray-800">{new Date(d.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                                                <td className="p-3 text-center">{getStatusBadge(d.check_in)}</td>
                                                <td className="p-3 text-center">{getStatusBadge(d.break_out)}</td>
                                                <td className="p-3 text-center">{getStatusBadge(d.break_in)}</td>
                                                <td className="p-3 text-center">{getStatusBadge(d.check_out)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t bg-gray-50 text-right">
                            <button onClick={() => setSelectedEmployee(null)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded font-bold">Tutup</button>
                        </div>
                    </div>
                </div>
            )}

            {/* PHOTO PREVIEW MODAL */}
            {previewPhoto && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4" onClick={() => setPreviewPhoto(null)}>
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800">📸 Foto Absensi</h3>
                            <button onClick={() => setPreviewPhoto(null)} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                        </div>
                        <img src={previewPhoto} alt="Attendance Photo" className="w-full rounded-lg" />
                    </div>
                </div>
            )}
        </div>
    );
}
