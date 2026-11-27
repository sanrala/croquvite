import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import type { NutriScore } from '../openFoodFacts';
import { MAX_WIDTH, radius, useTheme } from '../theme';

export type InfoTab = 'dates' | 'nutriscore';

interface Props {
  onClose: () => void;
  /** Onglet ouvert à l'arrivée (ex. « nutriscore » depuis le badge). */
  initialTab?: InfoTab;
}

/* ─────────────────────────── Couleurs sémantiques ─────────────────────────── */

const RED = '#E5484D';
const RED_TINT = 'rgba(229, 72, 77, 0.12)';
const GREEN = '#30A46C';
const GREEN_TINT = 'rgba(48, 164, 108, 0.12)';

const NUTRI: { grade: NutriScore; color: string; ink: string; label: string }[] = [
  { grade: 'A', color: '#038141', ink: '#FFFFFF', label: 'Excellente qualité nutritionnelle' },
  { grade: 'B', color: '#85BB2F', ink: '#FFFFFF', label: 'Bonne qualité nutritionnelle' },
  { grade: 'C', color: '#FECB02', ink: '#1A1A1A', label: 'Qualité moyenne' },
  { grade: 'D', color: '#EE8100', ink: '#FFFFFF', label: 'À consommer moins souvent' },
  { grade: 'E', color: '#E63E11', ink: '#FFFFFF', label: 'À consommer occasionnellement' },
];

/* ─────────────────────────── Briques d'interface ─────────────────────────── */

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHead}>
      <Text style={[styles.eyebrow, { color: theme.primary }]}>{eyebrow}</Text>
      <Text display style={[styles.sectionTitle, { color: theme.text }]}>
        {title}
      </Text>
    </View>
  );
}

function Pill({ label, color, tint }: { label: string; color: string; tint: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: tint }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

function Chip({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: theme.fill }]}>
      <Text style={[styles.chipText, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

/** Carte de comparaison DLC / DDM avec liseré de couleur. */
function DateCard(props: {
  accent: string;
  tint: string;
  status: string;
  code: string;
  mention: string;
  scope: string;
  rule: string;
  detail: string;
  examples: string[];
}) {
  const theme = useTheme();
  return (
    <View style={[styles.card, styles.dateCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.accentBar, { backgroundColor: props.accent }]} />
      <View style={styles.dateCardBody}>
        <View style={styles.rowBetween}>
          <Pill label={props.status} color={props.accent} tint={props.tint} />
          <Text style={[styles.code, { color: theme.muted }]}>{props.code}</Text>
        </View>

        <Text display style={[styles.mention, { color: theme.text }]}>
          « {props.mention} »
        </Text>
        <Text style={[styles.scope, { color: theme.muted }]}>{props.scope}</Text>

        <View style={[styles.rule, { backgroundColor: props.tint }]}>
          <Text style={[styles.ruleLabel, { color: props.accent }]}>APRÈS LA DATE</Text>
          <Text style={[styles.ruleText, { color: theme.text }]}>{props.rule}</Text>
        </View>

        <Text style={[styles.body, { color: theme.text }]}>{props.detail}</Text>

        <View style={styles.chips}>
          {props.examples.map((e) => (
            <Chip key={e} label={e} />
          ))}
        </View>
      </View>
    </View>
  );
}

/** Ligne de liste avec pastille (✓, ✕, numéro…). */
function Row({ mark, markColor, markTint, title, text, last }: {
  mark: string;
  markColor: string;
  markTint: string;
  title: string;
  text?: string;
  last?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.row, !last && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={[styles.mark, { backgroundColor: markTint }]}>
        <Text style={[styles.markText, { color: markColor }]}>{mark}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowTitle, { color: theme.text }]}>{title}</Text>
        {text ? <Text style={[styles.rowText, { color: theme.muted }]}>{text}</Text> : null}
      </View>
    </View>
  );
}

function Panel({ children, style }: { children: React.ReactNode; style?: object }) {
  const theme = useTheme();
  return <View style={[styles.card, styles.panel, { backgroundColor: theme.card, borderColor: theme.border }, style]}>{children}</View>;
}

