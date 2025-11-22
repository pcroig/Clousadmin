'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

const StepperContext = React.createContext<{
  value: number;
  onChange?: (value: number) => void;
}>({
  value: 1,
});

const useStepper = () => {
  const context = React.useContext(StepperContext);
  if (!context) {
    throw new Error('useStepper must be used within a Stepper');
  }
  return context;
};

interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: number;
  value?: number;
  onValueChange?: (value: number) => void;
}

const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  ({ className, defaultValue = 1, value, onValueChange, children, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const currentValue = value ?? internalValue;

    const handleChange = (newValue: number) => {
      if (value === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    };

    return (
      <StepperContext.Provider value={{ value: currentValue, onChange: handleChange }}>
        <div ref={ref} className={cn('w-full', className)} {...props}>
          {children}
        </div>
      </StepperContext.Provider>
    );
  }
);
Stepper.displayName = 'Stepper';

const StepperNav = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('flex items-center', className)} {...props} />;
  }
);
StepperNav.displayName = 'StepperNav';

const StepperItemContext = React.createContext<{
  step: number;
  state: 'inactive' | 'active' | 'complete';
}>({
  step: 1,
  state: 'inactive',
});

interface StepperItemProps extends React.HTMLAttributes<HTMLDivElement> {
  step: number;
}

const StepperItem = React.forwardRef<HTMLDivElement, StepperItemProps>(
  ({ className, step, ...props }, ref) => {
    const { value } = useStepper();
    const state = step < value ? 'complete' : step === value ? 'active' : 'inactive';

    return (
      <StepperItemContext.Provider value={{ step, state }}>
        <div
          ref={ref}
          className={cn('group/step', className)}
          data-state={state}
          {...props}
        />
      </StepperItemContext.Provider>
    );
  }
);
StepperItem.displayName = 'StepperItem';

const StepperTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const { onChange } = useStepper();
  const { step, state } = React.useContext(StepperItemContext);

  return (
    <button
      ref={ref}
      type="button"
      className={cn('flex items-center w-full', className)}
      onClick={() => onChange?.(step)}
      data-state={state}
      {...props}
    />
  );
});
StepperTrigger.displayName = 'StepperTrigger';

const StepperIndicator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { state } = React.useContext(StepperItemContext);

    return (
      <div
        ref={ref}
        className={cn('transition-colors', className)}
        data-state={state}
        {...props}
      />
    );
  }
);
StepperIndicator.displayName = 'StepperIndicator';

const StepperTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn('text-sm font-medium transition-colors', className)}
      {...props}
    />
  );
});
StepperTitle.displayName = 'StepperTitle';

const StepperContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: number }>(
  ({ className, value, children, ...props }, ref) => {
    const { value: currentValue } = useStepper();
    
    if (currentValue !== value) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn('mt-4', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
StepperContent.displayName = 'StepperContent';

const StepperPanel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('', className)} {...props} />;
  }
);
StepperPanel.displayName = 'StepperPanel';

export {
  Stepper,
  StepperNav,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperTitle,
  StepperContent,
  StepperPanel,
};

