Web Request Metrics Summary
This document provides an interpretation of the performance metrics for a web request.
Request Information
Request ID: 16a1978-d278-4530-ba64-5e00c72ed88d
Date: Nov 10, 2025 19:28:18
Status: 200 (Successful)
Method: GET
Host: acme-shop.com
Pathname: /bikes/city/cargo
Region: Washington D.C. iad
Performance Analysis
Total Latency: The total time for the request was 703ms.
Timing Breakdown: The latency is broken down into the following phases:
DNS: 43ms (6.1%) - Time taken to resolve the domain name.
Connection: 186ms (26.5%) - Time to establish a TCP connection.
TLS: 53ms (7.5%) - Time for the TLS handshake.
TTFB (Time to First Byte): 415ms (59.0%) - The largest portion of the latency, representing the time from the request being sent to the first byte of the response being received. This indicates a potential delay on the server side.
Transfer: 5ms (<1%) - Time taken to download the full response after the first byte was received.
Server Details: The request was served by Cloudflare.
Cache-Control: The response headers indicate that the content is not to be cached (no-cache, no-store, must-revalidate).


|            |                |  /breadcrumb  [ cmd search]              | 
|main Sidebar| filter Sidebar | [search table]                           |
|.           |                |  <Table Content>.                        |
|.           |.               |                                          |


import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Link } from 'react-router-dom';

const DashboardLayout = () => (
  <div>
    <h1>Dashboard</h1>
    <nav>
      {/* Navigation links for partial routes within the dashboard */}
      <Link to="/dashboard/overview">Overview</Link>
      <Link to="/dashboard/reports">Reports</Link>
    </nav>
    <Outlet /> {/* This is where nested route components will render */}
  </div>
);

const OverviewComponent = () => <h2>Dashboard Overview</h2>;
const ReportsComponent = () => <h2>Dashboard Reports</h2>;
const HomePage = () => <h2>Welcome to the Home Page!</h2>;

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route path="overview" element={<OverviewComponent />} />
          <Route path="reports" element={<ReportsComponent />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;