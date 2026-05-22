import type {IconProps} from './types';

export function ChatBubble({
  size = 24,
  color = 'currentColor',
  className,
  ...props
}: IconProps) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      fill={color}
      viewBox='0 0 16 16'
      width={size}
      height={size}
      aria-hidden='true'
      className={className}
      {...props}
    >
      <path d='M10 10H5V9h5zm1-2H5V7h6zm0-2H5V5h6z' />
      <path
        fillRule='evenodd'
        d='M14 13H5.5L2 14V2h12zm-11-.326 2.226-.636L5.36 12H13V3H3z'
        clipRule='evenodd'
      />
    </svg>
  );
}