/* ─────────────────────────── Onglet « Dates » ─────────────────────────── */

function DatesTab() {
  const theme = useTheme();
  return (
    <>
      <SectionTitle eyebrow="LES DEUX MENTIONS" title="Deux dates, deux règles" />

      <DateCard
        accent={RED}
        tint={RED_TINT}
        status="Risque pour la santé"
        code="DLC"
        mention="À consommer jusqu’au"
        scope="Produits frais et périssables"
        rule="Ne pas consommer. Jeter le produit."
        detail="Des bactéries comme la listeria ou la salmonelle peuvent s’y développer sans changer l’odeur ni l’aspect. Risque d’intoxication, plus grave pour les femmes enceintes, les enfants, les personnes âgées ou fragiles."
        examples={['Viande', 'Poisson', 'Charcuterie', 'Yaourts', 'Plats traiteur']}
      />

      <DateCard
        accent={GREEN}
        tint={GREEN_TINT}
        status="Pas de danger"
        code="DDM"
        mention="À consommer de préférence avant"
        scope="Produits secs ou stables"
        rule="Encore consommable s’il a été bien conservé."
        detail="Le produit peut perdre un peu de goût, de croquant ou de vitamines, mais il reste sain. Anciennement appelée DLUO."
        examples={['Pâtes', 'Riz', 'Conserves', 'Biscuits', 'Café', 'Farine']}
      />

      <SectionTitle eyebrow="DATE DÉPASSÉE (DDM)" title="Avant de le manger, vérifiez" />
      <Panel>
        <Row mark="✓" markColor={GREEN} markTint={GREEN_TINT} title="Emballage intact et bien fermé" />
        <Row mark="✓" markColor={GREEN} markTint={GREEN_TINT} title="Aspect et odeur normaux" />
        <Row mark="✕" markColor={RED} markTint={RED_TINT} title="Conserve bombée, rouillée ou qui fuit" text="À jeter sans l’ouvrir." />
        <Row mark="✕" markColor={RED} markTint={RED_TINT} title="Moisissures, odeur rance ou insectes" text="À jeter." last />
      </Panel>

      <SectionTitle eyebrow="ORIGINE" title="Qui fixe la date ?" />
      <Panel style={{ gap: 10 }}>
        <Text style={[styles.body, { color: theme.text }]}>
          Le fabricant, après des tests en laboratoire et avec une marge de sécurité. Pour une DLC, il mesure jusqu’à quand
          le produit reste <Text style={styles.strong}>sain</Text>. Pour une DDM, jusqu’à quand il garde toute sa{' '}
          <Text style={styles.strong}>qualité</Text>.
        </Text>
        <View style={[styles.note, { backgroundColor: theme.fill }]}>
          <Text style={[styles.noteText, { color: theme.text }]}>
            Ces dates valent pour un produit <Text style={styles.strong}>fermé</Text> et bien conservé (4 °C maximum au
            frigo). Une fois ouvert, suivez la mention « à consommer dans les X jours ».
          </Text>
        </View>
      </Panel>

      <SectionTitle eyebrow="ASTUCES" title="Pour moins gaspiller" />
      <Panel>
        <Row
          mark="1"
          markColor={theme.primary}
          markTint={theme.primarySoft}
          title="Congelez avant la DLC"
          text="Le froid met le compte à rebours en pause. Une fois décongelé, consommez rapidement."
        />
        <Row
          mark="2"
          markColor={theme.primary}
          markTint={theme.primarySoft}
          title="Œufs : 28 jours après la ponte"
          text="C’est une date recommandée. Passé ce délai, faites-les bien cuire."
        />
        <Row
          mark="3"
          markColor={theme.primary}
          markTint={theme.primarySoft}
          title="Vérifiez la date proposée"
          text="Croqu’Vite estime une date selon le produit : remplacez-la par celle de l’emballage."
          last
        />
      </Panel>
    </>
  );
}

/* ─────────────────────────── Onglet « Nutri-Score » ─────────────────────────── */

