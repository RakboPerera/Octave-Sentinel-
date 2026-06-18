import React from 'react';
import BusinessSidebar from './BusinessSidebar.jsx';

// ─── SIDEBAR (post-agent-platform removal) ───────────────────────────────────
// The Agent Platform view has been removed. The only authenticated surface
// is the Business Platform, so Sidebar is now a thin passthrough to
// BusinessSidebar. Kept as a named export so App.jsx doesn't need to change
// its import path.

export default function Sidebar() {
  return <BusinessSidebar />;
}
