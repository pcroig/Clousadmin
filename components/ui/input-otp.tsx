'use client';

import * as React from 'react';
import { OTPInput, type OTPInputProps, OTPInputContext } from 'input-otp';

import { cn } from '@/lib/utils';

const InputOTP = React.forwardRef<
  React.ElementRef<typeof OTPInput>,
  OTPInputProps
>(({ className, containerClassName, ...props }, ref) => (
  <OTPInput
    ref={ref}
    className={cn('flex w-full items-center gap-2', className)}
    containerClassName={cn('flex w-full justify-between', containerClassName)}
    {...props}
  />
));
InputOTP.displayName = 'InputOTP';

const InputOTPGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center gap-2 text-center', className)}
    {...props}
  />
));
InputOTPGroup.displayName = 'InputOTPGroup';

const InputOTPSeparator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('px-2 text-muted-foreground', className)} {...props} />
));
InputOTPSeparator.displayName = 'InputOTPSeparator';

const InputOTPSlot = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<'div'> & { index: number }
>(({ className, index, ...props }, ref) => {
  const inputOtp = React.useContext(OTPInputContext);
  const char = inputOtp?.value?.[index];
  const isActive = inputOtp?.activeInput === index;

  return (
    <div
      ref={ref}
      className={cn(
        'flex size-12 items-center justify-center rounded-lg border border-input text-xl font-semibold transition',
        isActive && 'border-primary text-primary shadow-sm ring-2 ring-primary/20',
        className
      )}
      {...props}
    >
      {char ?? ''}
    </div>
  );
});
InputOTPSlot.displayName = 'InputOTPSlot';

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot };

