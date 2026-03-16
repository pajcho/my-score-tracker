import type { ComponentType, ReactNode, SVGProps } from 'react';
import { cn } from '@/lib/utils';

type HeaderIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: HeaderIconComponent;
  status?: ReactNode;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  hideIconOnMobile?: boolean;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  status,
  actions,
  className,
  contentClassName,
  titleClassName,
  descriptionClassName,
  hideIconOnMobile = true,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 md:flex-row md:items-center md:justify-between', className)}>
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        {Icon ? (
          <div className={cn('shrink-0 text-primary', hideIconOnMobile ? 'hidden sm:block' : 'block')}>
            <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
          </div>
        ) : null}
        <div className={cn('min-w-0', contentClassName)}>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <h1 className={cn('truncate text-2xl font-bold leading-tight sm:text-3xl', titleClassName)}>{title}</h1>
            {status ? <div className="shrink-0">{status}</div> : null}
          </div>
          {description ? (
            <p className={cn('mt-1 max-w-2xl text-base text-muted-foreground sm:text-lg', descriptionClassName)}>
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex items-center gap-3 text-sm">{actions}</div> : null}
    </div>
  );
}
