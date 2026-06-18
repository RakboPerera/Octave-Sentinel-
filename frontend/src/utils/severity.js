// ─── SEVERITY COLOR SYSTEM (Single Source of Truth) ─────────────────────────
// All components should import from here instead of defining their own maps.

export const SEVERITY_COLORS = {
  critical: { color: '#C41E3A', bg: '#FCEEF1', bgSoft: '#FEF8F8', text: '#8B0F23', label: 'CRITICAL' },
  high:     { color: '#B45309', bg: '#FEF3E2', bgSoft: '#FFFBF0', text: '#7C3A06', label: 'HIGH' },
  medium:   { color: '#185FA5', bg: '#E6F1FB', bgSoft: '#F6FAFF', text: '#185FA5', label: 'MEDIUM' },
  low:      { color: '#6B7280', bg: '#F3F4F6', bgSoft: '#F9FAFB', text: '#374151', label: 'LOW' },
};

export function getSeverityColor(severity) {
  return SEVERITY_COLORS[severity] || SEVERITY_COLORS.medium;
}
