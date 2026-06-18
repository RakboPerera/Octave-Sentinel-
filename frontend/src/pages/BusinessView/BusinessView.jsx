import React from 'react';
import BusinessViewLanding from './BusinessViewLanding.jsx';

// ─── BUSINESS VIEW ROUTE SHELL ───────────────────────────────────────────────
// Landing grid is the default. Deep-dive pages render via /business-view/:domainId
// which is a separate route in App.jsx. This component only handles the landing.
export default function BusinessView() {
  return <BusinessViewLanding />;
}
