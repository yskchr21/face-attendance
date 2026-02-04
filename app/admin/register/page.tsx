"use client";

import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function RegisterEmployeePage() {
    const { role } = useAuth();
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [whatsapp, setWhatsapp] = useState(''); // New State
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('18:00'); // New End Time
    const [pin, setPin] = useState('123456'); // New PIN
    const [wageType, setWageType] = useState('monthly');
    const [baseWage, setBaseWage] = useState('');

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Protect Route
    useEffect(() => {
        if (role !== 'admin') {
            // router.push('/'); 
        }
    }, [role, router]);

    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = '/models';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            setModelsLoaded(true);
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

    const handleRegister = async () => {
        if (!videoRef.current || !name) return;
        setLoading(true);
        setMessage('');

        try {
            const detections = await faceapi
                .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detections) {
                const descriptor = Array.from(detections.descriptor);

                // Insert into 'employees' table
                const { error } = await supabase
                    .from('employees')
                    .insert([{
                        name,
                        whatsapp_number: whatsapp,
                        face_descriptor: descriptor,
                        work_start_time: startTime + ':00',
                        work_end_time: endTime + ':00',
                        pin: pin,
                        wage_type: wageType,
                        base_wage: parseInt(baseWage) || 0
                    }]);

                if (error) throw error;
                setMessage('Employee Registered Successfully!');
                setName('');
                setWhatsapp('');
                setBaseWage('');
                // Reset defaults
                setStartTime('09:00');
                setEndTime('18:00');
                setPin('123456');
            } else {
                setMessage('No face detected. Please try again.');
            }
        } catch (error: any) {
            console.error(error);
            setMessage(`Error: ${error.message || 'Something went wrong'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl overflow-hidden flex flex-col md:flex-row">

                {/* Camera Section */}
                <div className="w-full md:w-1/2 bg-black relative aspect-video md:aspect-auto">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        className="w-full h-full object-cover"
                    />
                    {!modelsLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white">
                            Loading AI Models...
                        </div>
                    )}
                </div>

                {/* Form Section */}
                <div className="w-full md:w-1/2 p-8">
                    <h1 className="text-2xl font-bold mb-6 text-gray-800">Register New Employee</h1>
                    <button onClick={() => router.back()} className="text-sm text-gray-500 hover:underline mb-4">&larr; Back to Dashboard</button>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Employee Name</label>
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full p-3 rounded border border-gray-300 focus:border-blue-500 focus:outline-none text-black"
                            />
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
                            disabled={loading || !modelsLoaded || !name}
                            className={`w-full p-3 rounded font-bold text-white transition-colors ${loading || !modelsLoaded || !name
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                        >
                            {loading ? 'Registering...' : 'Register Employee'}
                        </button>

                        {message && (
                            <div className={`p-3 rounded text-center text-sm ${message.includes('Error') || message.includes('No face') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {message}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
