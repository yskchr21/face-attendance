"use client";

import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

export default function KioskPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(null);
    const [message, setMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [mode, setMode] = useState<'check_in' | 'check_out'>('check_in');

    // Settings
    const [lateThreshold, setLateThreshold] = useState(15);

    // Timer for auto-reset
    useEffect(() => {
        setMessage(t('position_face'));
    }, [t]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (mode === 'check_out') {
            timer = setTimeout(() => {
                setMode('check_in');
            }, 20000); // 20s reset
        }
        return () => clearTimeout(timer);
    }, [mode]);

    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = '/models';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            setModelsLoaded(true);

            // Load settings
            const { data } = await supabase.from('app_settings').select('value').eq('key', 'late_threshold').single();
            if (data) setLateThreshold(parseInt(data.value) || 15);
        };
        loadModels();
    }, []);

    const startVideo = () => {
        navigator.mediaDevices
            .getUserMedia({ video: { facingMode: 'user' } })
            .then((stream) => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            })
            .catch((err) => console.error(err));
    };

    useEffect(() => {
        if (modelsLoaded) {
            startVideo();
        }
    }, [modelsLoaded]);

    useEffect(() => {
        if (!modelsLoaded || isProcessing) return;

        const interval = setInterval(async () => {
            if (videoRef.current) {
                const detection = await faceapi
                    .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (detection) {
                    setFaceDescriptor(detection.descriptor);
                    handleFaceDetected(detection.descriptor);
                }
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [modelsLoaded, isProcessing, mode]); // Add mode dependency

    const handleFaceDetected = async (descriptor: Float32Array) => {
        if (isProcessing) return;
        setIsProcessing(true);
        setMessage(t('processing'));

        try {
            // 1. Match Face
            const { data: employees } = await supabase.from('employees').select('*').eq('is_active', true);

            if (!employees) throw new Error('No employees found');

            let bestMatch: any = null;
            let minDistance = 0.6; // Threshold for face matching

            // Simple Euclidean distance check
            for (const emp of employees) {
                if (!emp.face_descriptor) continue;

                // Parse stored descriptor
                const storedDescriptor = typeof emp.face_descriptor === 'string'
                    ? JSON.parse(emp.face_descriptor)
                    : emp.face_descriptor;

                const distance = faceapi.euclideanDistance(descriptor, storedDescriptor);

                if (distance < minDistance) {
                    minDistance = distance;
                    bestMatch = emp;
                }
            }

            if (bestMatch) {
                await logAttendance(bestMatch);
            } else {
                setMessage(t('face_not_recognized'));
                setTimeout(() => { setIsProcessing(false); setMessage(t('position_face')); }, 3000);
            }

        } catch (error: any) {
            console.error('Kiosk Error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
            if (error instanceof Error) {
                console.error('Error Message:', error.message);
                setMessage(`Error: ${error.message}`);
            } else {
                setMessage('An unknown error occurred.');
            }
            setIsProcessing(false);
        }
    };

    const logAttendance = async (employee: any) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();

        // Check existing logs for today
        const { data: todayLogs } = await supabase
            .from('attendance_logs')
            .select('*')
            .eq('employee_id', employee.id)
            .gte('timestamp', todayStr);

        const hasCheckIn = todayLogs?.some(l => l.log_type === 'check_in');
        const hasCheckOut = todayLogs?.some(l => l.log_type === 'check_out');

        // STRICT LOGIC: 1 Check In, 1 Check Out
        if (mode === 'check_in' && hasCheckIn) {
            setMessage(`${t('already_checked_in')} ${employee.name}`);
            setTimeout(() => { setIsProcessing(false); setMessage(t('position_face')); }, 3000);
            return;
        }

        if (mode === 'check_out' && hasCheckOut) {
            setMessage(`${t('already_checked_out')} ${employee.name}`);
            setTimeout(() => { setIsProcessing(false); setMessage(t('position_face')); }, 3000);
            return;
        }

        // Determine Status (Late vs On Time)
        let status = 'on_time';
        if (mode === 'check_in') {
            const now = new Date();
            const [workHour, workMin] = (employee.work_start_time || '09:00:00').split(':');

            const workStart = new Date();
            workStart.setHours(parseInt(workHour), parseInt(workMin), 0, 0);

            // Add Late Threshold
            workStart.setMinutes(workStart.getMinutes() + lateThreshold);

            if (now > workStart) {
                status = 'late';
            }
        } else {
            // Check out status logic: Early Departure vs Overtime
            const now = new Date();
            const [endHour, endMin] = (employee.work_end_time || '18:00:00').split(':');

            const workEnd = new Date();
            workEnd.setHours(parseInt(endHour), parseInt(endMin), 0, 0);

            if (now < workEnd) {
                status = 'early_departure';
            } else {
                status = 'overtime';
            }
        }

        const { error } = await supabase.from('attendance_logs').insert([
            {
                employee_id: employee.id,
                timestamp: new Date().toISOString(),
                status: status,
                log_type: mode
            }
        ]);

        if (error) throw error;

        setMessage(`${t('success')}: ${mode === 'check_in' ? t('check_in') : t('check_out')} - ${employee.name} (${t(status)})`);

        setTimeout(() => {
            setIsProcessing(false);
            setMessage(t('position_face'));
        }, 3000);
    };

    return (
        <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-500 ${mode === 'check_in' ? 'bg-green-50' : 'bg-red-50'}`}>
            {/* Navigation Button */}
            <button
                onClick={() => router.push('/')}
                className="absolute top-4 left-4 z-50 bg-white/80 hover:bg-white text-gray-800 px-4 py-2 rounded-full shadow-md font-bold transition-all"
            >
                &larr; {t('back_to_home')}
            </button>

            {/* Mode Toggle */}
            <div className="absolute top-4 flex space-x-4 bg-white p-2 rounded-full shadow-lg z-40">
                <button
                    onClick={() => setMode('check_in')}
                    className={`px-6 py-2 rounded-full font-bold transition-all ${mode === 'check_in' ? 'bg-green-600 text-white shadow-md transform scale-105' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    {t('check_in')}
                </button>
                <button
                    onClick={() => setMode('check_out')}
                    className={`px-6 py-2 rounded-full font-bold transition-all ${mode === 'check_out' ? 'bg-red-600 text-white shadow-md transform scale-105' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    {t('check_out')}
                </button>
            </div>

            <div className="w-full max-w-2xl bg-black rounded-3xl overflow-hidden shadow-2xl relative aspect-[4/3] border-4 border-white mt-16">
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-500 ${isProcessing ? 'opacity-50' : 'opacity-100'}`}
                />

                {/* Helper Frame */}
                <div className="absolute inset-0 border-[3px] border-white/30 rounded-3xl pointer-events-none m-8"></div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-80 border-2 border-dashed border-white/50 rounded-full opacity-50"></div>
                </div>

                {/* Status Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-8 text-center">
                    <h2 className="text-3xl font-bold text-white mb-2 animate-pulse">
                        {message}
                    </h2>
                    <p className="text-gray-300 text-sm">
                        {!modelsLoaded ? t('initializing') : `${t('mode')}: ${mode === 'check_in' ? t('check_in') : t('check_out')}`}
                    </p>
                </div>
            </div>

            <div className="mt-8 text-center text-gray-500 text-sm">
                <p>Face Attendance System Kiosk v1.0</p>
                <p className="mt-2">Ensure good lighting and remove masks/glasses.</p>
            </div>
        </div>
    );
}
