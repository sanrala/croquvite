import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { fonts } from '../theme';

interface Props extends TextProps {
  /** Police des titres et des chiffres (Bricolage Grotesque sur le web). */
  display?: boolean;
}

/** Texte de l'appli : applique la police du thème (sur le web) sans changer le reste du comportement. */
export function Text({ display, style, ...rest }: Props) {
  return <RNText {...rest} style={[{ fontFamily: display ? fonts.display : fonts.body }, style]} />;
}
