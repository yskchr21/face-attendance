"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function RegisterEmployeePage() {
    const { role } = useAuth();
    const router = useRouter();

    // Form State (NO face scan - just data entry)
    const [name, setName] = useState('');
    const [jobPosition, setJobPosition] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [startTime, setStartTime] = useState('07:00');
    const [endTime, setEndTime] = useState('15:00');
    const [pin, setPin] = useState('123456');
    const [wageType, setWageType] = useState('monthly');
    const [baseWage, setBaseWage] = useState('');

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (role !== 'admin') { /* router.push('/'); */ }
    }, [role, router]);

    const handleRegister = async () => {
        if (!name) {
            setMessage('Please enter employee name');
            return;
        }
        setLoading(true);
        setMessage('');

        try {
            // Insert employee WITHOUT face_descriptor (will be added later via Scan Face)
            const { error } = await supabase
                .from('employees')
                .insert([{
                    name,
                    job_position: jobPosition,
                    whatsapp_number: whatsapp,
                    work_start_time: startTime + ':00',
                    work_end_time: endTime + ':00',
                    pin: pin,
                    wage_type: wageType,
                    base_wage: parseInt(baseWage) || 0,
                    face_descriptor: [] // Empty - will be scanned later
                }]);

            if (error) throw error;
            setMessage('✅ Employee Registered! Go to Employee Management to scan face.');
            setName('');
            setJobPosition('');
            setWhatsapp('');
            setBaseWage('');
            setStartTime('07:00');
            setEndTime('15:00');
            setPin('123456');
        } catch (error: any) {
            console.error(error);
            setMessage(`Error: ${error.message || 'Something went wrong'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl overflow-hidden">
                <div className="p-8">
                    <button onClick={() => router.back()} className="text-sm text-gray-500 hover:underline mb-4">&larr; Back to Dashboard</button>
                    <h1 className="text-2xl font-bold mb-6 text-gray-800">Register New Employee</h1>
                    <p className="text-gray-500 text-sm mb-6">📸 Face scan will be done in Employee Management after registration.</p>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Employee Name *</label>
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full p-3 rounded border border-gray-300 focus:border-blue-500 focus:outline-none text-black"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Job Position</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Manager, Staff, Driver"
                                    value={jobPosition}
                                    onChange={(e) => setJobPosition(e.target.value)}
                                    className="w-full p-3 rounded border border-gray-300 focus:border-blue-500 focus:outline-none text-black"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">WhatsApp Number</label>
                            <input
                                type="text"
                                placeholder="e.g. 62812345678"
                                value={whatsapp}
                                onChange={(e) => setWhatsapp(e.target.value)}
                                className="w-full p-3 rounded border border-gray-300 focus:border-blue-500 focus:outline-none text-black"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Start Time</label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full p-3 rounded border border-gray-300 focus:border-blue-500 focus:outline-none text-black"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">End Time</label>
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full p-3 rounded border border-gray-300 focus:border-blue-500 focus:outline-none text-black"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Login PIN (6 Digits)</label>
                            <input
                                type="text"
                                maxLength={6}
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                className="w-full p-3 rounded border border-gray-300 focus:border-blue-500 focus:outline-none text-black tracking-widest font-mono"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Wage Type</label>
                                <select
                                    value={wageType}
                                    onChange={(e) => setWageType(e.target.value)}
                                    className="w-full p-3 rounded border border-gray-300 focus:border-blue-500 focus:outline-none text-black"
                                >
                                    <option value="monthly">Monthly</option>
                                    <option value="daily">Daily</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Base Wage (Rp)</label>
                                <input
                                    type="number"
                                    value={baseWage}
                                    onChange={(e) => setBaseWage(e.target.value)}
                                    className="w-full p-3 rounded border border-gray-300 focus:border-blue-500 focus:outline-none text-black"
                                    placeholder="e.g 5000000"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleRegister}
                            disabled={loading || !name}
                            className={`w-full p-3 rounded font-bold text-white transition-colors ${loading || !name
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                        >
                            {loading ? 'Registering...' : 'Register Employee'}
                        </button>

                        {message && (
                            <div className={`p-3 rounded text-center text-sm ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {message}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
