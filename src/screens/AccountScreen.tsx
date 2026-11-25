import type { User } from 'firebase/auth';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Text } from '../components/Text';
import {
  authErrorMessage,
  canUseGoogle,
  resetPassword,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  usesPassword,
} from '../auth';
import { Button } from '../components/Button';
import { APP_NAME } from '../config';
import { confirmAction } from '../dialog';
import { Household, MAX_MEMBERS, canLeave, listMembers } from '../householdLogic';
import { fonts, MAX_WIDTH, radius, useTheme } from '../theme';
import { SYNC_LABEL, SyncStatus } from '../types';

interface Props {
  user: User | null;
  sync: SyncStatus;
  /** Explication affichée quand la synchronisation ne fonctionne pas. */
  syncDetail?: string | null;
  /** undefined = en cours de chargement, null = aucun foyer. */
  household?: Household | null;
  onCreateHousehold: () => Promise<void>;
  onJoinHousehold: (code: string) => Promise<void>;
  onLeaveHousehold: (h: Household) => Promise<void>;
  onRemoveMember: (h: Household, uid: string) => Promise<void>;
  onRegenerateCode: (h: Household) => Promise<unknown>;
  onBack: () => void;
  onPrivacy: () => void;
  /** Appelé juste avant une tentative de connexion (prépare la fusion des produits de l'appareil). */
  onAuthStart: () => Promise<void>;
  /** Appelé si la tentative échoue ou est annulée. */
  onAuthFail: () => Promise<void>;
  onSignedIn: () => void;
  onSignOut: () => void;
  onDeleteAccount: (password?: string) => Promise<void>;
}

/** Adresse du site, ajoutée au message d'invitation à un foyer. */
const APP_URL = 'https://croquvite.vercel.app';

type FormMode = 'login' | 'signup' | 'reset';

