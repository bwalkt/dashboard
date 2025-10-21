import type React from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'
import { Text, View } from 'react-native-ui-lib'

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
    borderTopColor: '#333',
    backgroundColor: '#1a1a1a',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  activeTab: {
    backgroundColor: '#333',
  },
  iconContainer: {
    marginRight: 6,
  },
  tabText: {
    color: '#666',
    fontSize: 14,
  },
  activeTabText: {
    color: '#007AFF',
  },
  textIcon: {
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
  },
  activeTextIcon: {
    color: '#007AFF',
  },
})

export default BottomTabs
