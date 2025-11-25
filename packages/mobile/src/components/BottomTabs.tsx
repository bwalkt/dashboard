import type React from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'
import { Text, View } from 'react-native-ui-lib'
import { borderRadius, colors, fontSize, fontWeight, spacing, surfaces, text } from '../theme'

export interface TabItem {
  id: string
  label: string
  icon?: React.ReactNode
  isTextIcon?: boolean
}

interface BottomTabsProps {
  tabs: TabItem[]
  activeTab: string
  onTabPress: (tabId: string) => void
}

const BottomTabs: React.FC<BottomTabsProps> = ({ tabs, activeTab, onTabPress }) => {
  return (
    <View style={styles.bottomTabs}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tab, activeTab === tab.id && styles.activeTab]}
          onPress={() => onTabPress(tab.id)}
        >
          {tab.isTextIcon ? (
            <Text style={[styles.textIcon, activeTab === tab.id && styles.activeTextIcon]}>{tab.label}</Text>
          ) : (
            <>
              {tab.icon && <View style={styles.iconContainer}>{tab.icon}</View>}
              <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                {!tab.isTextIcon && tab.label}
              </Text>
            </>
          )}
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  bottomTabs: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.borderColor,
    backgroundColor: surfaces.primary,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.lg - 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  activeTab: {
    backgroundColor: surfaces.secondary,
  },
  iconContainer: {
    marginRight: spacing.xs + 2,
  },
  tabText: {
    color: text.muted,
    fontSize: fontSize.sm,
  },
  activeTabText: {
    color: colors.primaryColor,
  },
  textIcon: {
    color: text.muted,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  activeTextIcon: {
    color: colors.primaryColor,
  },
})

export default BottomTabs
