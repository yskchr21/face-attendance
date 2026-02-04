"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';

export default function LiveClock() {
    const { language } = useLanguage();
    const [time, setTime] = useState<string>('');
    const [timezone, setTimezone] = useState<string>('Asia/Jakarta'); // Default

    useEffect(() => {
        // Fetch Timezone Setting
        const fetchSettings = async () => {
            const { data } = await supabase.from('app_settings').select('value').eq('key', 'timezone').single();
            if (data) setTimezone(data.value);
        };
        fetchSettings();

        // Timer
        const interval = setInterval(() => {
            const now = new Date();
            // Format: Weekday, DD Mon YYYY - HH:mm:ss
            const locale = language === 'id' ? 'id-ID' : 'en-GB';

            const formatted = new Intl.DateTimeFormat(locale, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZone: timezone
            }).format(now);
            setTime(formatted);
        }, 1000);

        return () => clearInterval(interval);
    }, [timezone]);

    if (!time) return null;

    return (
        <div className="fixed top-2 right-4 z-50 bg-black/50 text-white px-4 py-2 rounded-full text-xs font-mono shadow-lg backdrop-blur-sm border border-white/20">
            {time}
        </div>
    );
}
