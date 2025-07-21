"use client";

interface DashboardFrameProps {
  isDarkMode: boolean;
  children?: React.ReactNode;
}

export default function DashboardFrame({ isDarkMode, children }: DashboardFrameProps) {
  const frameBackgroundStyle = {
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.50)',
    boxShadow: '0px 0px 16px 0px rgba(159, 159, 159, 0.34), 0px 0px 40px 0px rgba(204, 186, 255, 0.20) inset, 0px 0px 12px 0px rgba(204, 186, 255, 0.20) inset, 0px 0px 24px 0px rgba(204, 186, 255, 0.80) inset',
    filter: 'blur(2px)',
    backdropFilter: 'blur(4.5px)',
    transition: 'all 0.3s ease-in-out'
  };

  return (
    <div className="w-full h-full p-12 relative">
      {/* Background layer with blur effects */}
      <div 
        className="absolute inset-12"
        style={frameBackgroundStyle}
      />
      
      {/* Content layer on top - crisp and unblurred */}
      <div className="relative z-10 w-full h-full p-6">
        <div className="grid gap-6 h-full">
          {children}
        </div>
      </div>
    </div>
  );
} 