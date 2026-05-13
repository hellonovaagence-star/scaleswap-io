"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useUser() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Re-fetch user when profile is updated from another component
    const handleProfileUpdate = () => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) setUser(user);
      });
    };
    window.addEventListener("profile-updated", handleProfileUpdate);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("profile-updated", handleProfileUpdate);
    };
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return { user, loading, signOut };
}
