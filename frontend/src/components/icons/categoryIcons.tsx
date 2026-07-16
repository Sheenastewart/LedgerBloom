import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { title?: string }

function SvgIcon({ title, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.25rem"
      height="1.25rem"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

export function IconGroceries(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4 8h16l-1.2 11.2a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 8Z" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
    </SvgIcon>
  )
}

export function IconUtilities(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M13 2 4 14h7l-1 8 10-14h-7l1-6Z" />
    </SvgIcon>
  )
}

export function IconTransport(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M5 16V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v8" />
      <path d="M3 16h18" />
      <circle cx="7.5" cy="16.5" r="1.5" />
      <circle cx="16.5" cy="16.5" r="1.5" />
    </SvgIcon>
  )
}

export function IconHousing(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M3 11 12 4l9 7" />
      <path d="M5 10v9h14v-9" />
      <path d="M10 19v-5h4v5" />
    </SvgIcon>
  )
}

export function IconHealth(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z" />
    </SvgIcon>
  )
}

export function IconEntertainment(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M10 10v4l4-2-4-2Z" />
    </SvgIcon>
  )
}

export function IconChildCare(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </SvgIcon>
  )
}

export function IconDining(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M8 3v8a2 2 0 0 0 2 2v8" />
      <path d="M6 3v4M10 3v4" />
      <path d="M16 3v18M16 3c2 0 3 1.5 3 4v3h-3" />
    </SvgIcon>
  )
}

export function IconShopping(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M6 8h12l-1 12H7L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </SvgIcon>
  )
}

export function IconIncome(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 3v12" />
      <path d="m8 11 4 4 4-4" />
      <path d="M5 21h14" />
    </SvgIcon>
  )
}

export function IconOther(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2.5" />
    </SvgIcon>
  )
}

export function IconTravel(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M10 20 3 14l2-1 4 2 6-8 2 1-6 9 4 1 1 2-6 0Z" />
    </SvgIcon>
  )
}

export function IconInsurance(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 3 5 6v5c0 5 3.5 8.5 7 10 3.5-1.5 7-5 7-10V6l-7-3Z" />
    </SvgIcon>
  )
}

export function IconEducation(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M3 9 12 5l9 4-9 4-9-4Z" />
      <path d="M7 11v5c2 1.5 4 2 5 2s3-.5 5-2v-5" />
      <path d="M21 9v7" />
    </SvgIcon>
  )
}

const CATEGORY_ICON_MAP: Array<{ match: RegExp; Icon: (props: IconProps) => ReactNode }> = [
  { match: /grocer|food|supermarket/i, Icon: IconGroceries },
  { match: /utilit|electric|gas|water|internet|phone/i, Icon: IconUtilities },
  { match: /transport|gas station|fuel|car|auto|transit/i, Icon: IconTransport },
  { match: /hous|rent|mortgage|home/i, Icon: IconHousing },
  { match: /health|medical|dental|pharmacy|doctor/i, Icon: IconHealth },
  { match: /entertain|stream|movie|music|game/i, Icon: IconEntertainment },
  { match: /child|daycare|kids/i, Icon: IconChildCare },
  { match: /dining|restaurant|cafe|coffee/i, Icon: IconDining },
  { match: /shop|retail|clothes|clothing/i, Icon: IconShopping },
  { match: /travel|vacation|flight|hotel/i, Icon: IconTravel },
  { match: /insur/i, Icon: IconInsurance },
  { match: /educat|tuition|school/i, Icon: IconEducation },
  { match: /other/i, Icon: IconOther },
]

export function categoryIconForName(name: string | null | undefined): (props: IconProps) => ReactNode {
  const label = name ?? ''
  for (const entry of CATEGORY_ICON_MAP) {
    if (entry.match.test(label)) {
      return entry.Icon
    }
  }
  return IconOther
}

export function CategoryIcon({
  categoryName,
  className,
}: {
  categoryName: string | null | undefined
  className?: string
}) {
  const Icon = categoryIconForName(categoryName)
  return (
    <span className={className ?? 'category-icon'} aria-hidden="true">
      <Icon />
    </span>
  )
}
