import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { useLanguage } from '../../context/useLanguage';
import { FirstVisitLanguagePage } from '../../features/language/FirstVisitLanguagePage';

export function AppShell() {
  const { isLanguageConfirmed } = useLanguage();

  if (!isLanguageConfirmed) {
    return <FirstVisitLanguagePage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FB] dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] font-sans transition-colors duration-200">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default AppShell;
