"use client";

import { useState, useEffect } from "react";

interface DashboardFrameProps {
  isDarkMode: boolean;
  children?: React.ReactNode;
}

export default function DashboardFrame({ isDarkMode, children }: DashboardFrameProps) {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1280);
    };

    // Check initial screen size
    checkScreenSize();

    // Add event listener for window resize
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const frameBackgroundStyle = {
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.50)',
    boxShadow: '0px 0px 16px 0px rgba(159, 159, 159, 0.34), 0px 0px 40px 0px rgba(204, 186, 255, 0.20) inset, 0px 0px 12px 0px rgba(204, 186, 255, 0.20) inset, 0px 0px 24px 0px rgba(204, 186, 255, 0.80) inset',
    filter: 'blur(2px)',
    backdropFilter: 'blur(4.5px)',
    transition: 'all 0.3s ease-in-out'
  };

  // For non-desktop screens, use a different logo animation that stays visible longer
  const logoAnimationStyle = isDesktop 
    ? { animation: 'logoFade 2000ms ease-out forwards' }
    : { animation: 'logoFadeDesktopOnly 3000ms ease-out forwards' };

  return (
    <div className="w-full h-full relative">
      {/* Background layer with blur effects */}
      <div 
        className="absolute inset-12"
        style={frameBackgroundStyle}
        suppressHydrationWarning={true}
        data-darkreader-ignore="true"
      />
      
      {/* Logo overlay - centered, cross-fade animation */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
        <svg 
          width="285" 
          height="48" 
          viewBox="0 0 285 48" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="opacity-0 animate-pulse"
          style={logoAnimationStyle}
        >
          <path d="M35.7948 1.98252V30.7488L0 1.28015V46.048H8.22397V17.5872L44.0187 46.7198V1.98252H35.7948Z" fill="#0C0C0B"/>
          <path d="M64.5946 1.98254H55.9609V46.048H64.5946V1.98254Z" fill="#0C0C0B"/>
          <path d="M113.876 1.98254L97.1442 32.123L80.6648 2.22683L80.5388 1.98254H71.3379L97.1758 46.6893L122.95 1.98254H113.876Z" fill="#0C0C0B"/>
          <path d="M150.489 1.3718C144.12 1.28819 137.97 3.62617 133.358 7.88458C128.746 12.143 126.039 17.983 125.817 24.1526C126.206 30.2344 128.973 35.9437 133.554 40.117C138.135 44.2904 144.186 46.6138 150.474 46.6138C156.761 46.6138 162.812 44.2904 167.393 40.117C171.974 35.9437 174.741 30.2344 175.129 24.1526C174.907 17.9883 172.206 12.153 167.601 7.89538C162.996 3.6378 156.853 1.29623 150.489 1.3718ZM150.489 39.6658C148.388 39.6662 146.308 39.2595 144.372 38.4694C142.435 37.6792 140.681 36.5218 139.213 35.0648C137.745 33.608 136.593 31.8813 135.824 29.9862C135.054 28.0912 134.684 26.0662 134.735 24.0306C134.735 19.9811 136.394 16.0974 139.349 13.234C142.304 10.3705 146.311 8.76185 150.489 8.76185C154.668 8.76185 158.675 10.3705 161.629 13.234C164.585 16.0974 166.244 19.9811 166.244 24.0306C166.295 26.0662 165.924 28.0912 165.155 29.9862C164.386 31.8813 163.234 33.608 161.765 35.0648C160.298 36.5218 158.544 37.6792 156.607 38.4694C154.67 39.2595 152.59 39.6662 150.489 39.6658Z" fill="#0C0C0B"/>
          <path d="M201.031 1.98254H185.276V46.048H201.031C219.526 46.048 229.705 38.2304 229.705 24C229.705 9.76958 219.526 1.98254 201.031 1.98254ZM201.031 39.2382H193.721V8.884H200.936C213.981 8.884 221.134 14.2891 221.134 24.1526C221.134 34.0163 213.981 39.2382 200.936 39.2382H201.031Z" fill="#0C0C0B"/>
          <path d="M257.401 1.34131L232.035 45.3457L231.626 46.0481H240.7L247.255 34.2301H267.516L273.817 45.8037V46.0481H282.987L257.401 1.34131ZM251.098 27.4813L257.401 15.9077L263.703 27.4813H251.098Z" fill="#0C0C0B"/>
          <path d="M71.3379 1.98254L97.1758 46.6893L122.95 1.98254H71.3379Z" fill="#0C0C0B"/>
          <path d="M150.489 46.6284C164.115 46.6284 175.161 36.4973 175.161 24C175.161 11.5028 164.115 1.37183 150.489 1.37183C136.863 1.37183 125.817 11.5028 125.817 24C125.817 36.4973 136.863 46.6284 150.489 46.6284Z" fill="#0C0C0B"/>
        </svg>
      </div>
      
      {/* Content layer on top - crisp and unblurred, positioned to match background */}
      <div className="absolute inset-12 z-10 p-6">
        <div className="grid gap-6 h-full">
          {children}
        </div>
      </div>
    </div>
  );
} 