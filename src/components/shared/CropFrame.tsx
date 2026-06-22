import { cn } from '@/lib/utils';

/**
 * CropFrame wraps content in print-proof registration ("crop") marks at all
 * four corners — the signature device of Vitex's "typeset proof" identity.
 *
 * The element itself should carry its own border/background; the crop marks are
 * drawn just outside it. Two corners come from CSS pseudo-elements (.crop-frame)
 * and the remaining two from the rendered corner spans below.
 *
 * @param as - Element/component to render as the frame (defaults to 'div').
 * @param className - Additional classes for the frame element.
 */
export function CropFrame({
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('crop-frame', className)} {...rest}>
      <span className="crop-tr" aria-hidden />
      <span className="crop-bl" aria-hidden />
      {children}
    </div>
  );
}
