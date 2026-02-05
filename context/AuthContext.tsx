"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type UserRole = 'superadmin' | 'admin' | 'kiosk' | null;

interface AuthContextType {
    user: any | null;
    role: UserRole;
    login: (username: string, role: 'superadmin' | 'admin' | 'kiosk') => void; // Simplified for prototype
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    login: () => { },
    logout: () => { },
    isLoading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<any | null>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Check local storage for persisted session (simple prototype approach)
        const storedRole = localStorage.getItem('app_role') as UserRole;
        if (storedRole) {
            setRole(storedRole);
            setUser({ username: storedRole }); // Mock user object
        }
        setIsLoading(false);
    }, []);

    const login = (username: string, role: 'superadmin' | 'admin' | 'kiosk') => {
        // In a real app, we would verify password with DB here. 
        // For this prototype, we trust the Page component to verify.
        setRole(role);
        setUser({ username });
        localStorage.setItem('app_role', role);

        if (role === 'admin' || role === 'superadmin') router.push('/admin/dashboard');
        if (role === 'kiosk') router.push('/kiosk');
    };

    const logout = () => {
        setRole(null);
        setUser(null);
        localStorage.removeItem('app_role');
        router.push('/');
    };

    return (
        <AuthContext.Provider value={{ user, role, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
