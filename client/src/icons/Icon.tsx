import type {IconProps} from './types';

export function Icon({
  size = 24,
  strokeWidth = 2,
  color = 'currentColor',
  className,
  children,
  'aria-hidden': ariaHidden = true,
  ...props
}: IconProps) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden={ariaHidden}
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}
