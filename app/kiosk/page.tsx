"use client";

import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

type KioskMode = 'check_in' | 'check_out' | 'break_in' | 'break_out';

interface Settings {
    workStartTime: string;
    workEndTime: string;
    breakStartTime: string;
    breakEndTime: string;
    lateThreshold: number;
    allowLateCheckin: boolean;
    maxLateMinutes: number;
    allowEarlyCheckout: boolean;
    allowEarlyBreakout: boolean;
}

export default function KioskPage() {
    const router = useRouter();
    const { t, language } = useLanguage();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [message, setMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [mode, setMode] = useState<KioskMode>('check_in');
    const [isBreakTime, setIsBreakTime] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Settings
    const [settings, setSettings] = useState<Settings>({
        workStartTime: '07:00',
        workEndTime: '15:00',
        breakStartTime: '11:00',
        breakEndTime: '12:00',
        lateThreshold: 15,
        allowLateCheckin: true,
        maxLateMinutes: 60,
        allowEarlyCheckout: false,
        allowEarlyBreakout: true
    });

    // Clock update
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Smart auto-switch mode based on schedule
    useEffect(() => {
        const now = currentTime;
        const [wsH, wsM] = settings.workStartTime.split(':').map(Number);
        const [weH, weM] = settings.workEndTime.split(':').map(Number);
        const [bsH, bsM] = settings.breakStartTime.split(':').map(Number);
        const [beH, beM] = settings.breakEndTime.split(':').map(Number);

        const workStart = new Date(); workStart.setHours(wsH, wsM, 0, 0);
        const workEnd = new Date(); workEnd.setHours(weH, weM, 0, 0);
        const breakStart = new Date(); breakStart.setHours(bsH, bsM, 0, 0);
        const breakEnd = new Date(); breakEnd.setHours(beH, beM, 0, 0);

        const inBreak = now >= breakStart && now < breakEnd;
        setIsBreakTime(inBreak);

        // Auto-switch logic based on time of day:
        // Before work start → check_in
        // Work start to break start → check_in (morning)
        // Break start to mid-break → break_out (going out for break)
        // Mid-break to break end → break_in (coming back from break)
        // Break end to work end → check_out
        // After work end → check_out

        const midBreak = new Date(breakStart.getTime() + (breakEnd.getTime() - breakStart.getTime()) / 2);

        if (now < workStart) {
            // Before work: check_in
            setMode('check_in');
        } else if (now >= workStart && now < breakStart) {
            // Morning work hours: check_in
            setMode('check_in');
        } else if (now >= breakStart && now < midBreak) {
            // First half of break: break_out (going out)
            setMode('break_out');
        } else if (now >= midBreak && now < breakEnd) {
            // Second half of break: break_in (coming back)
            setMode('break_in');
        } else if (now >= breakEnd && now < workEnd) {
            // Afternoon work hours: check_out
            setMode('check_out');
        } else {
            // After work end: check_out
            setMode('check_out');
        }
    }, [currentTime, settings]);

    const [initStep, setInitStep] = useState<string>('Memulai inisialisasi...');

    useEffect(() => {
        setMessage(t('position_face'));
    }, [t]);

    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = '/models';

                setInitStep('Memuat Tiny Face Detector...');
                await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);

                setInitStep('Memuat Face Landmark 68...');
                await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

                setInitStep('Memuat Face Recognition...');
                await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

                setInitStep('Memuat pengaturan aplikasi...');
                // Load all settings
                const { data, error } = await supabase.from('app_settings').select('*');
                if (error) {
                    console.error("Error loading settings:", error);
                    setInitStep(`Error pengaturan: ${error.message}`);
                }

                if (data) {
                    const s = { ...settings };
                    data.forEach(row => {
                        if (row.key === 'work_start_time') s.workStartTime = row.value;
                        if (row.key === 'work_end_time') s.workEndTime = row.value;
                        if (row.key === 'break_start_time') s.breakStartTime = row.value;
                        if (row.key === 'break_end_time') s.breakEndTime = row.value;
                        if (row.key === 'late_threshold') s.lateThreshold = parseInt(row.value) || 15;
                        if (row.key === 'allow_late_checkin') s.allowLateCheckin = row.value === 'true';
                        if (row.key === 'max_late_minutes') s.maxLateMinutes = parseInt(row.value) || 60;
                        if (row.key === 'allow_early_checkout') s.allowEarlyCheckout = row.value === 'true';
                        if (row.key === 'allow_early_breakout') s.allowEarlyBreakout = row.value === 'true';
                    });
                    setSettings(s);
                }

                setInitStep('Memulai kamera...');
                setModelsLoaded(true);
            } catch (err: any) {
                console.error("Error initializing models:", err);
                setInitStep(`Gagal memuat AI: ${err.message || 'Error tidak diketahui'}`);
                setMessage(`Gagal memuat model AI: ${err.message || 'Error tidak diketahui'}`);
            }
        };
        loadModels();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const startVideo = async () => {
        try {
            setInitStep('Mengakses kamera...');
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Browser tidak mendukung akses kamera (Mungkin karena bukan HTTPS atau browser jadul).');
            }

            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setInitStep(''); // Clear step on success
        } catch (err: any) {
            console.error("Camera error:", err);
            let errMsg = err.message || 'Error tidak diketahui';
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                errMsg = 'Izin kamera ditolak. Silakan izinkan akses kamera di browser.';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                errMsg = 'Kamera tidak ditemukan. Pastikan kamera terpasang dan tidak digunakan aplikasi lain.';
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                errMsg = 'Kamera sedang digunakan oleh aplikasi lain.';
            }
            setInitStep(`Gagal mengakses kamera: ${errMsg}`);
            setMessage(`Gagal akses kamera: ${errMsg}`);
        }
    };

    useEffect(() => { if (modelsLoaded) startVideo(); }, [modelsLoaded]);

    useEffect(() => {
        if (!modelsLoaded || isProcessing || initStep !== '') return;

        console.log("Starting detection interval...");
        const interval = setInterval(async () => {
            if (videoRef.current) {
                try {
                    // Tingkatkan scoreThreshold agar hanya wajah yang sangat jelas yang dideteksi
                    const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.7 }))
                        .withFaceLandmarks().withFaceDescriptor();

                    if (detection) {
                        console.log("Face detected with score:", detection.detection.score);
                        handleFaceDetected(detection.descriptor);
                    } else {
                        console.log("No face detected in frame.");
                    }
                } catch (error) {
                    console.error("Detection error:", error);
                }
            }
        }, 2000);

        return () => {
            console.log("Clearing detection interval");
            clearInterval(interval);
        };
    }, [modelsLoaded, isProcessing, mode, initStep]);

    const handleFaceDetected = async (descriptor: Float32Array) => {
        if (isProcessing) return;
        setIsProcessing(true);
        setMessage(t('processing'));

        try {
            const { data: employees } = await supabase.from('employees').select('id, name, face_descriptor').eq('is_active', true);
            if (!employees || employees.length === 0) {
                console.error("No active employees found in database.");
                throw new Error('Tidak ada data karyawan aktif.');
            }

            let bestMatch: any = null;
            // Turunkan minDistance (semakin kecil semakin ketat/mirip)
            // 0.55 masih cukup longgar. 0.45 atau 0.4 lebih ketat.
            let minDistance = 0.45;

            for (const emp of employees) {
                if (!emp.face_descriptor || emp.face_descriptor.length === 0) continue;
                try {
                    const storedDescriptorData = typeof emp.face_descriptor === 'string' ? JSON.parse(emp.face_descriptor) : emp.face_descriptor;
                    // Ensure it's converted back to Float32Array
                    const storedDescriptor = new Float32Array(Object.values(storedDescriptorData));
                    if (storedDescriptor.length !== 128) {
                        console.warn(`Invalid descriptor length for ${emp.name}`);
                        continue;
                    }

                    const distance = faceapi.euclideanDistance(descriptor, storedDescriptor);
                    // console.log(`Distance to ${emp.name}: ${distance}`); // Uncomment for extreme debugging

                    if (distance < minDistance) {
                        minDistance = distance;
                        bestMatch = emp;
                    }
                } catch (parseErr) {
                    console.error(`Error parsing descriptor for ${emp.name}:`, parseErr);
                }
            }

            if (bestMatch) {
                console.log(`Matched! ${bestMatch.name} (distance: ${minDistance.toFixed(4)})`);
                await logAttendance(bestMatch);
            } else {
                console.log(`No match found. Closest distance was ${minDistance.toFixed(4)}`);
                setMessage(t('face_not_recognized'));
                setTimeout(() => { setIsProcessing(false); setMessage(t('position_face')); }, 3000);
            }
        } catch (error: any) {
            console.error("Error matching face:", error);
            setMessage(`Error: ${error.message || 'Unknown error'}`);
            setTimeout(() => { setIsProcessing(false); setMessage(t('position_face')); }, 3000);
        }
    };

    const logAttendance = async (employee: any) => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const now = new Date();

        // Check existing logs for today
        const { data: todayLogs } = await supabase.from('attendance_logs').select('*')
            .eq('employee_id', employee.id).gte('timestamp', today.toISOString());

        const hasCheckIn = todayLogs?.some(l => l.log_type === 'check_in');
        const hasCheckOut = todayLogs?.some(l => l.log_type === 'check_out');
        const hasBreakIn = todayLogs?.some(l => l.log_type === 'break_in');
        const hasBreakOut = todayLogs?.some(l => l.log_type === 'break_out');

        // Mode-specific validation
        if (mode === 'check_in' && hasCheckIn) {
            setMessage(`⚠️ ${language === 'id' ? 'Sudah Check In' : 'Already Checked In'}: ${employee.name}`);
            setTimeout(() => { setIsProcessing(false); setMessage(t('position_face')); }, 3000);
            return;
        }
        if (mode === 'check_out' && hasCheckOut) {
            setMessage(`⚠️ ${language === 'id' ? 'Sudah Check Out' : 'Already Checked Out'}: ${employee.name}`);
            setTimeout(() => { setIsProcessing(false); setMessage(t('position_face')); }, 3000);
            return;
        }
        if (mode === 'break_in' && hasBreakIn) {
            setMessage(`⚠️ ${language === 'id' ? 'Sudah Istirahat Keluar' : 'Already on Break'}: ${employee.name}`);
            setTimeout(() => { setIsProcessing(false); setMessage(t('position_face')); }, 3000);
            return;
        }
        if (mode === 'break_out' && hasBreakOut) {
            setMessage(`⚠️ ${language === 'id' ? 'Sudah Kembali dari Istirahat' : 'Already Back from Break'}: ${employee.name}`);
            setTimeout(() => { setIsProcessing(false); setMessage(t('position_face')); }, 3000);
            return;
        }

        // Time restriction checks
        const [wsH, wsM] = settings.workStartTime.split(':').map(Number);
        const [weH, weM] = settings.workEndTime.split(':').map(Number);
        const workStart = new Date(); workStart.setHours(wsH, wsM, 0, 0);
        const workEnd = new Date(); workEnd.setHours(weH, weM, 0, 0);
        const lateDeadline = new Date(workStart); lateDeadline.setMinutes(lateDeadline.getMinutes() + settings.maxLateMinutes);

        // Check-in restrictions
        if (mode === 'check_in') {
            if (now > lateDeadline && settings.allowLateCheckin) {
                setMessage(`🚫 ${language === 'id' ? 'Terlalu Terlambat untuk Check In' : 'Too Late to Check In'}`);
                setTimeout(() => { setIsProcessing(false); setMessage(t('position_face')); }, 3000);
                return;
            }
        }

        // Check-out restrictions
        if (mode === 'check_out') {
            if (now < workEnd && !settings.allowEarlyCheckout) {
                setMessage(`🚫 ${language === 'id' ? 'Belum Waktu Pulang' : 'Cannot Check Out Yet'}`);
                setTimeout(() => { setIsProcessing(false); setMessage(t('position_face')); }, 3000);
                return;
            }
        }

        // Determine status
        let status = 'on_time';
        if (mode === 'check_in') {
            const thresholdTime = new Date(workStart); thresholdTime.setMinutes(thresholdTime.getMinutes() + settings.lateThreshold);
            if (now > thresholdTime) status = 'late';
        } else if (mode === 'check_out') {
            if (now < workEnd) status = 'early_departure';
            else status = 'overtime';
        } else {
            status = 'break'; // For break_in/break_out
        }

        // Capture photo from video
        let photoUrl = '';
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
                if (blob) {
                    const fileName = `${employee.id}/${mode}_${now.getTime()}.jpg`;
                    const { error: uploadError } = await supabase.storage
                        .from('attendance-photos')
                        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
                    if (!uploadError) {
                        const { data: urlData } = supabase.storage.from('attendance-photos').getPublicUrl(fileName);
                        photoUrl = urlData.publicUrl;
                    }
                }
            }
        }

        // Insert log with photo
        const { error } = await supabase.from('attendance_logs').insert([{
            employee_id: employee.id,
            timestamp: now.toISOString(),
            status: status,
            log_type: mode,
            photo_url: photoUrl
        }]);

        if (error) throw error;

        const modeLabels: Record<KioskMode, string> = {
            check_in: language === 'id' ? 'MASUK' : 'CHECK IN',
            check_out: language === 'id' ? 'KELUAR' : 'CHECK OUT',
            break_in: language === 'id' ? 'ISTIRAHAT KELUAR' : 'BREAK OUT',
            break_out: language === 'id' ? 'ISTIRAHAT MASUK' : 'BREAK IN'
        };

        setMessage(`✅ ${modeLabels[mode]} - ${employee.name}`);
        setTimeout(() => { setIsProcessing(false); setMessage(t('position_face')); }, 3000);
    };

    const getModeColor = () => {
        switch (mode) {
            case 'check_in': return 'bg-green-50';
            case 'check_out': return 'bg-red-50';
            case 'break_in': return 'bg-yellow-50';
            case 'break_out': return 'bg-blue-50';
        }
    };

    const getModeButtonClasses = (m: KioskMode) => {
        const baseClasses = 'px-4 py-2 rounded-full font-bold transition-all text-sm';
        if (mode === m) {
            switch (m) {
                case 'check_in': return `${baseClasses} bg-green-600 text-white shadow-md`;
                case 'check_out': return `${baseClasses} bg-red-600 text-white shadow-md`;
                case 'break_in': return `${baseClasses} bg-yellow-500 text-white shadow-md`;
                case 'break_out': return `${baseClasses} bg-blue-600 text-white shadow-md`;
            }
        }
        return `${baseClasses} text-gray-500 hover:bg-gray-100`;
    };

    return (
        <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-500 ${getModeColor()}`}>
            <button onClick={() => router.push('/')} className="absolute top-4 left-4 z-50 bg-white/80 hover:bg-white text-gray-800 px-4 py-2 rounded-full shadow-md font-bold">
                &larr; {t('back_to_home')}
            </button>

            {/* Mode Toggle */}
            <div className="absolute top-4 flex space-x-2 bg-white p-2 rounded-full shadow-lg z-40">
                {isBreakTime ? (
                    <>
                        <button onClick={() => setMode('break_in')} className={getModeButtonClasses('break_in')}>
                            🚶 {language === 'id' ? 'ISTIRAHAT KELUAR' : 'BREAK OUT'}
                        </button>
                        <button onClick={() => setMode('break_out')} className={getModeButtonClasses('break_out')}>
                            🔙 {language === 'id' ? 'ISTIRAHAT MASUK' : 'BREAK IN'}
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={() => setMode('check_in')} className={getModeButtonClasses('check_in')}>
                            {t('check_in')}
                        </button>
                        <button onClick={() => setMode('check_out')} className={getModeButtonClasses('check_out')}>
                            {t('check_out')}
                        </button>
                    </>
                )}
            </div>

            {/* Break Time Indicator */}
            {isBreakTime && (
                <div className="absolute top-20 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full font-bold text-sm animate-pulse">
                    ☕ {language === 'id' ? 'WAKTU ISTIRAHAT' : 'BREAK TIME'}
                </div>
            )}

            <div className="w-full max-w-2xl bg-black rounded-3xl overflow-hidden shadow-2xl relative aspect-[4/3] border-4 border-white mt-24">
                <video ref={videoRef} autoPlay muted className={`w-full h-full object-cover transform scale-x-[-1] ${isProcessing ? 'opacity-50' : ''}`} />

                <div className="absolute inset-0 border-[3px] border-white/30 rounded-3xl pointer-events-none m-8"></div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-80 border-2 border-dashed border-white/50 rounded-full opacity-50"></div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-8 text-center">
                    <h2 className="text-3xl font-bold text-white mb-2 animate-pulse">{message}</h2>
                    <p className="text-gray-300 text-sm">
                        {!modelsLoaded ? initStep : currentTime.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US')}
                    </p>
                </div>
            </div>

            <div className="mt-8 text-center text-gray-500 text-sm">
                <p>Face Attendance Kiosk v2.0</p>
                <p className="mt-1">Work: {settings.workStartTime} - {settings.workEndTime} | Break: {settings.breakStartTime} - {settings.breakEndTime}</p>
            </div>
        </div>
    );
}
