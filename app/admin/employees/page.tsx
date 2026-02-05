"use client";

import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface Employee {
    id: string;
    name: string;
    job_position: string;
    whatsapp_number: string;
    work_start_time: string;
    work_end_time: string;
    pin: string;
    is_active: boolean;
    wage_type: string;
    base_wage: number;
    ktp_url: string;
    profile_photo_url: string;
    face_descriptor: number[];
    overtime_hourly_rate: number;
}

export default function EmployeeManagement() {
    const { role } = useAuth();
    const router = useRouter();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Edit State
    const [editName, setEditName] = useState('');
    const [editJobPosition, setEditJobPosition] = useState('');
    const [editWhatsapp, setEditWhatsapp] = useState('');
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndTime, setEditEndTime] = useState('');
    const [editPin, setEditPin] = useState('');
    const [editWageType, setEditWageType] = useState('monthly');
    const [editBaseWage, setEditBaseWage] = useState(0);
    const [editOvertimeRate, setEditOvertimeRate] = useState(0);

    // Face Scan Modal State
    const [scanningId, setScanningId] = useState<string | null>(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [scanMessage, setScanMessage] = useState('');
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // KTP Upload State
    const [uploadingKtpId, setUploadingKtpId] = useState<string | null>(null);

    useEffect(() => {
        if (role !== 'admin') { /* router.push('/'); */ }
    }, [role, router]);

    useEffect(() => { fetchEmployees(); loadFaceModels(); }, []);

    const loadFaceModels = async () => {
        const MODEL_URL = '/models';
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
    };

    const fetchEmployees = async () => {
        const { data } = await supabase
            .from('employees')
            .select('*')
            .order('is_active', { ascending: false })
            .order('name', { ascending: true });
        if (data) setEmployees(data);
        setLoading(false);
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        await supabase.from('employees').update({ is_active: !currentStatus }).eq('id', id);
        fetchEmployees();
    };

    const startEdit = (emp: Employee) => {
        setEditingId(emp.id);
        setEditName(emp.name);
        setEditJobPosition(emp.job_position || '');
        setEditWhatsapp(emp.whatsapp_number || '');
        setEditStartTime(emp.work_start_time || '07:00:00');
        setEditEndTime(emp.work_end_time || '15:00:00');
        setEditPin(emp.pin || '123456');
        setEditWageType(emp.wage_type || 'monthly');
        setEditBaseWage(emp.base_wage || 0);
        setEditOvertimeRate(emp.overtime_hourly_rate || 0);
    };

    const saveEdit = async () => {
        if (!editingId) return;
        await supabase.from('employees').update({
            name: editName,
            job_position: editJobPosition,
            whatsapp_number: editWhatsapp,
            work_start_time: editStartTime,
            work_end_time: editEndTime,
            pin: editPin,
            wage_type: editWageType,
            base_wage: editBaseWage,
            overtime_hourly_rate: editOvertimeRate
        }).eq('id', editingId);
        setEditingId(null);
        fetchEmployees();
    };

    // --- FACE SCAN FUNCTIONS ---
    const openScanModal = (empId: string) => {
        setScanningId(empId);
        setScanMessage('Position face in camera...');
        setTimeout(() => startCamera(), 100);
    };

    const startCamera = () => {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
            .then((stream) => {
                if (videoRef.current) videoRef.current.srcObject = stream;
            })
            .catch((err) => setScanMessage('Camera error: ' + err.message));
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        }
    };

    const closeScanModal = () => {
        stopCamera();
        setScanningId(null);
        setScanMessage('');
    };

    const captureAndSave = async () => {
        if (!videoRef.current || !scanningId || !modelsLoaded) return;
        setScanMessage('Detecting face...');

        try {
            const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks().withFaceDescriptor();

            if (!detection) {
                setScanMessage('❌ No face detected. Try again.');
                return;
            }

            // Capture photo from video
            const canvas = canvasRef.current!;
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0);
            const photoBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));

            if (!photoBlob) {
                setScanMessage('❌ Failed to capture photo.');
                return;
            }

            // Upload photo to Supabase Storage
            const fileName = `${scanningId}_${Date.now()}.jpg`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('photos')
                .upload(fileName, photoBlob, { contentType: 'image/jpeg', upsert: true });

            if (uploadError) throw uploadError;

            const photoUrl = supabase.storage.from('photos').getPublicUrl(fileName).data.publicUrl;

            // Save descriptor + photo URL to employee
            const descriptor = Array.from(detection.descriptor);
            await supabase.from('employees').update({
                face_descriptor: descriptor,
                profile_photo_url: photoUrl
            }).eq('id', scanningId);

            setScanMessage('✅ Face registered successfully!');
            setTimeout(() => { closeScanModal(); fetchEmployees(); }, 1500);

        } catch (error: any) {
            setScanMessage('❌ Error: ' + error.message);
        }
    };

    // --- KTP UPLOAD ---
    const handleKtpUpload = async (empId: string, file: File) => {
        setUploadingKtpId(empId);
        try {
            const fileName = `ktp_${empId}_${Date.now()}.${file.name.split('.').pop()}`;
            const { error: uploadError } = await supabase.storage.from('ktp').upload(fileName, file, { upsert: true });
            if (uploadError) throw uploadError;

            const ktpUrl = supabase.storage.from('ktp').getPublicUrl(fileName).data.publicUrl;
            await supabase.from('employees').update({ ktp_url: ktpUrl }).eq('id', empId);
            fetchEmployees();
        } catch (error: any) {
            alert('Upload failed: ' + error.message);
        } finally {
            setUploadingKtpId(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-[100rem] mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-800">&larr; Back</button>
                        <h1 className="text-3xl font-bold text-gray-800">Employee Management</h1>
                    </div>
                    <button onClick={() => router.push('/admin/register')} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                        + Register New
                    </button>
                </header>

                <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-black text-xs uppercase tracking-wider">
                                <th className="p-4 border-b">Photo</th>
                                <th className="p-4 border-b">Status</th>
                                <th className="p-4 border-b">Name & Position</th>
                                <th className="p-4 border-b">Contact</th>
                                <th className="p-4 border-b">Schedule</th>
                                <th className="p-4 border-b">Wage</th>
                                <th className="p-4 border-b">KTP</th>
                                <th className="p-4 border-b text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {employees.map((emp) => (
                                <tr key={emp.id} className={`hover:bg-gray-50 ${!emp.is_active ? 'opacity-50 bg-gray-50' : ''}`}>
                                    {/* Photo */}
                                    <td className="p-4">
                                        {emp.profile_photo_url ? (
                                            <img src={emp.profile_photo_url} alt={emp.name} className="w-12 h-12 rounded-full object-cover border-2 border-gray-200" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">No Photo</div>
                                        )}
                                    </td>

                                    {/* Status */}
                                    <td className="p-4">
                                        <button onClick={() => handleToggleActive(emp.id, emp.is_active)}
                                            className={`px-3 py-1 rounded-full text-xs font-bold ${emp.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {emp.is_active ? 'ACTIVE' : 'INACTIVE'}
                                        </button>
                                        <div className="mt-1">
                                            {emp.face_descriptor && emp.face_descriptor.length > 0 ? (
                                                <span className="text-green-600 text-xs">✓ Face Scanned</span>
                                            ) : (
                                                <span className="text-red-600 text-xs">⚠ No Face Data</span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Name & Position */}
                                    <td className="p-4">
                                        {editingId === emp.id ? (
                                            <div className="space-y-2">
                                                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="border p-2 rounded w-full text-black" placeholder="Name" />
                                                <input value={editJobPosition} onChange={(e) => setEditJobPosition(e.target.value)} className="border p-2 rounded w-full text-black" placeholder="Job Position" />
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="font-medium text-gray-900">{emp.name}</div>
                                                <div className="text-gray-500 text-sm">{emp.job_position || '-'}</div>
                                            </div>
                                        )}
                                    </td>

                                    {/* Contact */}
                                    <td className="p-4">
                                        {editingId === emp.id ? (
                                            <input value={editWhatsapp} onChange={(e) => setEditWhatsapp(e.target.value)} className="border p-2 rounded w-full text-black" placeholder="WhatsApp" />
                                        ) : (
                                            emp.whatsapp_number && (
                                                <a href={`https://wa.me/${emp.whatsapp_number}`} target="_blank" rel="noopener" className="text-green-600 text-xs hover:underline">
                                                    📱 {emp.whatsapp_number}
                                                </a>
                                            )
                                        )}
                                    </td>

                                    {/* Schedule */}
                                    <td className="p-4">
                                        {editingId === emp.id ? (
                                            <div className="flex items-center space-x-1">
                                                <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} className="border p-1 rounded text-black w-24" />
                                                <span>-</span>
                                                <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} className="border p-1 rounded text-black w-24" />
                                            </div>
                                        ) : (
                                            <span className="text-black text-sm">{emp.work_start_time?.slice(0, 5)} - {emp.work_end_time?.slice(0, 5)}</span>
                                        )}
                                    </td>

                                    {/* Wage */}
                                    <td className="p-4">
                                        {editingId === emp.id ? (
                                            <div className="flex space-x-1">
                                                <select value={editWageType} onChange={(e) => setEditWageType(e.target.value)} className="border p-1 rounded text-black text-sm">
                                                    <option value="monthly">Monthly</option>
                                                    <option value="daily">Daily</option>
                                                </select>
                                                <input type="number" value={editBaseWage} onChange={(e) => setEditBaseWage(Number(e.target.value))} className="border p-1 rounded w-24 text-black text-sm" placeholder="Base" />
                                                <input type="number" value={editOvertimeRate} onChange={(e) => setEditOvertimeRate(Number(e.target.value))} className="border p-1 rounded w-24 text-black text-sm" placeholder="OT Rate" />
                                            </div>
                                        ) : (
                                            <div className="text-sm">
                                                <p className="capitalize text-black">{emp.wage_type}</p>
                                                <p className="text-gray-600">Base: Rp {emp.base_wage?.toLocaleString()}</p>
                                                {emp.overtime_hourly_rate > 0 && <p className="text-gray-500 text-xs">OT: Rp {emp.overtime_hourly_rate.toLocaleString()}/hr</p>}
                                            </div>
                                        )}
                                    </td>

                                    {/* KTP */}
                                    <td className="p-4">
                                        {emp.ktp_url ? (
                                            <a href={emp.ktp_url} target="_blank" rel="noopener" className="text-blue-600 text-xs hover:underline">📄 View KTP</a>
                                        ) : (
                                            <label className="cursor-pointer text-blue-600 text-xs hover:underline">
                                                {uploadingKtpId === emp.id ? 'Uploading...' : '📤 Upload KTP'}
                                                <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleKtpUpload(emp.id, e.target.files[0])} />
                                            </label>
                                        )}
                                    </td>

                                    {/* Actions */}
                                    <td className="p-4 text-right space-x-2">
                                        {editingId === emp.id ? (
                                            <>
                                                <button onClick={saveEdit} className="text-green-600 hover:text-green-800 font-medium">Save</button>
                                                <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700">Cancel</button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => openScanModal(emp.id)} className="text-purple-600 hover:text-purple-800 font-medium">📷 Scan</button>
                                                <button onClick={() => startEdit(emp)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                                            </>
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

            {/* FACE SCAN MODAL */}
            {scanningId && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
                        <div className="bg-purple-600 text-white p-4">
                            <h3 className="text-xl font-bold">Scan Face</h3>
                            <p className="text-sm opacity-80">This will save the face and profile photo.</p>
                        </div>
                        <div className="relative bg-black aspect-video">
                            <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
                            <canvas ref={canvasRef} className="hidden" />
                            {!modelsLoaded && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white">Loading AI Models...</div>
                            )}
                        </div>
                        <div className="p-4 space-y-3">
                            <p className={`text-center font-medium ${scanMessage.includes('✅') ? 'text-green-600' : scanMessage.includes('❌') ? 'text-red-600' : 'text-gray-600'}`}>
                                {scanMessage}
                            </p>
                            <div className="flex space-x-3">
                                <button onClick={captureAndSave} disabled={!modelsLoaded} className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400">
                                    📸 Capture & Save
                                </button>
                                <button onClick={closeScanModal} className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
