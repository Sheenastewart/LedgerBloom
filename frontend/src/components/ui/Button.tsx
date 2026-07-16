import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'icon'

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'button button-primary',
  secondary: 'button button-secondary',
  tertiary: 'button button-tertiary',
  danger: 'button button-danger',
  icon: 'button button-icon',
}

type CommonProps = {
  variant?: Variant
  children: ReactNode
  className?: string
}

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    to?: undefined
  }

type ButtonAsLink = CommonProps &
  Omit<LinkProps, 'className' | 'children'> & {
    to: LinkProps['to']
  }

export type ButtonProps = ButtonAsButton | ButtonAsLink

export function Button(props: ButtonProps) {
  const { variant = 'primary', className, children, ...rest } = props
  const classes = [VARIANT_CLASS[variant], className].filter(Boolean).join(' ')

  if ('to' in rest && rest.to !== undefined) {
    const { to, ...linkRest } = rest
    return (
      <Link to={to} className={classes} {...linkRest}>
        {children}
      </Link>
    )
  }

  const buttonRest = rest as ButtonAsButton
  return (
    <button type={buttonRest.type ?? 'button'} className={classes} {...buttonRest}>
      {children}
    </button>
  )
}
