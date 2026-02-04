"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Language = 'en' | 'id';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Dictionary
const dictionary: Record<Language, Record<string, string>> = {
    en: {
        // Kiosk
        "check_in": "CHECK IN",
        "check_out": "CHECK OUT",
        "position_face": "Position your face in the camera...",
        "processing": "Processing...",
        "face_not_recognized": "Face not recognized. Please register first.",
        "already_checked_in": "⚠️ Already Checked In Today",
        "already_checked_out": "⚠️ Already Checked Out Today",
        "success": "✅ Success",
        "back_to_home": "Back to Home",
        "initializing": "Initializing Neural Networks...",
        "mode": "Mode",

        // Auth
        "login_title": "Face Attendance Login",
        "username": "Username",
        "password": "Password",
        "login_button": "Login",
        "logging_in": "Logging in...",
        "employee_portal": "Employee Portal",
        "go_to_employee": "Go to Employee Portal",

        // Admin Layout
        "dashboard": "Dashboard", // Keep same
        "payroll_report": "Payroll Report",
        "attendance_logs": "Attendance Logs",
        "manage_employees": "Manage Employees",
        "register_new": "Register New",
        "settings": "Settings",
        "logout": "Logout",

        // Dashboard & Status
        "total_employees": "Total Employees",
        "present_today": "Present Today",
        "late_arrivals": "Late Arrivals",
        "recent_activity": "Recent Attendance Activity",
        "no_records": "No records found today",
        "time": "Time",
        "employee_name": "Employee Name",
        "status": "Status",
        "on_time": "ON TIME",
        "late": "LATE",
        "early_departure": "EARLY DEPARTURE",
        "overtime": "OVERTIME",
        "present": "PRESENT",

        // Payroll Report
        "monthly_payroll_report": "Monthly Payroll Report",
        "wage_type": "Wage Type",
        "base_wage": "Base Wage",
        "days_present": "Days Present",
        "lates": "Lates",
        "fines": "Fines",
        "bonuses": "Bonuses",
        "est_take_home": "Est. Take Home",
        "export_pdf": "Export PDF",
        "loading_data": "Loading Data...",

        // Settings
        "app_settings": "App Settings",
        "company_name": "Company Name",
        "global_timezone": "Global Timezone",
        "late_threshold": "Late Threshold (Minutes)",
        "language": "Language",
        "save_settings": "Save All Settings",
        "saving": "Saving...",
        "settings_saved": "Settings Saved Successfully!",
    },
    id: {
        // Kiosk
        "check_in": "MASUK",
        "check_out": "KELUAR",
        "position_face": "Posisikan wajah Anda di kamera...",
        "processing": "Memproses...",
        "face_not_recognized": "Wajah tidak dikenali. Silakan daftar dulu.",
        "already_checked_in": "⚠️ Sudah Absen Masuk Hari Ini",
        "already_checked_out": "⚠️ Sudah Absen Keluar Hari Ini",
        "success": "✅ Berhasil",
        "back_to_home": "Kembali ke Beranda",
        "initializing": "Menyiapkan Sistem...",
        "mode": "Mode",

        // Auth
        "login_title": "Login Absensi Wajah",
        "username": "Username",
        "password": "Password",
        "login_button": "Masuk",
        "logging_in": "Sedang masuk...",
        "employee_portal": "Portal Karyawan",
        "go_to_employee": "Buka Portal Karyawan",

        // Admin Layout
        "dashboard": "Dashboard", // Requested to keep same
        "payroll_report": "Laporan Gaji",
        "attendance_logs": "Riwayat Absensi",
        "manage_employees": "Kelola Karyawan",
        "register_new": "Daftar Baru",
        "settings": "Pengaturan",
        "logout": "Keluar",

        // Dashboard & Status
        "total_employees": "Total Karyawan",
        "present_today": "Hadir Hari Ini",
        "late_arrivals": "Terlambat",
        "recent_activity": "Aktivitas Terbaru",
        "no_records": "Belum ada data hari ini",
        "time": "Waktu",
        "employee_name": "Nama Karyawan",
        "status": "Status",
        "on_time": "TEPAT WAKTU",
        "late": "TERLAMBAT",
        "early_departure": "PULANG CEPAT",
        "overtime": "LEMBUR",
        "present": "HADIR",

        // Payroll Report
        "monthly_payroll_report": "Laporan Gaji Bulanan",
        "wage_type": "Tipe Gaji",
        "base_wage": "Gaji Pokok",
        "days_present": "Hari Masuk",
        "lates": "Terlambat",
        "fines": "Denda",
        "bonuses": "Bonus",
        "est_take_home": "Est. Gaji Bersih",
        "export_pdf": "Ekspor PDF",
        "loading_data": "Memuat Data...",

        // Settings
        "app_settings": "Pengaturan Aplikasi",
        "company_name": "Nama Perusahaan",
        "global_timezone": "Zona Waktu",
        "late_threshold": "Batas Toleransi Terlambat (Menit)",
        "language": "Bahasa",
        "save_settings": "Simpan Pengaturan",
        "saving": "Menyimpan...",
        "settings_saved": "Pengaturan Berhasil Disimpan!",
    }
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
    const [language, setLanguage] = useState<Language>('en');

    // Load language from settings on mount
    useEffect(() => {
        const fetchLang = async () => {
            const { data } = await supabase.from('app_settings').select('value').eq('key', 'language').single();
            if (data && (data.value === 'en' || data.value === 'id')) {
                setLanguage(data.value as Language);
            }
        };
        fetchLang();
    }, []);

    const t = (key: string) => {
        return dictionary[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
