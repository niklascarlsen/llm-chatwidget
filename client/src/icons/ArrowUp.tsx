import {Icon} from './Icon';
import type {IconProps} from './types';

export function ArrowUp(props: IconProps) {
  return (
    <Icon {...props}>
      <path d='m5 12 7-7 7 7' />
      <path d='M12 19V5' />
    </Icon>
  );
}
