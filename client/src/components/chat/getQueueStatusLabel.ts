export function getQueueStatusLabel(
  queuePosition: number | null,
  queueLength: number | null,
  isSomeoneProcessing: boolean,
): string {
  if (queuePosition !== null && queuePosition === 0 && isSomeoneProcessing) {
    return "You're next in line";
  }
  if (
    queueLength !== null &&
    queueLength > 1 &&
    queuePosition !== null &&
    queuePosition > 0
  ) {
    return `You're #${queuePosition + 1} in queue`;
  }
  return 'Waiting';
}
