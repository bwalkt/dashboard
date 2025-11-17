import * as React from 'react'
import MainHeader from './header'

interface MainLayoutProps {
  title: string
  description?: string
  onFilterToggle?: (isOpen: boolean) => void
  children: React.ReactNode
}

export default function Main({ title, description, onFilterToggle, children }: MainLayoutProps) {
  return (
    <div className="flex flex-col h-full">
      <MainHeader title={title} description={description} onFilterToggle={onFilterToggle} />
      {children}
    </div>
  )
}
