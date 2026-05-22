import type {ChatMessage as SharedChatMessage} from '@chatwidget/shared';
import type {ChatErrorKind} from '@/lib/errors';

export type {Role} from '@chatwidget/shared';

export interface ChatMessage extends SharedChatMessage {
  errorKind?: ChatErrorKind;
}
