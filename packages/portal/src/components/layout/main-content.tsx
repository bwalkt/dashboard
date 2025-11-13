"use client";

import * as React from 'react'
import { Breadcrumbs } from '../breadcrumbs'

export interface MainContentProps {
  children: React.ReactNode
  style?: React.CSSProperties
}

export function MainContent({ children, style }: MainContentProps) {
  return (
    <>
      {import.meta.env.VITE_CONFIG_BREADCRUMB && (
        <div className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <Breadcrumbs />
        </div>
      )}
      
      <main className="flex-1 overflow-auto" style={style}>
        {children}
      </main>
    </>
  )
}