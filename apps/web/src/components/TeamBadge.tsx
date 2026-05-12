import type { TeamDto } from '@liga/shared';
import { cn } from '@/lib/cn';

interface Props {
  team: Pick<TeamDto, 'name' | 'shortName' | 'logoUrl' | 'logoSvgUrl' | 'primaryColor'> | null;
  placeholder?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  ring?: boolean;
}

const sizes = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-12 w-12 text-xs',
  lg: 'h-16 w-16 text-sm',
  xl: 'h-24 w-24 text-base',
  '2xl': 'h-40 w-40 text-xl',
};

export function TeamBadge({ team, placeholder, size = 'md', className, ring = false }: Props) {
  if (!team) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full border border-dashed border-ink-300 bg-paper-200 text-ink-500 font-display tracking-widest',
          sizes[size],
          className,
        )}
        title={placeholder ?? ''}
      >
        TBD
      </div>
    );
  }

  const src = team.logoSvgUrl ?? team.logoUrl;

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full overflow-hidden bg-paper-50 shrink-0',
        sizes[size],
        ring && 'ring-1 ring-ink-100',
        className,
      )}
      title={team.name}
    >
      {src ? (
        <img src={src} alt={team.name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span
          className="flex items-center justify-center w-full h-full font-display tracking-wider text-paper-50"
          style={{ backgroundColor: team.primaryColor }}
        >
          {team.shortName}
        </span>
      )}
    </div>
  );
}
