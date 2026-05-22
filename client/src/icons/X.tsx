import {Icon} from './Icon';
import type {IconProps} from './types';

export function X(props: IconProps) {
  return (
    <Icon {...props}>
      <path d='M18 6 6 18' />
      <path d='m6 6 12 12' />
    </Icon>
  );
}
