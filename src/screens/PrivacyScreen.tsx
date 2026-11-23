import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Button } from '../components/Button';
import { APP_NAME, CONTACT_EMAIL, CONTROLLER_NAME } from '../config';
import { useTheme } from '../theme';

interface Props {
  onBack: () => void;
}

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'Qui est responsable ?',
    body: [`${APP_NAME} est édité par ${CONTROLLER_NAME}. Contact : ${CONTACT_EMAIL}.`],
  },
  {
    title: 'Sans compte',
    body: [
      'Si vous n’avez pas de compte, vos produits et votre liste de courses restent uniquement sur votre appareil (stockage local). Nous n’y avons pas accès.',
    ],
  },
  {
    title: 'Avec un compte : données enregistrées',
    body: [
      'Votre adresse e-mail (ou votre compte Google) et un identifiant de compte, pour vous connecter.',
      'Vos produits (nom, marque, photo du produit, catégorie, quantité, emplacement, date d’expiration, date d’ajout) et votre liste de courses, pour les retrouver sur tous vos appareils.',
    ],
  },
  {
    title: 'À quoi servent ces données ?',
    body: [
      'Uniquement à faire fonctionner le service : vous identifier et synchroniser vos produits entre vos appareils. Elles ne sont ni vendues, ni utilisées pour de la publicité.',
    ],
  },
  {
    title: 'Scan des codes-barres',
    body: [
      'Pour reconnaître un produit, le code-barres est envoyé à Open Food Facts, une base de données ouverte. Aucune information sur votre compte n’est transmise, mais ce service peut voir l’adresse IP de votre connexion.',
    ],
  },
  {
    title: 'Hébergement',
    body: [
      'La connexion et la base de données sont fournies par Google (Firebase Authentication et Cloud Firestore). Le site est hébergé par Vercel. Ces prestataires peuvent traiter les données en dehors de l’Union européenne, avec les garanties prévues par le RGPD.',
    ],
  },
  {
    title: 'Durée de conservation',
    body: ['Vos données sont conservées tant que votre compte existe, puis supprimées lorsque vous supprimez votre compte.'],
  },
  {
    title: 'Vos droits',
    body: [
      'Vous pouvez à tout moment accéder à vos données, les corriger, les supprimer ou vous opposer à leur traitement.',
      'La suppression du compte et de toutes vos données se fait directement dans l’application : Mon compte > Supprimer mon compte et mes données.',
      `Pour toute autre demande : ${CONTACT_EMAIL}. Vous pouvez aussi saisir la CNIL (cnil.fr).`,
    ],
  },
  {
    title: 'Cookies et traceurs',
    body: [
      'L’application utilise uniquement le stockage de votre appareil ou de votre navigateur pour fonctionner (session de connexion, produits). Aucun traceur publicitaire ni outil de mesure d’audience.',
    ],
  },
];

export function PrivacyScreen({ onBack }: Props) {
  const theme = useTheme();
  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.text }]}>Politique de confidentialité</Text>
      {SECTIONS.map((s) => (
        <React.Fragment key={s.title}>
          <Text style={[styles.heading, { color: theme.text }]}>{s.title}</Text>
          {s.body.map((p) => (
            <Text key={p} style={{ color: theme.muted, lineHeight: 21 }}>
              {p}
            </Text>
          ))}
        </React.Fragment>
      ))}
      <Button title="Retour" variant="secondary" onPress={onBack} style={{ marginTop: 16 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 8, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  heading: { fontSize: 16, fontWeight: '700', marginTop: 12 },
});
