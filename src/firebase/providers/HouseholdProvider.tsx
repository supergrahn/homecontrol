import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

type HouseholdSummary = { id: string; name?: string | null; role?: 'admin' | 'adult' | 'viewer' | null };

type HouseholdContextValue = {
  householdId: string | null;
  households: HouseholdSummary[];
  loading: boolean;
  selectHousehold: (id: string) => Promise<void>;
};

const HouseholdContext = React.createContext<HouseholdContextValue | undefined>(undefined);

const STORAGE_KEY = '@hc:selected_household';

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const [householdId, setHouseholdId] = React.useState<string | null>(null);
  const [households, setHouseholds] = React.useState<HouseholdSummary[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  const selectHousehold = React.useCallback(async (id: string) => {
    setHouseholdId(id);
    try { await AsyncStorage.setItem(STORAGE_KEY, id); } catch {}
  }, []);

  React.useEffect(() => {
    let unsubUser: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setHouseholds([]);
      setHouseholdId(null);
      if (!user) {
        setLoading(false);
        if (unsubUser) { unsubUser(); unsubUser = null; }
        return;
      }
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      const userRef = doc(db, 'users', user.uid);
      if (unsubUser) { unsubUser(); unsubUser = null; }
  unsubUser = onSnapshot(userRef, (snap) => {
        (async () => {
          try {
            const data = snap.exists() ? (snap.data() as any) : {};
            const ids: string[] = Array.isArray(data.householdIds) ? data.householdIds : [];
            const results = await Promise.all(ids.map(async (id) => {
              try {
                const hSnap = await getDoc(doc(db, 'households', id));
                const name = hSnap.exists() ? (hSnap.data() as any).name ?? null : null;
                let role: 'admin' | 'adult' | 'viewer' | null = null;
                try {
                  const mSnap = await getDoc(doc(db, `households/${id}/members/${user.uid}`));
                  role = mSnap.exists() ? ((mSnap.data() as any).role ?? null) : null;
                } catch {}
                return { id, name, role } as HouseholdSummary;
              } catch {
                return { id, name: null, role: null } as HouseholdSummary;
              }
            }));
            const memberHouseholds = results.filter(h => !!h.role);
            setHouseholds(memberHouseholds);
            if (memberHouseholds.length > 0) {
              const memberIds = memberHouseholds.map(h => h.id);
              const current = saved || householdId;
              const next = current && memberIds.includes(current) ? current : memberIds[0];
              setHouseholdId(next);
              if (saved !== next) {
                try { await AsyncStorage.setItem(STORAGE_KEY, next); } catch {}
              }
            } else {
              setHouseholdId(null);
            }
          } catch (e) {
            // Avoid crashing snapshot listener
            console.warn('[HouseholdProvider] snapshot error', e);
          } finally {
            setLoading(false);
          }
        })();
      }, (error) => {
        console.warn('[HouseholdProvider] user snapshot error', error);
        setLoading(false);
      });
    });
    return () => { if (unsubUser) unsubUser(); unsubAuth(); };
  }, [householdId]);

  const value = React.useMemo(() => ({ householdId, households, loading, selectHousehold }), [householdId, households, loading, selectHousehold]);
  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold() {
  const ctx = React.useContext(HouseholdContext);
  if (!ctx) throw new Error('useHousehold must be used within HouseholdProvider');
  return ctx;
}
