import React from 'react';
import * as Linking from 'expo-linking';
import { useToast } from './ToastProvider';
import { useTranslation } from 'react-i18next';
import { acceptInvite } from '../services/invites';
import { useHousehold } from '../firebase/providers/HouseholdProvider';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

export default function DeepLinkHandler() {
  const toast = useToast();
  const { t } = useTranslation();
  const { selectHousehold } = useHousehold();
  const processedRef = React.useRef<string | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, () => setReady(true));
    return () => unsub();
  }, []);

  const handleUrl = React.useCallback(async (url: string | null) => {
    if (!url) return;
    try {
      const { hostname, path, queryParams } = Linking.parse(url);
      // Accept both scheme and possible web path; expect /invite or hostname 'invite'
      const isInvite = (path?.startsWith('invite')) || hostname === 'invite';
      if (!isInvite) return;
      const hid = (queryParams?.hid as string) || (queryParams?.householdId as string);
      const inviteId = (queryParams?.inviteId as string) || (queryParams?.id as string);
      const token = queryParams?.token as string;
      const key = `${hid}|${inviteId}|${token}`;
      if (!hid || !inviteId || !token) return;
      if (processedRef.current === key) return; // avoid double-processing
      processedRef.current = key;
      await acceptInvite(hid, inviteId, token);
  toast.show(t('inviteAccepted') || 'Invite accepted', { type: 'success' });
      await selectHousehold(hid);
    } catch (e) {
      // Swallow to avoid UX disruption; a toast is enough
      console.error('[DeepLinkHandler] invite accept failed', e);
  toast.show(t('actionFailed'), { type: 'error' });
    }
  }, [toast, selectHousehold, t]);

  React.useEffect(() => {
    if (!ready) return;
    let sub: { remove: () => void } | null = null;
    (async () => {
      const initial = await Linking.getInitialURL();
      await handleUrl(initial);
      sub = Linking.addEventListener('url', (e) => handleUrl(e.url));
    })();
    return () => {
      if (sub) sub.remove();
    };
  }, [ready, handleUrl]);

  return null;
}