function NutriTab() {
  const theme = useTheme();
  return (
    <>
      <SectionTitle eyebrow="L’ÉCHELLE" title="De A à E" />
      <Panel style={{ gap: 14 }}>
        <View style={styles.scale}>
          {NUTRI.map((n, i) => (
            <View
              key={n.grade}
              style={[
                styles.scaleCell,
                { backgroundColor: n.color },
                i === 0 && styles.scaleFirst,
                i === NUTRI.length - 1 && styles.scaleLast,
              ]}
            >
              <Text display style={[styles.scaleLetter, { color: n.ink }]}>
                {n.grade}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.rowBetween}>
          <Text style={[styles.scaleCaption, { color: theme.muted }]}>Meilleur choix</Text>
          <Text style={[styles.scaleCaption, { color: theme.muted }]}>Moins favorable</Text>
        </View>

        <View style={{ gap: 10, marginTop: 4 }}>
          {NUTRI.map((n) => (
            <View key={n.grade} style={styles.legendRow}>
              <View style={[styles.legendBadge, { backgroundColor: n.color }]}>
                <Text style={[styles.legendLetter, { color: n.ink }]}>{n.grade}</Text>
              </View>
              <Text style={[styles.body, { color: theme.text, flex: 1 }]}>{n.label}</Text>
            </View>
          ))}
        </View>
      </Panel>

      <SectionTitle eyebrow="LE CALCUL" title="Ce qui compte, pour 100 g" />
      <View style={styles.columns}>
        <Panel style={[styles.column, { gap: 10 }]}>
          <Pill label="Pénalise" color={RED} tint={RED_TINT} />
          {['Calories', 'Sucres', 'Graisses saturées', 'Sel'].map((t) => (
            <Text key={t} style={[styles.body, { color: theme.text }]}>
              <Text style={{ color: RED, fontWeight: '800' }}>−  </Text>
              {t}
            </Text>
          ))}
        </Panel>
        <Panel style={[styles.column, { gap: 10 }]}>
          <Pill label="Valorise" color={GREEN} tint={GREEN_TINT} />
          {['Fibres', 'Protéines', 'Fruits, légumes, légumineuses', 'Huiles de colza, noix, olive'].map((t) => (
            <Text key={t} style={[styles.body, { color: theme.text }]}>
              <Text style={{ color: GREEN, fontWeight: '800' }}>+  </Text>
              {t}
            </Text>
          ))}
        </Panel>
      </View>

      <SectionTitle eyebrow="BIEN L’UTILISER" title="Ce qu’il dit, et ce qu’il ne dit pas" />
      <Panel>
        <Row
          mark="✓"
          markColor={GREEN}
          markTint={GREEN_TINT}
          title="Comparer des produits du même rayon"
          text="Deux céréales, deux pizzas, deux yaourts. Comparer une huile et un soda n’a pas de sens."
        />
        <Row
          mark="✓"
          markColor={GREEN}
          markTint={GREEN_TINT}
          title="D ou E n’est pas interdit"
          text="C’est la fréquence et la quantité qui comptent."
        />
        <Row
          mark="✕"
          markColor={RED}
          markTint={RED_TINT}
          title="Il ne mesure pas tout"
          text="Additifs, pesticides et niveau de transformation ne sont pas pris en compte."
        />
        <Row
          mark="?"
          markColor={theme.muted}
          markTint={theme.fill}
          title="Pas de score affiché ?"
          text="Certains produits n’en ont pas (épices, café, thé…), ou il n’est pas encore renseigné dans Open Food Facts."
          last
        />
      </Panel>

      <Text style={[styles.source, { color: theme.muted }]}>Logo conçu par Santé publique France, d’usage facultatif pour les marques.</Text>
    </>
  );
}

/* ─────────────────────────── Écran ─────────────────────────── */

export function InfoScreen({ onClose, initialTab = 'dates' }: Props) {
  const theme = useTheme();
  const [tab, setTab] = useState<InfoTab>(initialTab);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Barre du haut */}
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          hitSlop={8}
          style={({ pressed }) => [styles.back, { backgroundColor: theme.card, opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.backChevron, { color: theme.text }]}>‹</Text>
          <Text style={[styles.backText, { color: theme.text }]}>Retour</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* En-tête */}
        <View style={styles.hero}>
          <Text style={[styles.eyebrow, { color: theme.primary }]}>GUIDE PRATIQUE</Text>
          <Text display style={[styles.title, { color: theme.text }]}>
            Bon à savoir
          </Text>
          <Text style={[styles.lead, { color: theme.muted }]}>
            Lire une date d’expiration et un Nutri-Score en quelques secondes, pour manger sain sans gaspiller.
          </Text>
        </View>

        {/* Sélecteur d'onglet */}
        <View style={[styles.segment, { backgroundColor: theme.card, borderColor: theme.border }]} accessibilityRole="tablist">
          {(
            [
              ['dates', 'Dates'],
              ['nutriscore', 'Nutri-Score'],
            ] as [InfoTab, string][]
          ).map(([key, label]) => {
            const active = tab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.segmentItem, active && { backgroundColor: theme.primary }]}
              >
                <Text style={[styles.segmentText, { color: active ? theme.onPrimary : theme.muted }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'dates' ? <DatesTab /> : <NutriTab />}

        <View style={[styles.disclaimer, { borderTopColor: theme.border }]}>
          <Text style={[styles.disclaimerText, { color: theme.muted }]}>
            Informations générales, à titre indicatif. En cas de doute sur un produit, ne le consommez pas.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/* ─────────────────────────── Styles ─────────────────────────── */

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingLeft: 10, paddingRight: 14, paddingVertical: 7, borderRadius: radius.pill },
  backChevron: { fontSize: 22, lineHeight: 22, fontWeight: '600', marginTop: -2 },
  backText: { fontSize: 14, fontWeight: '700' },

  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 64, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', gap: 12 },

  hero: { gap: 6, marginBottom: 8 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  lead: { fontSize: 15, lineHeight: 22 },

  segment: { flexDirection: 'row', padding: 4, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, marginBottom: 4 },
  segmentItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: radius.pill },
  segmentText: { fontSize: 14, fontWeight: '800' },

  sectionHead: { gap: 4, marginTop: 20, marginBottom: 2 },
  sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },

  card: { borderRadius: radius.sheet, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  panel: { paddingHorizontal: 16, paddingVertical: 6 },

  dateCard: { flexDirection: 'row' },
  accentBar: { width: 5 },
  dateCardBody: { flex: 1, padding: 16, gap: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  code: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  mention: { fontSize: 19, fontWeight: '800', letterSpacing: -0.2, lineHeight: 25 },
  scope: { fontSize: 14, marginTop: -6 },
  rule: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  ruleLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  ruleText: { fontSize: 15, fontWeight: '700', lineHeight: 21 },

  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 12, fontWeight: '800' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  chipText: { fontSize: 12, fontWeight: '600' },

  body: { fontSize: 15, lineHeight: 22 },
  strong: { fontWeight: '800' },
  note: { borderRadius: 12, padding: 12 },
  noteText: { fontSize: 14, lineHeight: 20 },

  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  mark: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  markText: { fontSize: 14, fontWeight: '800' },
  rowTitle: { fontSize: 15, fontWeight: '700', lineHeight: 21, marginTop: 3 },
  rowText: { fontSize: 14, lineHeight: 20 },

  scale: { flexDirection: 'row', gap: 3, marginTop: 10 },
  scaleCell: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  scaleFirst: { borderTopLeftRadius: 14, borderBottomLeftRadius: 14 },
  scaleLast: { borderTopRightRadius: 14, borderBottomRightRadius: 14 },
  scaleLetter: { fontSize: 22, fontWeight: '900' },
  scaleCaption: { fontSize: 12, fontWeight: '600' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  legendBadge: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  legendLetter: { fontSize: 15, fontWeight: '900' },

  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  column: { flex: 1, minWidth: 150, paddingVertical: 16 },

  source: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  disclaimer: { marginTop: 28, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth },
  disclaimerText: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
});