"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface Employee {
    id: string;
    name: string;
    whatsapp_number: string;
    work_start_time: string;
    work_end_time: string;
    pin: string;
    is_active: boolean;
    wage_type: string;
    base_wage: number;
}

export default function EmployeeManagement() {
    const { role } = useAuth();
    const router = useRouter();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Edit State
    const [editName, setEditName] = useState('');
    const [editWhatsapp, setEditWhatsapp] = useState('');
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndTime, setEditEndTime] = useState('');
    const [editPin, setEditPin] = useState('');

    const [editWageType, setEditWageType] = useState('monthly');
    const [editBaseWage, setEditBaseWage] = useState(0);

    useEffect(() => {
        if (role !== 'admin') {
            // router.push('/'); 
        }
    }, [role, router]);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        const { data } = await supabase
            .from('employees')
            .select('*')
            .order('is_active', { ascending: false }) // Active first
            .order('name', { ascending: true });

        if (data) setEmployees(data);
        setLoading(false);
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('employees')
            .update({ is_active: !currentStatus })
            .eq('id', id);

        if (!error) fetchEmployees();
    };

    const startEdit = (emp: Employee) => {
        setEditingId(emp.id);
        setEditName(emp.name);
        setEditWhatsapp(emp.whatsapp_number || '');
        setEditStartTime(emp.work_start_time || '09:00:00');
        setEditEndTime(emp.work_end_time || '18:00:00');
        setEditPin(emp.pin || '123456');
        setEditWageType(emp.wage_type || 'monthly');
        setEditBaseWage(emp.base_wage || 0);
    };

    const saveEdit = async () => {
        if (!editingId) return;

        const { error } = await supabase
            .from('employees')
            .update({
                name: editName,
                whatsapp_number: editWhatsapp,
                work_start_time: editStartTime,
                work_end_time: editEndTime,
                pin: editPin,
                wage_type: editWageType,
                base_wage: editBaseWage
            })
            .eq('id', editingId);

        if (!error) {
            setEditingId(null);
            fetchEmployees();
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-[95rem] mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-800">&larr; Back</button>
                        <h1 className="text-3xl font-bold text-gray-800">Employee Management</h1>
                    </div>
                    <button
                        onClick={() => router.push('/admin/register')}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        + Register New
                    </button>
                </header>

                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-black text-sm uppercase tracking-wider">
                                <th className="p-4 border-b">Status</th>
                                <th className="p-4 border-b">Name & Contact</th>
                                <th className="p-4 border-b">Schedule (Start - End)</th>
                                <th className="p-4 border-b">PIN</th>
                                <th className="p-4 border-b">Wage Info</th>
                                <th className="p-4 border-b text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {employees.map((emp) => (
                                <tr key={emp.id} className={`hover:bg-gray-50 ${!emp.is_active ? 'opacity-50 bg-gray-50' : ''}`}>
                                    <td className="p-4">
                                        <button
                                            onClick={() => handleToggleActive(emp.id, emp.is_active)}
                                            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${emp.is_active
                                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                                                }`}
                                        >
                                            {emp.is_active ? 'ACTIVE' : 'INACTIVE'}
                                        </button>
                                    </td>
                                    <td className="p-4">
                                        {editingId === emp.id ? (
                                            <div className="space-y-2">
                                                <input
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="border p-2 rounded w-full text-black placeholder:text-gray-400"
                                                    placeholder="Name"
                                                />
                                                <input
                                                    value={editWhatsapp}
                                                    onChange={(e) => setEditWhatsapp(e.target.value)}
                                                    className="border p-2 rounded w-full text-black placeholder:text-gray-400"
                                                    placeholder="WhatsApp (62...)"
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="font-medium text-gray-900">{emp.name}</div>
                                                {emp.whatsapp_number && (
                                                    <a
                                                        href={`https://wa.me/${emp.whatsapp_number}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-green-600 text-xs flex items-center hover:underline mt-1"
                                                    >
                                                        <span>📱 Chat ({emp.whatsapp_number})</span>
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {editingId === emp.id ? (
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="time"
                                                    value={editStartTime}
                                                    onChange={(e) => setEditStartTime(e.target.value)}
                                                    className="border p-2 rounded text-black w-28"
                                                />
                                                <span className="text-gray-400">-</span>
                                                <input
                                                    type="time"
                                                    value={editEndTime}
                                                    onChange={(e) => setEditEndTime(e.target.value)}
                                                    className="border p-2 rounded text-black w-28"
                                                />
                                            </div>
                                        ) : (
                                            <span className="text-black">{emp.work_start_time?.slice(0, 5)} - {emp.work_end_time?.slice(0, 5)}</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {editingId === emp.id ? (
                                            <input
                                                value={editPin}
                                                maxLength={6}
                                                onChange={(e) => setEditPin(e.target.value)}
                                                className="border p-2 rounded w-20 text-black font-mono"
                                            />
                                        ) : (
                                            <span className="font-mono text-gray-500 tracking-widest text-xs">******</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {editingId === emp.id ? (
                                            <div className="flex space-x-2">
                                                <select
                                                    value={editWageType}
                                                    onChange={(e) => setEditWageType(e.target.value)}
                                                    className="border p-2 rounded text-sm text-black"
                                                >
                                                    <option value="monthly">Monthly</option>
                                                    <option value="daily">Daily</option>
                                                </select>
                                                <input
                                                    type="number"
                                                    value={editBaseWage}
                                                    onChange={(e) => setEditBaseWage(Number(e.target.value))}
                                                    className="border p-2 rounded w-28 text-sm text-black"
                                                />
                                            </div>
                                        ) : (
                                            <div className="text-sm">
                                                <p className="font-medium capitalize text-black">{emp.wage_type}</p>
                                                <p className="text-black">Rp {emp.base_wage?.toLocaleString()}</p>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-right space-x-2">
                                        {editingId === emp.id ? (
                                            <>
                                                <button onClick={saveEdit} className="text-green-600 hover:text-green-800 font-medium">Save</button>
                                                <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700">Cancel</button>
                                            </>
                                        ) : (
                                            <button onClick={() => startEdit(emp)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {employees.length === 0 && !loading && (
                        <div className="p-8 text-center text-gray-500">No employees found. Register one first.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
