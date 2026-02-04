"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

export default function SettingsPage() {
    const { role } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const { t, language, setLanguage } = useLanguage();

    // Settings State
    const [timezone, setTimezone] = useState('Asia/Jakarta');
    const [companyName, setCompanyName] = useState('My Company');
    const [lateThreshold, setLateThreshold] = useState('15');
    const [selectedLang, setSelectedLang] = useState(language);

    // Common Timezones
    const timezones = [
        'Asia/Jakarta',
        'Asia/Jayapura',
        'Asia/Makassar',
        'Asia/Singapore',
        'Asia/Bangkok',
        'Australia/Sydney',
        'Europe/London',
        'America/New_York',
        'UTC'
    ];

    useEffect(() => {
        if (role !== 'admin') {
            // router.push('/'); 
        }
    }, [role, router]);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const { data } = await supabase.from('app_settings').select('*');
        if (data) {
            data.forEach(setting => {
                if (setting.key === 'timezone') setTimezone(setting.value);
                if (setting.key === 'company_name') setCompanyName(setting.value);
                if (setting.key === 'late_threshold') setLateThreshold(setting.value);
                if (setting.key === 'language') setSelectedLang(setting.value);
            });
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');

        const updates = [
            { key: 'timezone', value: timezone },
            { key: 'company_name', value: companyName },
            { key: 'late_threshold', value: lateThreshold },
            { key: 'language', value: selectedLang },
        ];

        const { error } = await supabase.from('app_settings').upsert(updates);

        if (error) {
            setMessage('Error saving settings');
        } else {
            setLanguage(selectedLang as any); // Update Context immediately
            setMessage(t('settings_saved'));
            setTimeout(() => window.location.reload(), 500);
        }
        setSaving(false);
    };

    if (loading) return <div className="p-8">Loading settings...</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
                <header className="flex justify-between items-center mb-6">
                    <div>
                        <button onClick={() => router.push('/admin/dashboard')} className="text-gray-500 hover:text-gray-800 mb-2">&larr; {t('dashboard')}</button>
                        <h1 className="text-3xl font-bold text-gray-800">{t('app_settings')}</h1>
                    </div>
                </header>

                <div className="space-y-6">
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">{t('language')}</label>
                        <select
                            value={selectedLang}
                            onChange={(e) => setSelectedLang(e.target.value as any)}
                            className="w-full border rounded p-3 text-black text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="en">English</option>
                            <option value="id">Bahasa Indonesia</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-700 font-bold mb-2">{t('company_name')}</label>
                        <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full border rounded p-3 text-black text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 font-bold mb-2">{t('global_timezone')}</label>
                        <select
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            className="w-full border rounded p-3 text-black text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {timezones.map(tz => (
                                <option key={tz} value={tz}>{tz}</option>
                            ))}
                        </select>
                        <p className="text-gray-500 text-sm mt-1">Affects the clock and attendance logs time.</p>
                    </div>

                    <div>
                        <label className="block text-gray-700 font-bold mb-2">{t('late_threshold')}</label>
                        <input
                            type="number"
                            value={lateThreshold}
                            onChange={(e) => setLateThreshold(e.target.value)}
                            className="w-full border rounded p-3 text-black text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-gray-500 text-sm mt-1">Grace period before check-in is marked 'Late'.</p>
                    </div>

                    <div className="pt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-all shadow-lg"
                        >
                            {saving ? t('saving') : t('save_settings')}
                        </button>
                    </div>

                    {message && (
                        <div className={`p-4 rounded text-center font-bold ${message.includes('Error') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
