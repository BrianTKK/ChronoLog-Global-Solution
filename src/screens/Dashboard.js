import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, ROUNDNESS, GLASS_STYLE } from '../styles/theme';

export default function Dashboard({ logs = [], onRecordPress, onHistoryPress, onRefugePress, onSettingsPress }) {
  // Filtrar logs em trânsito ou entregues para exibição na tela inicial
  const visibleTransitLogs = logs.filter(log => log.status === 'transit' || log.status === 'delivered');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* TopAppBar */}
        <View style={styles.header}>
          <View style={styles.profileContainer}>
            <View style={styles.avatarBorder}>
              {/* Profile placeholder since image download can be restricted */}
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>👩‍🚀</Text>
              </View>
            </View>
            <Text style={styles.headerTitle}>Mission Control</Text>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={onSettingsPress}>
            <MaterialIcons name="settings" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
 
         <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
           {/* Greeting Section */}
           <View style={styles.greetingSection}>
             <Text style={styles.greetingText}>Bom dia, Comandante</Text>
             <Text style={styles.missionDay}>DIA DA MISSÃO: 142</Text>
           </View>
 
           {/* CTA Section */}
           <TouchableOpacity style={styles.ctaButton} onPress={onRecordPress}>
             <MaterialIcons name="mic" size={24} color={COLORS.onPrimary} />
             <Text style={styles.ctaButtonText}>Gravar novo Log Diário</Text>
           </TouchableOpacity>
 
           {/* Logs in Transit Section */}
           <View style={styles.sectionHeader}>
             <MaterialIcons name="sync" size={20} color={COLORS.primary} style={styles.sectionIcon} />
             <Text style={styles.sectionTitle}>Logs Recentes</Text>
           </View>
 
           <View style={styles.logsContainer}>
             {visibleTransitLogs.length === 0 ? (
               <View style={styles.emptyTransitBox}>
                 <MaterialIcons name="cloud-done" size={32} color={COLORS.primary} style={styles.emptyTransitIcon} />
                 <Text style={styles.emptyTransitText}>Todos os pacotes de dados foram transmitidos e entregues com sucesso para a Terra.</Text>
               </View>
             ) : (
               visibleTransitLogs.map((log) => (
                 <View key={log.id} style={styles.logCard}>
                   <View style={styles.logHeaderRow}>
                     <Text style={styles.logTitle}>{log.title}</Text>
                     <Text style={styles.logMeta}>{log.date || '09/06/2026'} • {log.timeLabel.replace(/^Entregue • /, '')}</Text>
                   </View>
                   
                   <View style={styles.logStatusArea}>
                     {log.status === 'transit' ? (
                       <View style={styles.transitProgressWrapper}>
                         <View style={styles.transitLabelRow}>
                           <View style={styles.transitStatusMessageRow}>
                             <MaterialIcons name="satellite-alt" size={14} color={COLORS.primary} style={styles.transitStatusIcon} />
                             <Text style={styles.transitStatusMessage}>Enviando para a base...</Text>
                           </View>
                           <Text style={styles.transitPercentage}>{log.progress}%</Text>
                         </View>
                         <View style={styles.fullWidthProgressBarBg}>
                           <View style={[styles.fullWidthProgressBarFill, { width: `${log.progress}%` }]} />
                         </View>
                       </View>
                     ) : log.status === 'delivered' ? (
                       <View style={styles.deliveredWrapper}>
                         <View style={styles.deliveredLabelRow}>
                           <View style={styles.deliveredStatusMessageRow}>
                             <MaterialIcons name="check-circle" size={16} color={COLORS.primary} style={styles.deliveredStatusIcon} />
                             <Text style={styles.deliveredStatusMessage}>Log registrado com sucesso</Text>
                           </View>
                         </View>
                         <View style={[styles.fullWidthProgressBarBg, { opacity: 0.5 }]}>
                           <View style={[styles.fullWidthProgressBarFill, { width: '100%' }]} />
                         </View>
                       </View>
                     ) : (
                       <View style={styles.scheduledWrapper}>
                         <View style={styles.scheduledLabelRow}>
                           <MaterialIcons name="schedule" size={16} color={COLORS.onSurfaceVariant} />
                           <Text style={styles.scheduledStatusMessage}>Agendado</Text>
                         </View>
                       </View>
                     )}
                   </View>
                 </View>
               ))
             )}
           </View>
         </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItemActive}>
            <MaterialIcons name="dashboard" size={24} color={COLORS.onPrimary} />
            <Text style={styles.navTextActive}>Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navItem} onPress={onHistoryPress}>
            <MaterialIcons name="history" size={24} color={COLORS.onSurfaceVariant} />
            <Text style={styles.navText}>Histórico</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={onRefugePress}>
            <MaterialIcons name="spa" size={24} color={COLORS.onSurfaceVariant} />
            <Text style={styles.navText}>Refúgio</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    height: SPACING.touchTargetMin + 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.marginSide,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBorder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 20,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  scrollContent: {
    paddingHorizontal: SPACING.marginSide,
    paddingTop: 24,
    paddingBottom: 100,
  },
  greetingSection: {
    marginBottom: SPACING.sectionGapSm,
  },
  greetingText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28,
    color: COLORS.onBackground,
    marginBottom: 4,
  },
  missionDay: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 12,
    color: COLORS.primary,
    letterSpacing: 2,
  },
  ctaButton: {
    height: 56,
    backgroundColor: COLORS.primaryContainer,
    borderRadius: ROUNDNESS.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: SPACING.sectionGapLg,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 10px rgba(45, 212, 191, 0.20)',
      },
      default: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 3,
      },
    }),
  },
  ctaButtonText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 18,
    color: COLORS.onPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 20,
    color: COLORS.onSurfaceVariant,
  },
  logsContainer: {
    gap: 12,
  },
  logCard: {
    ...GLASS_STYLE,
    borderRadius: ROUNDNESS.default,
    padding: 18,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 14,
  },
  logHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  logTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: COLORS.onSurface,
    fontWeight: '600',
    flex: 1,
  },
  logMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
  },
  logStatusArea: {
    width: '100%',
  },
  transitProgressWrapper: {
    width: '100%',
    gap: 8,
  },
  transitLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transitStatusMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transitStatusIcon: {
    opacity: 0.8,
  },
  transitStatusMessage: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: COLORS.primary,
  },
  transitPercentage: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 12,
    color: COLORS.primary,
  },
  fullWidthProgressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.surfaceHighest,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fullWidthProgressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  deliveredWrapper: {
    width: '100%',
    gap: 8,
  },
  deliveredLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveredStatusMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deliveredStatusIcon: {
    opacity: 0.9,
  },
  deliveredStatusMessage: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: COLORS.primary,
  },
  scheduledWrapper: {
    width: '100%',
  },
  scheduledLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    opacity: 0.6,
  },
  scheduledStatusMessage: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: 80,
    backgroundColor: 'rgba(28, 31, 42, 0.75)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 12,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  navItemActive: {
    backgroundColor: COLORS.primaryContainer,
    borderRadius: ROUNDNESS.full,
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  navText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: COLORS.onSurfaceVariant,
  },
  navTextActive: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: COLORS.onPrimary,
    fontWeight: 'bold',
  },
  emptyTransitBox: {
    ...GLASS_STYLE,
    borderRadius: ROUNDNESS.default,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTransitIcon: {
    opacity: 0.8,
  },
  emptyTransitText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },
});
