import type { User } from 'firebase/auth';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
import { useTheme } from '../theme';
import { SYNC_LABEL, SyncStatus } from '../types';

interface Props {
  user: User | null;
  sync: SyncStatus;
  /** Explication affichée quand la synchronisation ne fonctionne pas. */
  syncDetail?: string | null;
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

type FormMode = 'login' | 'signup' | 'reset';

export function AccountScreen({
  user,
  sync,
  syncDetail,
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
          <Text style={{ color: theme.muted, fontSize: 12, textTransform: 'uppercase', fontWeight: '600' }}>Connecté</Text>
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
  content: { padding: 16, gap: 12, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 4 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  danger: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10, marginTop: 16 },
});
