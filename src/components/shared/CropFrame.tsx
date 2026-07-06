/**
 * CropFrame is now a transparent passthrough. The Phantom design system dropped
 * the "typeset proof" crop-mark device; this wrapper is kept (with its original
 * props interface) so existing importers keep compiling until they are cleaned up.
 *
 * @param className - Classes applied to the wrapping element.
 */
export function CropFrame({
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}
