import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "teacher" | "student" | "parent" | "school" | "staff";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: AppRole | null;
  profile: { full_name: string; email: string } | null;
  loading: boolean;
  isDemo: boolean;
  // Set of permission_key strings granted to a "staff" (limited-admin) account.
  // Always empty for other roles; a full "admin" implicitly has every permission
  // (see hasPermission below) so this set is only meaningful for role === "staff".
  staffPermissions: Set<string>;
  hasPermission: (permissionKey: string) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role: AppRole, extraData?: Record<string, string>) => Promise<{ data: { user: User | null } | null; error: Error | null }>;
  signOut: () => Promise<void>;
  startDemo: (role: AppRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user for demo mode
const createDemoUser = (role: AppRole): User => {
  const roleNames: Record<AppRole, string> = {
    admin: "أدمن تجريبي",
    school: "مدرسة تجريبية",
    teacher: "معلم تجريبي",
    student: "طالب تجريبي",
    parent: "ولي أمر تجريبي",
    staff: "مشرف تجريبي",
  };

  return {
    id: `demo-${role}-${Date.now()}`,
    email: `demo-${role}@example.com`,
    app_metadata: {},
    user_metadata: { full_name: roleNames[role], role },
    aud: "authenticated",
    created_at: new Date().toISOString(),
  } as User;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [staffPermissions, setStaffPermissions] = useState<Set<string>>(new Set());
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Don't override demo mode
        if (isDemo) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer Supabase calls with setTimeout
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id).then(() => setLoading(false));
          }, 0);
        } else {
          setUserRole(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (isDemo) {
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [isDemo]);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (roleData) {
        setUserRole(roleData.role as AppRole);

        if (roleData.role === "staff") {
          const { data: permData } = await supabase
            .from("staff_permissions" as any)
            .select("permission_key")
            .eq("user_id", userId);
          setStaffPermissions(new Set(((permData || []) as any[]).map((p) => p.permission_key)));
        } else {
          setStaffPermissions(new Set());
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const hasPermission = (permissionKey: string) => {
    if (userRole === "admin") return true;
    if (userRole === "staff") return staffPermissions.has(permissionKey);
    return false;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, role: AppRole, extraData?: Record<string, string>) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: role,
          ...extraData,
        },
      },
    });
    return { data, error };
  };

  const signOut = async () => {
    if (isDemo) {
      setIsDemo(false);
      setUser(null);
      setSession(null);
      setUserRole(null);
      setStaffPermissions(new Set());
      setProfile(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setStaffPermissions(new Set());
    setProfile(null);
  };

  const startDemo = (role: AppRole) => {
    const demoUser = createDemoUser(role);
    const roleNames: Record<AppRole, string> = {
      admin: "أدمن تجريبي",
      school: "مدرسة تجريبية",
      teacher: "معلم تجريبي",
      student: "طالب تجريبي",
      parent: "ولي أمر تجريبي",
      staff: "مشرف تجريبي",
    };

    setIsDemo(true);
    setUser(demoUser);
    setUserRole(role);
    setProfile({
      full_name: roleNames[role],
      email: `demo-${role}@example.com`,
    });
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, userRole, profile, loading, isDemo, staffPermissions, hasPermission, signIn, signUp, signOut, startDemo }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
