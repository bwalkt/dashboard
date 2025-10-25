declare module '@react-email/components' {
  import type { ComponentPropsWithoutRef, FC } from 'react'

  export const Html: FC<ComponentPropsWithoutRef<'html'>>
  export const Head: FC<ComponentPropsWithoutRef<'head'>>
  export const Preview: FC<{ children?: string }>
  export const Body: FC<ComponentPropsWithoutRef<'body'>>
  export const Container: FC<ComponentPropsWithoutRef<'table'>>
  export const Section: FC<ComponentPropsWithoutRef<'table'>>
  export const Row: FC<ComponentPropsWithoutRef<'tr'>>
  export const Column: FC<ComponentPropsWithoutRef<'td'>>
  export const Text: FC<ComponentPropsWithoutRef<'p'>>
  export const Link: FC<ComponentPropsWithoutRef<'a'>>
  export const Img: FC<ComponentPropsWithoutRef<'img'>>
  export const Hr: FC<ComponentPropsWithoutRef<'hr'>>
  export const Heading: FC<ComponentPropsWithoutRef<'h1'>>
  export const Button: FC<ComponentPropsWithoutRef<'a'>>
  export const Font: FC<{ fontFamily?: string; fallbackFontFamily?: string; webFont?: any; fontWeight?: number; fontStyle?: string }>
  export const Markdown: FC<{ children?: string; markdownCustomStyles?: Record<string, any>; markdownContainerStyles?: Record<string, any> }>
}

declare module '@react-email/tailwind' {
  import type { FC, ReactNode } from 'react'

  export const Tailwind: FC<{
    children?: ReactNode
    config?: Record<string, any>
  }>
}
