import React from 'react';
import { View, Text, TouchableOpacity, Button, TextInput, Alert, Share, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useHousehold } from '../firebase/providers/HouseholdProvider';
import { createHousehold, updateHouseholdSettings } from '../services/households';
import { leaveHousehold } from '../services/members';
import { deleteHouseholdRecursive } from '../services/functions';
import { useToast } from '../components/ToastProvider';
import { createInvite as createInviteFn } from '../services/invites';
import { listInvites, revokeInvite, type Invite } from '../services/invites';
import { getUserSettings, updateUserSettings } from '../services/users';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { householdId, households, selectHousehold } = useHousehold();
  const [name, setName] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<'adult' | 'viewer'>('adult');
  const [invites, setInvites] = React.useState<Invite[]>([]);
  const [qhStart, setQhStart] = React.useState('21:00');
  const [qhEnd, setQhEnd] = React.useState('07:00');
  const [qhTz, setQhTz] = React.useState<string | undefined>(undefined);
  const [notifEnabled, setNotifEnabled] = React.useState<boolean>(true);
  const toast = useToast();
  const currentHousehold = households.find(h => h.id === householdId);
  const isAdmin = currentHousehold?.role === 'admin';
  const [hhTz, setHhTz] = React.useState<string>('');
  const [hhHour, setHhHour] = React.useState<string>('7');
  React.useEffect(() => {
    (async () => {
      try {
        if (householdId && households.find(h => h.id === householdId)?.role === 'admin') {
          setInvites(await listInvites(householdId));
        } else {
          setInvites([]);
        }
      } catch {}
  // Load quiet hours
      try {
        const s = await getUserSettings();
        if (s.quietHours?.start) setQhStart(s.quietHours.start);
        if (s.quietHours?.end) setQhEnd(s.quietHours.end);
        if (s.quietHours?.tz) setQhTz(s.quietHours.tz);
        if (typeof s.notificationsEnabled === 'boolean') setNotifEnabled(s.notificationsEnabled);
      } catch {}
      // Prefill household settings (read-only via provider; fetch doc lazily for timezone/hour)
      try {
        if (householdId) {
          // Light fetch to prefill
          const res = await fetch(`data:text/plain,`);
          // No network available in this environment; keep fields blank for manual entry
        }
      } catch {}
    })();
  }, [householdId, households]);
  return (
    <View style={{ flex:1, padding:16 }}>
  <Text style={{ fontSize:18, fontWeight:'600', marginBottom:12 }}>{t('selectHousehold')}</Text>
      {households.map(h => (
        <View key={h.id} style={{ paddingVertical:10, borderBottomWidth: 1, borderBottomColor:'#eee' }}>
          <TouchableOpacity onPress={() => selectHousehold(h.id)}>
            <Text style={{ fontWeight: h.id === householdId ? '700' : '400' }}>
              {(h.name || h.id)} {h.role ? `· ${t(`role.${h.role}`)}` : ''}
            </Text>
          </TouchableOpacity>
          <View style={{ flexDirection:'row', gap:8, marginTop:6 }}>
            {h.role === 'admin' ? (
              <Button title={t('delete')} color="#b00020" onPress={() => {
                Alert.alert(t('deleteHouseholdTitle'), t('deleteHouseholdConfirm'), [
                  { text: t('cancel'), style: 'cancel' },
                  { text: t('delete'), style: 'destructive', onPress: async () => {
                    try { await deleteHouseholdRecursive(h.id); toast.show(t('householdDeleted'), { type: 'success' }); }
                    catch (e) { console.error(e); toast.show(t('actionFailed'), { type: 'error' }); }
                  } },
                ]);
              }} />
            ) : (
              <Button title={t('leave')} color="#b00020" onPress={() => {
                Alert.alert(t('leaveHouseholdTitle'), t('leaveHouseholdConfirm'), [
                  { text: t('cancel'), style: 'cancel' },
                  { text: t('leave'), style: 'destructive', onPress: async () => {
                    try { await leaveHousehold(h.id); toast.show(t('leftHousehold'), { type: 'success' }); }
                    catch (e) { console.error(e); toast.show(t('actionFailed'), { type: 'error' }); }
                  } },
                ]);
              }} />
            )}
          </View>
        </View>
      ))}
      <View style={{ height: 16 }} />
  <Text style={{ fontSize:16, fontWeight:'600', marginBottom:8 }}>{t('createHousehold')}</Text>
      <TextInput
        placeholder={t('householdName')}
        value={name}
        onChangeText={setName}
        style={{ borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:10, marginBottom:8 }}
      />
      <Button
        title={saving ? '…' : t('createHousehold')}
        disabled={!name.trim() || saving}
        onPress={async () => {
          try {
            setSaving(true);
            const id = await createHousehold(name.trim());
            setName('');
            await selectHousehold(id);
          } catch (e) {
            console.error('Create household failed', e);
          } finally {
            setSaving(false);
          }
        }}
      />
  {/* Quiet hours */}
      <View style={{ height: 24 }} />
  <Text style={{ fontSize:16, fontWeight:'600', marginBottom:8 }}>{t('quietHours') || 'Quiet hours'}</Text>
      <View style={{ flexDirection:'row', alignItems:'center', marginBottom:8 }}>
        <Text style={{ marginRight:8 }}>{t('notifications') || 'Notifications'}</Text>
        <Switch value={notifEnabled} onValueChange={async (val) => {
          setNotifEnabled(val);
          try { await updateUserSettings({ notificationsEnabled: val }); } catch {}
        }} />
      </View>
      <View style={{ flexDirection:'row', gap:8 }}>
        <TextInput
          placeholder="21:00"
          value={qhStart}
          onChangeText={setQhStart}
          style={{ flex:1, borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:10 }}
        />
        <TextInput
          placeholder="07:00"
          value={qhEnd}
          onChangeText={setQhEnd}
          style={{ flex:1, borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:10 }}
        />
      </View>
      <TextInput
        placeholder={t('timezoneOptional') || 'Europe/Oslo (optional)'}
        value={qhTz || ''}
        onChangeText={setQhTz}
        autoCapitalize="none"
        style={{ borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:10, marginTop:8 }}
      />
      <View style={{ marginTop:8 }}>
        <Button
          title={t('saveQuietHours') || 'Save quiet hours'}
          onPress={async () => {
            try {
              const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
              if (!timeRe.test(qhStart) || !timeRe.test(qhEnd)) {
                toast.show(t('invalidTime') || 'Enter time as HH:mm (00-23:59).', { type: 'error' });
                return;
              }
              if (qhTz && !qhTz.includes('/')) {
                toast.show(t('invalidTimezone') || 'Enter a valid IANA timezone like Europe/Oslo.', { type: 'error' });
                return;
              }
              await updateUserSettings({ quietHours: { start: qhStart, end: qhEnd, tz: qhTz } });
              toast.show(t('saved') || 'Saved', { type: 'success' });
            } catch (e) {
              console.error(e);
              toast.show(t('actionFailed'), { type: 'error' });
            }
          }}
        />
      </View>

      {/* Household settings (admin) */}
      {!!householdId && isAdmin ? (
        <>
          <View style={{ height: 24 }} />
          <Text style={{ fontSize:16, fontWeight:'600', marginBottom:8 }}>{t('householdSettings') || 'Household settings'}</Text>
          <TextInput
            placeholder={t('timezoneOptional') || 'Europe/Oslo (optional)'}
            value={hhTz}
            onChangeText={setHhTz}
            autoCapitalize="none"
            style={{ borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:10, marginBottom:8 }}
          />
          <TextInput
            placeholder={t('digestHour') || 'Digest hour (0-23)'}
            value={hhHour}
            onChangeText={setHhHour}
            keyboardType="number-pad"
            style={{ borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:10, marginBottom:8 }}
          />
          <Button title={t('save') || 'Save'} onPress={async () => {
            try {
              if (hhTz && !hhTz.includes('/')) {
                toast.show(t('invalidTimezone') || 'Enter a valid IANA timezone like Europe/Oslo.', { type: 'error' });
                return;
              }
              const hourNum = Number(hhHour);
              if (Number.isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
                toast.show(t('invalidHour') || 'Enter an hour 0-23.', { type: 'error' });
                return;
              }
              await updateHouseholdSettings(householdId, { timezone: hhTz || undefined, digestHour: hourNum });
              toast.show(t('saved') || 'Saved', { type: 'success' });
            } catch (e) {
              console.error(e);
              toast.show(t('actionFailed'), { type: 'error' });
            }
          }} />
        </>
      ) : null}
      {/* Admin-only: Create invite */}
      {!!householdId && (households.find(h => h.id === householdId)?.role === 'admin') ? (
        <>
          <View style={{ height: 24 }} />
          <Text style={{ fontSize:16, fontWeight:'600', marginBottom:8 }}>{t('invites') || 'Invites'}</Text>
          <TextInput
            placeholder={t('email')}
            value={inviteEmail}
            onChangeText={setInviteEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:10, marginBottom:8 }}
          />
          <View style={{ flexDirection:'row', gap:8, marginBottom:8 }}>
            <Button title={(t('role.adult') as string) || 'adult'} onPress={() => setInviteRole('adult')} color={inviteRole==='adult'?'#111':'#888'} />
            <Button title={(t('role.viewer') as string) || 'viewer'} onPress={() => setInviteRole('viewer')} color={inviteRole==='viewer'?'#111':'#888'} />
          </View>
          <Button title={t('createInvite') || 'Create invite'} onPress={async () => {
            try {
              if (!inviteEmail.trim()) return;
              const res = await createInviteFn(householdId, inviteEmail.trim(), inviteRole);
              setInviteEmail('');
              setInviteRole('adult');
              toast.show(t('inviteCreated') || 'Invite created', { type: 'success' });
              // Offer share of a deep link immediately
              if (res?.inviteId && res?.token) {
                const link = `homecontrol://invite?hid=${encodeURIComponent(householdId)}&inviteId=${encodeURIComponent(res.inviteId)}&token=${encodeURIComponent(res.token)}`;
                try { await Share.share({ message: link }); } catch {}
              }
              // Refresh invites list
              try { setInvites(await listInvites(householdId)); } catch {}
            } catch (e) {
              console.error(e);
              toast.show(t('actionFailed'), { type: 'error' });
            }
          }} />

          {/* Existing invites */}
          <View style={{ marginTop: 16 }}>
            {invites.length === 0 ? (
              <Text style={{ color:'#666' }}>{t('noInvites') || 'No invites yet.'}</Text>
            ) : invites.map(inv => (
              <View key={inv.id} style={{ paddingVertical:8, borderBottomWidth:1, borderBottomColor:'#eee', flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                <Text>{inv.email} · {t(`role.${inv.role}`)} · {t(`invite.status.${inv.status}`)}</Text>
                {inv.status === 'pending' ? (
                  <View style={{ flexDirection:'row', gap:8 }}>
                    <Button title={t('revoke') || 'Revoke'} onPress={async () => {
                      try { await revokeInvite(householdId, inv.id); setInvites(await listInvites(householdId)); } catch {}
                    }} />
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}
