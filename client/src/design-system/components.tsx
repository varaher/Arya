import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { Mic } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("arya-shell", className)} {...props}>
      {children}
    </div>
  );
}

export function GlassDock({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <nav className={cn("arya-glass-dock", className)} {...props}>
      {children}
    </nav>
  );
}

interface PageHeadingProps extends HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
  className,
  ...props
}: PageHeadingProps) {
  return (
    <div className={cn("arya-page-heading", className)} {...props}>
      {eyebrow && <p className="arya-page-heading__eyebrow">{eyebrow}</p>}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="arya-page-heading__title">{title}</h1>
          {description && <p className="arya-page-heading__description mt-2">{description}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

export function SurfaceCard({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("arya-surface-card", className)} {...props}>
      {children}
    </section>
  );
}

interface SettingsRowProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  title: string;
  detail?: string;
  trailing?: ReactNode;
}

export function SettingsRow({
  icon,
  title,
  detail,
  trailing,
  className,
  type = "button",
  ...props
}: SettingsRowProps) {
  return (
    <button type={type} className={cn("arya-settings-row", className)} {...props}>
      {icon && <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--arya-primary-soft)] text-[var(--arya-primary)]">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        {detail && <span className="mt-0.5 block truncate text-xs text-[var(--arya-text-muted)]">{detail}</span>}
      </span>
      {trailing && <span className="shrink-0">{trailing}</span>}
    </button>
  );
}

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Switch({ checked, onCheckedChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      data-checked={checked}
      className="arya-switch disabled:cursor-not-allowed disabled:opacity-50"
      onClick={() => onCheckedChange(!checked)}
    >
      <span className="arya-switch__thumb" aria-hidden="true" />
    </button>
  );
}

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: BottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className={cn("arya-bottom-sheet mx-auto max-h-[85dvh] max-w-xl overflow-y-auto", className)}>
        <div className="arya-bottom-sheet__handle" aria-hidden="true" />
        <SheetTitle className="text-left text-lg">{title}</SheetTitle>
        {description && <SheetDescription className="mt-1 text-left">{description}</SheetDescription>}
        <div className="mt-5">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

interface VoiceLaunchProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export function VoiceLaunch({
  label = "Start voice conversation",
  className,
  type = "button",
  ...props
}: VoiceLaunchProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn("arya-voice-launch", className)}
      {...props}
    >
      <Mic aria-hidden="true" className="size-5" />
    </button>
  );
}
