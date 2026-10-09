import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '@/theme';
import { useAuth } from '@/features/auth/context/AuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
  isPreview?: boolean;
}

interface NavItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  isActive: boolean;
  isDisabled: boolean;
  badge?: string;
}

export function AdminLayout({ children, isPreview = false }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const adminName = user?.name || (isPreview ? 'Preview Administrator' : 'Administrator');
  const adminEmail = user?.email || (isPreview ? 'admin@lifeline.lk' : '');

  const isDonationRequestsActive = pathname?.includes('/admin/donation-requests') || false;
  const isPatientRequestsActive = pathname?.includes('/admin/patient-requests') || false;
  const isReportsActive = pathname?.includes('/admin/reports') || false;
  const isDashboardActive =
    !isPatientRequestsActive &&
    !isDonationRequestsActive &&
    !isReportsActive &&
    (pathname === '/admin' || pathname === '/admin/');

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'grid-outline',
      route: '/admin',
      isActive: isDashboardActive,
      isDisabled: false,
    },
    {
      id: 'patient-requests',
      label: 'Patient Requests',
      icon: 'medkit-outline',
      route: '/admin/patient-requests',
      isActive: isPatientRequestsActive,
      isDisabled: false,
    },
    {
      id: 'donation-requests',
      label: 'Donation Requests',
      icon: 'water-outline',
      route: '/admin/donation-requests',
      isActive: isDonationRequestsActive,
      isDisabled: false,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: 'document-text-outline',
      route: '/admin/reports',
      isActive: isReportsActive,
      isDisabled: false,
    },
  ];

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login' as any);
  };

  const renderNavLinks = () => (
    <View style={styles.navList}>
      {navItems.map((item) => (
        <View key={item.id} style={styles.navItemWrapper}>
          <TouchableOpacity
            style={[
              styles.navItem,
              item.isActive && styles.navItemActive,
              item.isDisabled && styles.navItemDisabled,
            ]}
            onPress={() => {
              if (item.isDisabled) return;
              setIsMobileMenuOpen(false);
              const targetRoute = isPreview ? `${item.route}?preview=1` : item.route;
              router.push(targetRoute as any);
            }}
            disabled={item.isDisabled}
            activeOpacity={item.isDisabled ? 1 : 0.7}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}${item.isDisabled ? ' (Not available yet)' : ''}`}
          >
            <Ionicons
              name={item.icon}
              size={18}
              color={
                item.isActive
                  ? colors.primary
                  : item.isDisabled
                  ? colors.secondaryMuted
                  : colors.secondary
              }
            />
            <Text
              style={[
                styles.navLabel,
                item.isActive && styles.navLabelActive,
                item.isDisabled && styles.navLabelDisabled,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
          {item.isDisabled && item.badge && (
            <View style={styles.disabledBadge}>
              <Text style={styles.disabledBadgeText}>{item.badge}</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.rootContainer}>
        {/* DEV PREVIEW BANNER */}
        {isPreview && (
          <View style={styles.previewBanner}>
            <Ionicons name="construct-outline" size={16} color={colors.tertiaryDark} />
            <Text style={styles.previewBannerText}>
              Development Preview Mode: Showing sample admin dashboard. Database is not modified.
            </Text>
          </View>
        )}

        {/* MOBILE TOP BAR (width < 768) */}
        {!isDesktop && (
          <View style={styles.mobileHeader}>
            <View style={styles.mobileHeaderLeft}>
              <View style={styles.logoBadge}>
                <Ionicons name="shield" size={16} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.brandTitle}>LifeLine Admin</Text>
                <Text style={styles.adminUserSmall}>{adminName}</Text>
              </View>
            </View>

            <View style={styles.mobileHeaderRight}>
              <TouchableOpacity
                style={styles.mobileMenuToggle}
                onPress={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Toggle navigation menu"
              >
                <Ionicons
                  name={isMobileMenuOpen ? 'close' : 'menu'}
                  size={24}
                  color={colors.secondary}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* MOBILE DROPDOWN DRAWER */}
        {!isDesktop && isMobileMenuOpen && (
          <View style={styles.mobileDrawer}>
            <View style={styles.mobileUserInfo}>
              <Ionicons name="person-circle-outline" size={28} color={colors.secondaryLight} />
              <View style={styles.mobileUserDetails}>
                <Text style={styles.mobileUserName}>{adminName}</Text>
                {adminEmail ? <Text style={styles.mobileUserEmail}>{adminEmail}</Text> : null}
              </View>
            </View>

            {renderNavLinks()}

            <TouchableOpacity
              style={styles.mobileLogoutButton}
              onPress={handleLogout}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Log out of admin portal"
            >
              <Ionicons name="log-out-outline" size={18} color={colors.danger} />
              <Text style={styles.mobileLogoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* MAIN BODY: SIDEBAR + CONTENT (DESKTOP) OR CONTENT ONLY (MOBILE) */}
        <View style={styles.mainLayout}>
          {isDesktop && (
            <View style={styles.desktopSidebar}>
              {/* BRAND HEADER */}
              <View style={styles.sidebarHeader}>
                <View style={styles.logoBadgeDesktop}>
                  <Ionicons name="shield" size={20} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.brandTitleDesktop}>LifeLine LK</Text>
                  <Text style={styles.brandSubtitleDesktop}>Admin Portal</Text>
                </View>
              </View>

              {/* NAV SECTION */}
              <View style={styles.sidebarContent}>{renderNavLinks()}</View>

              {/* FOOTER USER & LOGOUT */}
              <View style={styles.sidebarFooter}>
                <View style={styles.desktopUserCard}>
                  <View style={styles.adminAvatarCircle}>
                    <Ionicons name="person" size={16} color={colors.secondary} />
                  </View>
                  <View style={styles.desktopUserDetails}>
                    <Text style={styles.desktopUserName} numberOfLines={1}>
                      {adminName}
                    </Text>
                    <Text style={styles.desktopUserRole}>Administrator</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.desktopLogoutButton}
                  onPress={handleLogout}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Log out"
                >
                  <Ionicons name="log-out-outline" size={16} color={colors.danger} />
                  <Text style={styles.desktopLogoutText}>Log Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* MAIN CONTENT AREA */}
          <View style={styles.contentArea}>{children}</View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  rootContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  previewBannerText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.tertiaryDark,
    marginLeft: spacing.xs,
    flex: 1,
  },
  mobileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    ...shadows.sm,
  },
  mobileHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.secondary,
  },
  adminUserSmall: {
    fontSize: 11,
    color: colors.secondaryMuted,
  },
  mobileHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mobileMenuToggle: {
    padding: 6,
  },
  mobileDrawer: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.md,
  },
  mobileUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: spacing.sm,
  },
  mobileUserDetails: {
    flex: 1,
  },
  mobileUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  mobileUserEmail: {
    fontSize: 12,
    color: colors.secondaryMuted,
  },
  mobileLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.sm,
  },
  mobileLogoutText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopSidebar: {
    width: 250,
    backgroundColor: colors.card,
    borderRightWidth: 1,
    borderRightColor: colors.borderLight,
    display: 'flex',
    flexDirection: 'column',
    ...shadows.sm,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  logoBadgeDesktop: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitleDesktop: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.secondary,
  },
  brandSubtitleDesktop: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
  },
  sidebarContent: {
    flex: 1,
    paddingVertical: spacing.md,
  },
  navList: {
    gap: 4,
  },
  navItemWrapper: {
    paddingHorizontal: spacing.sm,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  navItemActive: {
    backgroundColor: colors.primarySoft,
  },
  navItemDisabled: {
    opacity: 0.65,
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.secondary,
    flex: 1,
  },
  navLabelActive: {
    fontWeight: '700',
    color: colors.primary,
  },
  navLabelDisabled: {
    color: colors.secondaryMuted,
  },
  disabledBadge: {
    alignSelf: 'flex-start',
    marginLeft: 38,
    marginTop: 2,
    backgroundColor: colors.secondarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  disabledBadgeText: {
    fontSize: 10,
    color: colors.secondaryMuted,
    fontWeight: '500',
  },
  sidebarFooter: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  desktopUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  adminAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.secondarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopUserDetails: {
    flex: 1,
  },
  desktopUserName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  desktopUserRole: {
    fontSize: 11,
    color: colors.secondaryMuted,
  },
  desktopLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  desktopLogoutText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
  },
  contentArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
