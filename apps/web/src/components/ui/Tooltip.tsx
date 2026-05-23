import * as React from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import { Info } from 'lucide-react';
import { cn } from '@/lib/cn';

export const TooltipProvider = RadixTooltip.Provider;
export const TooltipRoot = RadixTooltip.Root;
export const TooltipTrigger = RadixTooltip.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof RadixTooltip.Content>,
  React.ComponentPropsWithoutRef<typeof RadixTooltip.Content>
>(({ className, sideOffset = 6, children, ...props }, ref) => (
  <RadixTooltip.Portal>
    <RadixTooltip.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 max-w-xs rounded-md bg-slate-900 px-3 py-2 text-xs text-white shadow-lg leading-relaxed',
        className,
      )}
      {...props}
    >
      {children}
      <RadixTooltip.Arrow className="fill-slate-900" width={10} height={5} />
    </RadixTooltip.Content>
  </RadixTooltip.Portal>
));
TooltipContent.displayName = 'TooltipContent';

interface InfoTooltipProps {
  content: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

/**
 * Ícono "ⓘ" con tooltip al hover/focus. Pensado para etiquetar columnas
 * o filas de un form sin agregar texto explicativo en línea.
 */
export function InfoTooltip({ content, className, ariaLabel = 'Más info' }: InfoTooltipProps) {
  return (
    <TooltipRoot delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            'inline-flex items-center justify-center rounded-full text-slate-400 hover:text-brand focus:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
            className,
          )}
        >
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </TooltipRoot>
  );
}
