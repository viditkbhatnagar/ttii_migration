import { Pill } from '../../shared/components/ui-kit.js';
import { stageLabel, stageTone } from './application-list-model.js';

/** Pipeline stage chip (Naji's StageBadge) — a dot plus the stage label in its semantic tone. */
export function StageBadge({ stage, className }: { stage: string; className?: string }) {
  return (
    <Pill tone={stageTone(stage)} {...(className ? { className } : {})}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-70" />
      {stageLabel(stage)}
    </Pill>
  );
}
