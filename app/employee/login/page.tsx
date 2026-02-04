"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface SimpleEmployee {
    id: string;
    name: string;
}

export default function EmployeeLoginPage() {
    const router = useRouter();
    const [employees, setEmployees] = useState<SimpleEmployee[]>([]);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch active employees for dropdown
        const fetchEmps = async () => {
            const { data } = await supabase
                .from('employees')
                .select('id, name')
                .eq('is_active', true)
                .order('name');
            if (data) setEmployees(data);
        };
        fetchEmps();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!selectedEmp || !pin) {
            setError('Please select your name and enter PIN');
            setLoading(false);
            return;
        }

        // Verify PIN
        const { data } = await supabase
            .from('employees')
            .select('id, name, pin')
            .eq('id', selectedEmp)
            .single();

        if (data && data.pin === pin) {
            // Success
            localStorage.setItem('employee_session', JSON.stringify({ id: data.id, name: data.name }));
            router.push('/employee/dashboard');
        } else {
            setError('Invalid PIN');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">
                <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">Employee Portal</h1>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Select Your Name</label>
                        <select
                            value={selectedEmp}
                            onChange={(e) => setSelectedEmp(e.target.value)}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black bg-white"
                        >
                            <option value="">-- Select Name --</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id} className="text-black">{emp.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Enter PIN</label>
                        <input
                            type="password"
                            maxLength={6}
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-center tracking-[0.5em] text-xl text-black"
                            placeholder="******"
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center font-bold">{error}</div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Verifying...' : 'Login'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <a href="/" className="text-sm text-gray-500 hover:text-gray-800">Back to Home</a>
                </div>
            </div>
        </div>
    );
}
