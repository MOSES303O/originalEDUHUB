// app/kmtc/page.tsx
export const dynamic = 'force-dynamic'; // ← Prevents static prerendering crash

import KMTCProgrammesPageContent from "@/components/KMTCProgrammesPageContent";

export default function KMTCCoursesPage() {
  return <KMTCProgrammesPageContent />;
}