"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function AttendanceLogsPage() {
    const { role } = useAuth();
    const router = useRouter();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit Modal State
    const [editingLog, setEditingLog] = useState<any | null>(null);
    const [fine, setFine] = useState(0);
    const [bonus, setBonus] = useState(0);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (role !== 'admin') {
            // router.push('/'); 
        }
    }, [role, router]);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        const { data } = await supabase
            .from('attendance_logs')
            .select('*, employees(name)')
            .order('timestamp', { ascending: false })
            .limit(50); // Show last 50 logs for now

        if (data) setLogs(data);
        setLoading(false);
    };

    const openEdit = (log: any) => {
        setEditingLog(log);
        setFine(log.fine_amount || 0);
        setBonus(log.bonus_amount || 0);
        setNotes(log.admin_notes || '');
    };

    const saveEdit = async () => {
        if (!editingLog) return;

        const { error } = await supabase
            .from('attendance_logs')
            .update({
                fine_amount: fine,
                bonus_amount: bonus,
                admin_notes: notes
            })
            .eq('id', editingLog.id);

        if (!error) {
            setEditingLog(null);
            fetchLogs();
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => router.push('/admin/dashboard')} className="text-gray-500 hover:text-gray-800">&larr; Dashboard</button>
                        <h1 className="text-3xl font-bold text-gray-800">Manage Attendance Logs</h1>
                    </div>
                </header>

                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-black text-sm uppercase tracking-wider">
                                <th className="p-4 border-b">Time</th>
                                <th className="p-4 border-b">Employee</th>
                                <th className="p-4 border-b">Type</th>
                                <th className="p-4 border-b">Status</th>
                                <th className="p-4 border-b text-red-600">Fine</th>
                                <th className="p-4 border-b text-green-600">Bonus</th>
                                <th className="p-4 border-b">Notes</th>
                                <th className="p-4 border-b text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50 text-sm">
                                    <td className="p-4 text-black">{new Date(log.timestamp).toLocaleString()}</td>
                                    <td className="p-4 font-bold text-gray-900">{log.employees?.name}</td>
                                    <td className="p-4 capitalize">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${log.log_type === 'check_in' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                            {log.log_type?.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${log.status === 'late'
                                                ? 'bg-red-100 text-red-800'
                                                : log.status === 'early_departure'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : log.status === 'overtime'
                                                        ? 'bg-purple-100 text-purple-800'
                                                        : 'bg-green-100 text-green-800'
                                            }`}>
                                            {log.status?.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-4 text-red-600">{log.fine_amount > 0 ? `Rp ${log.fine_amount.toLocaleString()}` : '-'}</td>
                                    <td className="p-4 text-green-600">{log.bonus_amount > 0 ? `Rp ${log.bonus_amount.toLocaleString()}` : '-'}</td>
                                    <td className="p-4 text-gray-500 italic max-w-xs truncate">{log.admin_notes}</td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => openEdit(log)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* EDIT MODAL */}
            {editingLog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in-up">
                        <h3 className="text-xl font-bold mb-4">Edit Log: {editingLog.employees?.name}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Fine Amount (Rp)</label>
                                <input
                                    type="number"
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-red-500 outline-none"
                                    value={fine}
                                    onChange={(e) => setFine(Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Bonus Amount (Rp)</label>
                                <input
                                    type="number"
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none"
                                    value={bonus}
                                    onChange={(e) => setBonus(Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Admin Notes</label>
                                <textarea
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    rows={3}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Reason for fine/bonus..."
                                />
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button onClick={() => setEditingLog(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                <button onClick={saveEdit} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded font-bold">Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