export function AccountScreen({
  user,
  sync,
  syncDetail,
  household,
  onCreateHousehold,
  onJoinHousehold,
  onLeaveHousehold,
  onRemoveMember,
  onRegenerateCode,
  onBack,
  onPrivacy,
  onAuthStart,
  onAuthFail,
  onSignedIn,
  onSignOut,
  onDeleteAccount,
}: Props) {
  const theme = useTheme();
  const [mode, setMode] = useState<FormMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [homeBusy, setHomeBusy] = useState(false);
  const [homeError, setHomeError] = useState<string | null>(null);

  const inputStyle = [styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }];

  const authenticate = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    await onAuthStart();
    try {
      await action();
      onSignedIn();
    } catch (e) {
      await onAuthFail();
      const message = authErrorMessage(e);
      if (message) setError(message);
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (mode === 'signup') void authenticate(() => signUpWithEmail(email, password));
    else if (mode === 'login') void authenticate(() => signInWithEmail(email, password));
  };

  const sendReset = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await resetPassword(email);
      setInfo('Si un compte existe avec cette adresse, un e-mail de réinitialisation vient d’être envoyé.');
    } catch (e) {
      const message = authErrorMessage(e);
      if (message) setError(message);
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    setBusy(true);
    setError(null);
    try {
      await onDeleteAccount(deletePassword || undefined);
    } catch (e) {
      const message = authErrorMessage(e);
      if (message) setError(message);
      setBusy(false);
    }
  };

  /** Exécute une action du foyer en gérant l'attente et l'erreur affichée dans la carte « Foyer ». */
  const runHome = async (action: () => Promise<unknown>) => {
    setHomeBusy(true);
    setHomeError(null);
    try {
      await action();
    } catch (e) {
      const message = authErrorMessage(e);
      if (message) setHomeError(message);
    } finally {
      setHomeBusy(false);
    }
  };

  const shareCode = async (code: string) => {
    const message = `Rejoins mon foyer sur ${APP_NAME} : ouvre ${APP_URL}, crée ton compte, puis Mon compte > Foyer > saisis le code ${code}`;
    try {
      await Share.share({ message });
    } catch {
      setHomeError(`Partage impossible ici. Donnez ce code à la personne : ${code}`);
    }
  };

  const renderHousehold = (me: User) => {
    const card = (children: React.ReactNode) => (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, gap: 8 }]}>
        <Text display style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>Foyer</Text>
        {children}
        {homeError ? <Text style={{ color: theme.danger }}>{homeError}</Text> : null}
      </View>
    );

    if (household === undefined) {
      return card(
        <Text style={{ color: theme.muted }}>
          {sync === 'error' ? 'Disponible dès que la synchronisation fonctionne.' : 'Chargement…'}
        </Text>,
      );
    }

    if (household === null) {
      return card(
        <>
          <Text style={{ color: theme.text, fontWeight: '600' }}>Partager avec votre famille</Text>
          <Text style={{ color: theme.muted }}>
            Un foyer partage le même frigo et la même liste de courses entre plusieurs personnes, chacune avec son propre
            compte. Les produits déjà présents sur cet appareil sont ajoutés au foyer.
          </Text>
          <Button
            title={homeBusy ? 'Un instant…' : 'Créer un foyer'}
            disabled={homeBusy}
            onPress={() => void runHome(onCreateHousehold)}
          />
          <Text style={{ color: theme.muted, textAlign: 'center' }}>ou rejoindre un foyer existant</Text>
          <TextInput
            style={inputStyle}
            value={joinCode}
            onChangeText={setJoinCode}
            placeholder="Code d’invitation (ex. K7QM-4XW9)"
            placeholderTextColor={theme.muted}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Button
            title={homeBusy ? 'Un instant…' : 'Rejoindre'}
            variant="secondary"
            disabled={homeBusy || joinCode.trim().length === 0}
            onPress={() => void runHome(() => onJoinHousehold(joinCode))}
          />
        </>,
      );
    }

    const iAmOwner = household.ownerUid === me.uid;
    const members = listMembers(household, me.uid);
    return card(
      <>
        <Text style={{ color: theme.muted }}>
          Tous les membres voient et modifient les mêmes produits et la même liste de courses.
        </Text>

        <Text style={[styles.label, { color: theme.muted }]}>Code d’invitation</Text>
        <Text selectable style={{ color: theme.text, fontSize: 24, fontWeight: '800', letterSpacing: 2 }}>
          {household.code}
        </Text>
        <Button title="Partager le code" variant="secondary" onPress={() => void shareCode(household.code)} />
        {iAmOwner && (
          <Button
            title="Générer un nouveau code"
            variant="secondary"
            disabled={homeBusy}
            onPress={() =>
              confirmAction(
                'Nouveau code ?',
                'L’ancien code ne fonctionnera plus. Les membres actuels ne sont pas affectés.',
                'Générer',
                () => void runHome(() => onRegenerateCode(household)),
                false,
              )
            }
          />
        )}

        <Text style={[styles.label, { color: theme.muted }]}>
          Membres ({members.length}/{MAX_MEMBERS})
        </Text>
        {members.map((m) => (
          <View key={m.uid} style={styles.memberRow}>
            <Text style={{ color: theme.text, flex: 1 }}>
              {m.name}
              {m.me ? ' (vous)' : ''}
              {m.owner ? ' · administrateur' : ''}
            </Text>
            {iAmOwner && !m.me && (
              <Pressable
                disabled={homeBusy}
                hitSlop={8}
                onPress={() =>
                  confirmAction(
                    `Retirer ${m.name} ?`,
                    'Cette personne n’aura plus accès au foyer. Le code d’invitation sera renouvelé.',
                    'Retirer',
                    () => void runHome(() => onRemoveMember(household, m.uid)),
                  )
                }
              >
                <Text style={{ color: theme.danger, fontWeight: '600' }}>Retirer</Text>
              </Pressable>
            )}
          </View>
        ))}

        {canLeave(household, me.uid) ? (
          <Button
            title={members.length <= 1 ? 'Supprimer le foyer' : 'Quitter le foyer'}
            variant="danger"
            disabled={homeBusy}
            onPress={() =>
              confirmAction(
                members.length <= 1 ? 'Supprimer le foyer ?' : 'Quitter le foyer ?',
                members.length <= 1
                  ? 'Le foyer et son code seront supprimés. Vos produits restent dans votre compte.'
                  : 'Vous gardez une copie des produits sur votre compte. Les autres membres conservent le foyer.',
                members.length <= 1 ? 'Supprimer' : 'Quitter',
                () => void runHome(() => onLeaveHousehold(household)),
              )
            }
          />
        ) : (
          <Text style={{ color: theme.muted, fontSize: 12 }}>
            Vous êtes l’administrateur : retirez d’abord les autres membres pour pouvoir quitter ou supprimer le foyer.
          </Text>
        )}
      </>,
    );
  };

  const shell = (children: React.ReactNode) => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ backgroundColor: theme.bg }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ------------------------------------------------------------------ connecté
  if (user) {
    const needsPassword = usesPassword(user);
    return shell(
      <>
        <Text style={[styles.title, { color: theme.text }]}>Mon compte</Text>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '600' }}>Connecté</Text>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>{user.email ?? 'Compte sans e-mail'}</Text>
          <Text style={{ color: sync === 'error' ? theme.danger : sync === 'ok' ? theme.ok : theme.muted }}>
            ☁ {SYNC_LABEL[sync]}
          </Text>
          {syncDetail && sync !== 'ok' ? (
            <Text style={{ color: sync === 'error' ? theme.danger : theme.warn, fontSize: 13 }}>{syncDetail}</Text>
          ) : null}
        </View>

        <Text style={{ color: theme.muted }}>
          Vos produits et votre liste de courses sont synchronisés sur tous les appareils où vous vous connectez avec ce
          compte. Les rappels d’expiration sont planifiés sur chaque téléphone.
        </Text>

        {renderHousehold(user)}

        <Button title="Se déconnecter" variant="secondary" onPress={onSignOut} />
        <Button title="Politique de confidentialité" variant="secondary" onPress={onPrivacy} />
        <Button title="Retour" variant="secondary" onPress={onBack} />

        <View style={[styles.danger, { borderColor: theme.danger }]}>
          <Text style={{ color: theme.danger, fontWeight: '700' }}>Zone sensible</Text>
          <Text style={{ color: theme.muted }}>
            La suppression efface définitivement votre compte et tous vos produits enregistrés en ligne.
          </Text>
          {confirmingDelete ? (
            <>
              {needsPassword && (
                <TextInput
                  style={inputStyle}
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  placeholder="Votre mot de passe (confirmation)"
                  placeholderTextColor={theme.muted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="current-password"
                />
              )}
              {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
              <Button
                title={busy ? 'Suppression…' : 'Confirmer la suppression définitive'}
                variant="danger"
                disabled={busy}
                onPress={() => void deleteAccount()}
              />
              <Button
                title="Annuler"
                variant="secondary"
                onPress={() => {
                  setConfirmingDelete(false);
                  setError(null);
                  setDeletePassword('');
                }}
              />
            </>
          ) : (
            <Button title="Supprimer mon compte et mes données" variant="danger" onPress={() => setConfirmingDelete(true)} />
          )}
        </View>
      </>,
    );
  }

  // ---------------------------------------------------------------- déconnecté
  const title = mode === 'signup' ? 'Créer mon compte' : mode === 'login' ? 'Se connecter' : 'Mot de passe oublié';

  return shell(
    <>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={{ color: theme.muted }}>
        Gratuit. Retrouvez vos produits sur votre téléphone et votre ordinateur. Ceux déjà scannés sur cet appareil sont
        ajoutés automatiquement à votre compte.
      </Text>

      {mode !== 'reset' && canUseGoogle && (
        <>
          <Button
            title="Continuer avec Google"
            variant="secondary"
            disabled={busy}
            onPress={() => void authenticate(() => signInWithGoogle())}
          />
          <Text style={{ color: theme.muted, textAlign: 'center' }}>ou avec votre e-mail</Text>
        </>
      )}
      {mode !== 'reset' && !canUseGoogle && (
        <Text style={{ color: theme.muted, fontSize: 12 }}>
          La connexion avec Google est disponible sur le site web. Ici, utilisez votre e-mail.
        </Text>
      )}

      <Text style={[styles.label, { color: theme.muted }]}>Adresse e-mail</Text>
      <TextInput
        style={inputStyle}
        value={email}
        onChangeText={setEmail}
        placeholder="vous@exemple.fr"
        placeholderTextColor={theme.muted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
      />

      {mode !== 'reset' && (
        <>
          <Text style={[styles.label, { color: theme.muted }]}>Mot de passe</Text>
          <TextInput
            style={inputStyle}
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
            placeholder={mode === 'signup' ? '6 caractères minimum' : 'Votre mot de passe'}
            placeholderTextColor={theme.muted}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
        </>
      )}

      {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
      {info ? <Text style={{ color: theme.ok }}>{info}</Text> : null}

      {mode === 'reset' ? (
        <Button title={busy ? 'Envoi…' : 'Envoyer le lien'} disabled={busy} onPress={() => void sendReset()} />
      ) : (
        <Button
          title={busy ? 'Un instant…' : mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
          disabled={busy}
          onPress={submit}
        />
      )}

      <View style={styles.links}>
        {mode !== 'signup' && (
          <Link label="Créer un compte" onPress={() => { setMode('signup'); setError(null); setInfo(null); }} color={theme.primary} />
        )}
        {mode !== 'login' && (
          <Link label="J’ai déjà un compte" onPress={() => { setMode('login'); setError(null); setInfo(null); }} color={theme.primary} />
        )}
        {mode !== 'reset' && (
          <Link label="Mot de passe oublié" onPress={() => { setMode('reset'); setError(null); setInfo(null); }} color={theme.primary} />
        )}
      </View>

      <Text style={{ color: theme.muted, fontSize: 12 }}>
        En continuant, vous acceptez notre{' '}
        <Text style={{ color: theme.primary, textDecorationLine: 'underline' }} onPress={onPrivacy}>
          politique de confidentialité
        </Text>
        .
      </Text>

      <Button title="Continuer sans compte" variant="secondary" onPress={onBack} />
    </>,
  );
}

function Link({ label, onPress, color }: { label: string; onPress: () => void; color: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={{ color, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 56, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.4 },
  label: { fontSize: 14, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: radius.control, paddingHorizontal: 16, minHeight: 52, fontSize: 16, fontFamily: fonts.body },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  card: { borderRadius: radius.sheet, padding: 18, gap: 6, borderWidth: 0 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  danger: { borderWidth: 1, borderRadius: radius.sheet, padding: 18, gap: 10, marginTop: 16 },
});
