/**
 * Shared design tokens for LifeLine LK / Blood Donor App.
 * Palette designed specifically for Blood Donation & Healthcare:
 * - Primary: Life Blood Red (#E53935)
 * - Secondary: Midnight Slate Navy (#1E293B) - Trust, precision, clinical authority
 * - Tertiary: Vital Amber Gold (#F59E0B) - Badges, milestones, emergency urgency
 * - Accent: Life Emerald (#10B981) - Eligibility, verified badges, active readiness
 */
export const colors = {
  // 1. Primary: Vibrant Medical Blood Red
  primary: '#E53935',
  primaryDark: '#B71C1C',
  primaryDeep: '#881337',
  primaryLight: '#FEE2E2',
  primarySoft: '#FFCDD2',
  primaryTonal: '#FFF1F2',

  // 2. Secondary: Deep Midnight Slate Navy (Trust & Clinical Contrast)
  secondary: '#1E293B',
  secondaryDark: '#0F172A',
  secondaryLight: '#334155',
  secondarySoft: '#F1F5F9',
  secondaryMuted: '#64748B',

  // 3. Tertiary: Vital Amber Gold (Milestones, Badges & Urgency Alerts)
  tertiary: '#F59E0B',
  tertiaryDark: '#D97706',
  tertiaryLight: '#FEF3C7',
  tertiarySoft: '#FFFBEB',

  // 4. Accent & Semantic Statuses
  accent: '#10B981',
  accentSoft: '#D1FAE5',
  success: '#10B981',
  successSoft: '#D1FAE5',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  info: '#3B82F6',
  infoSoft: '#DBEAFE',

  // Surfaces & Backgrounds
  background: '#F8FAFC',
  backgroundCard: '#FFFFFF',
  card: '#FFFFFF',
  darkCard: '#1E293B',
  dark: '#0F172A',

  // Borders
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderDark: '#334155',

  // Typography
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textInverted: '#FFFFFF',
  textPlaceholder: '#94A3B8',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const borderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  primary: {
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;
