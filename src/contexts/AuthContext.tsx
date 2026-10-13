import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { clearQueryCache, clearRoleLocalStorage } from '@/lib/queryConfig';
import { roleBasePath } from '@/config/nav';
import type { Profile, UserRole } from '@/types/database';

// ============================================
// TYPES
// ============================================

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    session: Session | null;
    role: UserRole | null;
    isLoading: boolean;
    profileLoading: boolean;
    /** True once both session AND profile fetch have completed (even if profile is null). */
    isBootstrapped: boolean;
    error: string | null;
    isAuthenticated: boolean;
    isSuperAdmin: boolean;
    isTeacher: boolean;
    isStudent: boolean;
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null; session: Session | null }>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
    updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
    redirectByRole: (role: UserRole | null) => void;
    retryProfileFetch: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// CONSTANTS
// ============================================

const PROFILE_FETCH_TIMEOUT = 5000; // 5 seconds
const MAX_RETRIES = 1;
const isDev = import.meta.env.DEV;

// Dev logging helper
const devLog = (message: string, data?: unknown) => {
    if (isDev) {
        console.log(`[Auth] ${message}`, data !== undefined ? data : '');
    }
};

// ============================================
// PROVIDER
// ============================================

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(false);
    const [isBootstrapped, setIsBootstrapped] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Refs to prevent duplicate operations
    const initStartedRef = useRef(false);
    const listenerSetRef = useRef(false);
    const sessionRef = useRef<Session | null>(null);
    const initCompletedRef = useRef(false);

    const navigate = useNavigate();

    // ============================================
    // PROFILE FETCH WITH TIMEOUT + RETRY
    // ============================================

    const fetchProfileWithTimeout = useCallback(async (
        userId: string,
        retryCount = 0
    ): Promise<Profile | null> => {
        const startTime = Date.now();
        devLog(`Fetching profile for user: ${userId}, attempt: ${retryCount + 1}`);

        const timeoutPromise = new Promise<null>((_, reject) => {
            setTimeout(() => reject(new Error('Profile fetch timeout')), PROFILE_FETCH_TIMEOUT);
        });

        const fetchPromise = (async () => {
            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (fetchError) {
                devLog(`Profile fetch error: ${fetchError.message}`);

                // Try to create profile if it doesn't exist
                if (fetchError.code === 'PGRST116') {
                    devLog('Profile not found, creating default profile');
                    const { data: userData } = await supabase.auth.getUser();
                    const newProfile = {
                        id: userId,
                        email: userData.user?.email || '',
                        full_name: userData.user?.user_metadata?.full_name || null,
                        role: (userData.user?.user_metadata?.role as UserRole) || 'student',
                        is_active: true,
                    };

                    const { data: insertedProfile, error: insertError } = await (supabase
                        .from('profiles') as any)
                        .insert(newProfile)
                        .select()
                        .single();

                    if (insertError) {
                        devLog(`Profile creation error: ${insertError.message}`);
                        throw new Error(insertError.message);
                    }

                    return insertedProfile as Profile;
                }

                throw new Error(fetchError.message);
            }

            return data as Profile;
        })();

        try {
            const result = await Promise.race([fetchPromise, timeoutPromise]);
            const duration = Date.now() - startTime;
            devLog(`Profile fetch completed in ${duration}ms`, result?.role);
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            devLog(`Profile fetch failed: ${errorMessage}`);

            // Retry once
            if (retryCount < MAX_RETRIES) {
                devLog('Retrying profile fetch...');
                return fetchProfileWithTimeout(userId, retryCount + 1);
            }

            throw err;
        }
    }, []);

    // ============================================
    // REDIRECT BY ROLE
    // ============================================

    const redirectByRole = useCallback((role: UserRole | null) => {
        const destination = role ? (roleBasePath[role] ?? '/') : '/';
        devLog(`Redirecting to: ${destination}`);
        navigate(destination, { replace: true });
    }, [navigate]);

    // ============================================
    // RETRY PROFILE FETCH
    // ============================================

    const retryProfileFetch = useCallback(async () => {
        if (!user) return;

        setProfileLoading(true);
        setError(null);

        try {
            const profileData = await fetchProfileWithTimeout(user.id);
            setProfile(profileData);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load profile';
            setError(message);
        } finally {
            setProfileLoading(false);
        }
    }, [user, fetchProfileWithTimeout]);

    // ============================================
    // INITIALIZATION
    // ============================================

    useEffect(() => {
        if (initStartedRef.current) return;
        initStartedRef.current = true;

        let mounted = true;
        devLog('Auth initialization started');

        const init = async () => {
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                devLog('Got session', currentSession?.user?.id);

                if (!mounted) return;

                setSession(currentSession);
                sessionRef.current = currentSession;
                setUser(currentSession?.user ?? null);

                if (currentSession?.user) {
                    setProfileLoading(true);
                    try {
                        const profileData = await fetchProfileWithTimeout(currentSession.user.id);
                        if (mounted) {
                            setProfile(profileData);
                            devLog('Profile loaded', profileData?.role);
                        }
                    } catch (err) {
                        if (mounted) {
                            const message = err instanceof Error ? err.message : 'Failed to load profile';
                            setError(message);
                            devLog('Profile load failed', message);
                        }
                    } finally {
                        if (mounted) setProfileLoading(false);
                    }
                }
            } catch (err) {
                devLog('Auth init error', err);
            } finally {
                if (mounted) {
                    setIsLoading(false);
                    setIsBootstrapped(true);
                    initCompletedRef.current = true;
                }
            }
        };

        init();

        // Listen for auth changes (only once)
        if (!listenerSetRef.current) {
            listenerSetRef.current = true;

            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
                devLog(`Auth state change: ${event}`, newSession?.user?.id);

                if (!mounted) return;

                // Reset bootstrapped on sign out
                if (event === 'SIGNED_OUT') {
                    setSession(null);
                    sessionRef.current = null;
                    setUser(null);
                    setProfile(null);
                    setError(null);
                    setIsLoading(false);
                    setIsBootstrapped(true); // bootstrapped = we know user is logged out
                    return;
                }

                // Skip INITIAL_SESSION — init() already handles the first profile fetch
                if (event === 'INITIAL_SESSION') {
                    return;
                }

                // During init, skip SIGNED_IN too — init() handles it via getSession()
                if (!initCompletedRef.current && event === 'SIGNED_IN') {
                    devLog('Skipping SIGNED_IN during init (init handles first fetch)');
                    return;
                }

                // Optimization: Ignore session updates if token hasn't changed
                if (newSession?.access_token === sessionRef.current?.access_token) {
                    return;
                }

                setSession(newSession);
                sessionRef.current = newSession;
                setUser(newSession?.user ?? null);

                if (newSession?.user && event === 'SIGNED_IN') {
                    setProfileLoading(true);
                    setIsBootstrapped(false); // Fetching new profile → not bootstrapped yet

                    try {
                        const profileData = await fetchProfileWithTimeout(newSession.user.id);
                        if (mounted) {
                            setProfile(profileData);
                        }
                    } catch (err) {
                        if (mounted) {
                            const message = err instanceof Error ? err.message : 'Failed to load profile';
                            setError(message);
                        }
                    } finally {
                        if (mounted) {
                            setProfileLoading(false);
                            setIsBootstrapped(true);
                        }
                    }
                }

                setIsLoading(false);
            });

            return () => {
                mounted = false;
                subscription.unsubscribe();
            };
        }

        return () => {
            mounted = false;
        };
    }, [fetchProfileWithTimeout]);

    // ============================================
    // AUTH FUNCTIONS
    // ============================================

    const signIn = async (email: string, password: string) => {
        devLog('Sign in attempt', email);

        // Clear any stale role state from a previous session before we log in
        clearRoleLocalStorage();

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (signInError) {
            devLog('Sign in error', signInError.message);
        }

        return { error: signInError };
    };

    const signUp = async (email: string, password: string, fullName: string) => {
        devLog('Sign up attempt', email);

        const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    // role: 'student', // Let DB default handle this to avoid trigger casting errors
                },
            },
        });

        if (signUpError) {
            devLog('Sign up error', signUpError.message);
        }

        // The session is the whole point: with email confirmation off Supabase
        // returns one immediately, so the caller can continue straight into
        // onboarding instead of bouncing through /login. With confirmation on
        // it is null, and the caller shows the "check your inbox" screen. That
        // makes the Supabase setting a config change, not a code change.
        return { error: signUpError, session: data?.session ?? null };
    };

    const signOut = async () => {
        devLog('Sign out');
        // Clear all cached query data and role-specific storage first
        clearQueryCache();
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setSession(null);
        setError(null);
        setIsBootstrapped(true);
        navigate('/login', { replace: true });
    };

    const resetPassword = async (email: string) => {
        devLog('Reset password request', email);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        return { error };
    };

    const updatePassword = async (newPassword: string) => {
        devLog('Update password');

        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        return { error };
    };

    const clearError = () => setError(null);

    // ============================================
    // DERIVED STATE
    // ============================================

    const role = profile?.role ?? null;
    const isAuthenticated = !!user;
    const isSuperAdmin = role === 'super_admin';
    const isTeacher = role === 'teacher';
    const isStudent = role === 'student';

    // ============================================
    // MEMOIZED VALUE
    // ============================================

    const value = useMemo(() => ({
        user,
        profile,
        session,
        role,
        isLoading,
        profileLoading,
        isBootstrapped,
        error,
        isAuthenticated,
        isSuperAdmin,
        isTeacher,
        isStudent,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        redirectByRole,
        retryProfileFetch,
        refreshProfile: retryProfileFetch,
        clearError,
    }), [
        user,
        profile,
        session,
        role,
        isLoading,
        profileLoading,
        isBootstrapped,
        error,
        isAuthenticated,
        isSuperAdmin,
        isTeacher,
        isStudent,
        redirectByRole,
        retryProfileFetch
    ]);

    // ============================================
    // RENDER
    // ============================================

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// ============================================
// HOOK
// ============================================

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
