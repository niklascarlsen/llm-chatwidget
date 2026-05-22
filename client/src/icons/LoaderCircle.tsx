import {Icon} from './Icon';
import type {IconProps} from './types';

export function LoaderCircle(props: IconProps) {
  return (
    <Icon {...props}>
      <path d='M21 12a9 9 0 1 1-6.219-8.56' />
    </Icon>
  );
}
