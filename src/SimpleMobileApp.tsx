import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

// Simple mobile dashboard pages
function MobileOverview() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Total Accounts</h3>
          <p className="text-3xl font-bold text-blue-600">127</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Opportunities</h3>
          <p className="text-3xl font-bold text-green-600">43</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Leads</h3>
          <p className="text-3xl font-bold text-yellow-600">89</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Revenue</h3>
          <p className="text-3xl font-bold text-purple-600">$2.4M</p>
        </div>
      </div>
    </div>
  );
}

function MobileAccounts() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Accounts</h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Account List</h3>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <div>
                <p className="font-medium">Acme Corporation</p>
                <p className="text-sm text-gray-600">Enterprise</p>
              </div>
              <span className="text-green-600 font-semibold">Active</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <div>
                <p className="font-medium">Tech Solutions Inc</p>
                <p className="text-sm text-gray-600">Mid-Market</p>
              </div>
              <span className="text-green-600 font-semibold">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileOpportunities() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Opportunities</h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Pipeline</h3>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <div>
                <p className="font-medium">Enterprise Deal - Acme</p>
                <p className="text-sm text-gray-600">$150,000</p>
              </div>
              <span className="text-yellow-600 font-semibold">Negotiation</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <div>
                <p className="font-medium">Software License - TechCorp</p>
                <p className="text-sm text-gray-600">$75,000</p>
              </div>
              <span className="text-blue-600 font-semibold">Proposal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Navigation() {
  const location = useLocation();
  
  const navItems = [
    { path: '/dashboard/overview', label: 'Overview' },
    { path: '/dashboard/accounts', label: 'Accounts' },
    { path: '/dashboard/opportunities', label: 'Opportunities' },
  ];
  
  return (
    <nav className="bg-white dark:bg-gray-800 shadow-lg">
      <div className="flex justify-around p-4">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`px-4 py-2 rounded-lg font-medium ${
              location.pathname === item.path
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default function SimpleMobileApp() {
  console.log('SimpleMobileApp loading');
  
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <header className="bg-blue-600 text-white p-4">
          <h1 className="text-xl font-bold">Salesforce Dashboard</h1>
        </header>
        
        <Navigation />
        
        <main>
          <Routes>
            <Route path="/dashboard/overview" element={<MobileOverview />} />
            <Route path="/dashboard/accounts" element={<MobileAccounts />} />
            <Route path="/dashboard/opportunities" element={<MobileOpportunities />} />
            <Route path="/" element={<Navigate to="/dashboard/overview" replace />} />
            <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}