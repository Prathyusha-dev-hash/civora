export function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={`bg-white dark:bg-[#2D3C49] rounded-2xl border border-[#E1E7EE] dark:border-[#40515F] shadow-xs transition-colors duration-150 ${
        hover ? 'transition-all duration-150 hover:shadow-md hover:border-[#7C97B0]/40 dark:hover:border-[#8FAFCB]/50' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`p-6 pb-4 border-b border-[#E1E7EE] dark:border-[#40515F] ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }) {
  return (
    <h3 className={`text-xl sm:text-2xl font-bold text-[#2E4A62] dark:text-[#F2F5F8] tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '', ...props }) {
  return (
    <p className={`text-sm sm:text-base text-[#64748B] dark:text-[#B7C3CE] mt-1.5 leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`p-6 sm:p-7 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }) {
  return (
    <div
      className={`p-5 sm:p-6 bg-[#F7F9FB] dark:bg-[#202C38] rounded-b-2xl border-t border-[#E1E7EE] dark:border-[#40515F] flex items-center justify-between text-sm sm:text-base text-[#64748B] dark:text-[#B7C3CE] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
