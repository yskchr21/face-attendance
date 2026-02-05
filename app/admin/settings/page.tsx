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

    // Basic Settings
    const [timezone, setTimezone] = useState('Asia/Jakarta');
    const [companyName, setCompanyName] = useState('My Company');
    const [lateThreshold, setLateThreshold] = useState('15');
    const [selectedLang, setSelectedLang] = useState(language);

    // Work Hours Settings (NEW)
    const [workStartTime, setWorkStartTime] = useState('07:00');
    const [workEndTime, setWorkEndTime] = useState('15:00');
    const [breakStartTime, setBreakStartTime] = useState('11:00');
    const [breakEndTime, setBreakEndTime] = useState('12:00');

    // Kiosk Rules (NEW)
    const [allowLateCheckin, setAllowLateCheckin] = useState(true);
    const [maxLateMinutes, setMaxLateMinutes] = useState('60');
    const [allowEarlyCheckout, setAllowEarlyCheckout] = useState(false);
    const [allowEarlyBreakout, setAllowEarlyBreakout] = useState(true);

    const timezones = [
        'Asia/Jakarta', 'Asia/Jayapura', 'Asia/Makassar', 'Asia/Singapore',
        'Asia/Bangkok', 'Australia/Sydney', 'Europe/London', 'America/New_York', 'UTC'
    ];

    useEffect(() => {
        if (role !== 'admin') { /* router.push('/'); */ }
    }, [role, router]);

    useEffect(() => { fetchSettings(); }, []);

    const fetchSettings = async () => {
        const { data } = await supabase.from('app_settings').select('*');
        if (data) {
            data.forEach(s => {
                if (s.key === 'timezone') setTimezone(s.value);
                if (s.key === 'company_name') setCompanyName(s.value);
                if (s.key === 'late_threshold') setLateThreshold(s.value);
                if (s.key === 'language') setSelectedLang(s.value);
                if (s.key === 'work_start_time') setWorkStartTime(s.value);
                if (s.key === 'work_end_time') setWorkEndTime(s.value);
                if (s.key === 'break_start_time') setBreakStartTime(s.value);
                if (s.key === 'break_end_time') setBreakEndTime(s.value);
                if (s.key === 'allow_late_checkin') setAllowLateCheckin(s.value === 'true');
                if (s.key === 'max_late_minutes') setMaxLateMinutes(s.value);
                if (s.key === 'allow_early_checkout') setAllowEarlyCheckout(s.value === 'true');
                if (s.key === 'allow_early_breakout') setAllowEarlyBreakout(s.value === 'true');
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
            { key: 'work_start_time', value: workStartTime },
            { key: 'work_end_time', value: workEndTime },
            { key: 'break_start_time', value: breakStartTime },
            { key: 'break_end_time', value: breakEndTime },
            { key: 'allow_late_checkin', value: allowLateCheckin ? 'true' : 'false' },
            { key: 'max_late_minutes', value: maxLateMinutes },
            { key: 'allow_early_checkout', value: allowEarlyCheckout ? 'true' : 'false' },
            { key: 'allow_early_breakout', value: allowEarlyBreakout ? 'true' : 'false' },
        ];

        const { error } = await supabase.from('app_settings').upsert(updates);

        if (error) {
            setMessage('Error saving settings');
        } else {
            setLanguage(selectedLang as any);
            setMessage(t('settings_saved'));
            setTimeout(() => window.location.reload(), 500);
        }
        setSaving(false);
    };

    if (loading) return <div className="p-8">Loading settings...</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-3xl mx-auto space-y-6">
                <header className="bg-white rounded-lg shadow-md p-6">
                    <button onClick={() => router.push('/admin/dashboard')} className="text-gray-500 hover:text-gray-800 mb-2">&larr; {t('dashboard')}</button>
                    <h1 className="text-3xl font-bold text-gray-800">{t('app_settings')}</h1>
                </header>

                {/* General Settings */}
                <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
                    <h2 className="text-xl font-bold text-gray-800 border-b pb-2">General</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">{t('language')}</label>
                            <select value={selectedLang} onChange={(e) => setSelectedLang(e.target.value as any)} className="w-full border rounded p-3 text-black">
                                <option value="en">English</option>
                                <option value="id">Bahasa Indonesia</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">{t('company_name')}</label>
                            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full border rounded p-3 text-black" />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">{t('global_timezone')}</label>
                            <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full border rounded p-3 text-black">
                                {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">{t('late_threshold')}</label>
                            <input type="number" value={lateThreshold} onChange={(e) => setLateThreshold(e.target.value)} className="w-full border rounded p-3 text-black" />
                        </div>
                    </div>
                </div>

                {/* Work Hours Settings */}
                <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
                    <h2 className="text-xl font-bold text-gray-800 border-b pb-2">⏰ Work Hours (Global Default)</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">Work Start</label>
                            <input type="time" value={workStartTime} onChange={(e) => setWorkStartTime(e.target.value)} className="w-full border rounded p-3 text-black" />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">Work End</label>
                            <input type="time" value={workEndTime} onChange={(e) => setWorkEndTime(e.target.value)} className="w-full border rounded p-3 text-black" />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">Break Start</label>
                            <input type="time" value={breakStartTime} onChange={(e) => setBreakStartTime(e.target.value)} className="w-full border rounded p-3 text-black" />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">Break End</label>
                            <input type="time" value={breakEndTime} onChange={(e) => setBreakEndTime(e.target.value)} className="w-full border rounded p-3 text-black" />
                        </div>
                    </div>
                </div>

                {/* Kiosk Rules */}
                <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
                    <h2 className="text-xl font-bold text-gray-800 border-b pb-2">🖥️ Kiosk Mode Rules</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <div>
                                <p className="font-medium text-gray-800">Allow Late Check-In</p>
                                <p className="text-sm text-gray-500">Can employees check in after work start time?</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={allowLateCheckin} onChange={(e) => setAllowLateCheckin(e.target.checked)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-300 peer-checked:bg-green-500 rounded-full peer-focus:ring-2 peer-focus:ring-green-300 transition-all after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                            </label>
                        </div>

                        {allowLateCheckin && (
                            <div className="ml-4 p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                                <label className="block text-gray-700 font-bold mb-2">Max Late Minutes</label>
                                <input type="number" value={maxLateMinutes} onChange={(e) => setMaxLateMinutes(e.target.value)} className="w-32 border rounded p-2 text-black" />
                                <p className="text-sm text-gray-500 mt-1">After this, check-in is blocked.</p>
                            </div>
                        )}

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <div>
                                <p className="font-medium text-gray-800">Allow Early Check-Out</p>
                                <p className="text-sm text-gray-500">Can employees check out before work end time?</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={allowEarlyCheckout} onChange={(e) => setAllowEarlyCheckout(e.target.checked)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-300 peer-checked:bg-green-500 rounded-full peer-focus:ring-2 peer-focus:ring-green-300 transition-all after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <div>
                                <p className="font-medium text-gray-800">Allow Early Break Out</p>
                                <p className="text-sm text-gray-500">Can employees return from break early?</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={allowEarlyBreakout} onChange={(e) => setAllowEarlyBreakout(e.target.checked)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-300 peer-checked:bg-green-500 rounded-full peer-focus:ring-2 peer-focus:ring-green-300 transition-all after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-all shadow-lg">
                        {saving ? t('saving') : t('save_settings')}
                    </button>
                    {message && (
                        <div className={`mt-4 p-4 rounded text-center font-bold ${message.includes('Error') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
