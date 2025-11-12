"use client";

import * as React from 'react'
import { MainHeader } from './main-header'
import { MainContent } from './main-content'

export interface MainLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  hasFilters?: boolean
  showFilters?: boolean
  onToggleFilters?: () => void
  style?: React.CSSProperties
}

export function MainLayout({ 
  children, 
  title, 
  description, 
  hasFilters = false, 
  showFilters = false,
  onToggleFilters,
  style
}: MainLayoutProps) {
  return (
    <div className="flex flex-col flex-1">
      <MainHeader 
        title={title}
        description={description}
        hasFilters={hasFilters}
        showFilters={showFilters}
        onToggleFilters={onToggleFilters}
      />
      <MainContent style={style}>
        {children}
      </MainContent>
    </div>
  )
}