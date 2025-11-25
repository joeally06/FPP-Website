'use client';

import * as React from "react"

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

const Select = ({
  value,
  onValueChange,
  children
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = React.useState(false);
  
  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
};

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className = '', children, ...props }, ref) => {
  const context = React.useContext(SelectContext);
  
  return (
    <button
      ref={ref}
      type="button"
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:ring-offset-gray-950 ${className}`}
      onClick={() => context?.setOpen(!context.open)}
      {...props}
    >
      {children}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-50"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>
  );
});
SelectTrigger.displayName = "SelectTrigger";

const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const context = React.useContext(SelectContext);
  
  // Find the selected item text
  const selectedText = context?.value || placeholder || 'Select...';
  
  return <span>{selectedText}</span>;
};
SelectValue.displayName = "SelectValue";

const SelectContent = ({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const context = React.useContext(SelectContext);
  
  if (!context?.open) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40"
        onClick={() => context.setOpen(false)}
      />
      
      {/* Dropdown */}
      <div
        className={`absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-950 ${className}`}
        {...props}
      >
        {children}
      </div>
    </>
  );
};
SelectContent.displayName = "SelectContent";

const SelectItem = ({
  value,
  children,
  className = '',
  ...props
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) => {
  const context = React.useContext(SelectContext);
  const isSelected = context?.value === value;
  
  return (
    <div
      className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-8 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-gray-800 dark:focus:bg-gray-800 ${isSelected ? 'bg-gray-100 dark:bg-gray-800' : ''} ${className}`}
      onClick={() => {
        context?.onValueChange(value);
        context?.setOpen(false);
      }}
      {...props}
    >
      {isSelected && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </span>
      )}
      {children}
    </div>
  );
};
SelectItem.displayName = "SelectItem";

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
};
