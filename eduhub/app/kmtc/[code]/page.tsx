import { fetchKMTCProgrammes, fetchKMTCProgrammeByCode } from "@/lib/api";
import KMTCProgrammeDetailClient from "@/components/kmtc-programme-detail-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building2, GraduationCap } from "lucide-react";
import type { NextPage } from "next";

// Fetch initial data for the specific programme
async function fetchInitialData(code: string) {
  try {
    const programme = await fetchKMTCProgrammeByCode(code);

    if (!programme) {
      console.error("[fetchInitialData] Programme not found for code:", code);
      return { programme: null, error: "Programme not found" };
    }

    return { programme, error: null };
  } catch (error: any) {
    console.error("[fetchInitialData] Error loading programme:", error);
    return { programme: null, error: "Failed to load programme details. Please try again later." };
  }
}

// Generate static params from all programme codes
export async function generateStaticParams() {
  try {
    console.log("[generateStaticParams] Fetching all KMTC programmes for static generation");
    const programmes = await fetchKMTCProgrammes();

    if (!Array.isArray(programmes)) {
      console.error("[generateStaticParams] Invalid programmes data:", programmes);
      return [];
    }

    const params = programmes
      .filter((prog) => prog.code && typeof prog.code === "string")
      .map((prog) => ({
        code: prog.code, // [code] dynamic segment
      }));

    console.log(`[generateStaticParams] Generated ${params.length} static paths`);
    return params;
  } catch (error: any) {
    console.error("[generateStaticParams] Failed to generate params:", error);
    return [];
  }
}

const KMTCProgrammeDetailPage: NextPage<{ params: Promise<{ code: string }> }> = async ({ params }) => {
  const { code } = await params;
  console.log("[KMTCProgrammeDetailPage] Loading programme with code:", code);

  const { programme, error } = await fetchInitialData(code);

  return (
    <>
      {/* Top Right Navigation Bar */}
      <div className="fixed top-16 right-4 z-40 flex gap-3">
        <Button variant="outline" size="sm" asChild className="shadow-lg bg-white dark:bg-gray-800">
          <Link href="/kmtc/faculties">
            <Building2 className="mr-2 h-4 w-4" />
            All Faculties
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild className="shadow-lg bg-white dark:bg-gray-800">
          <Link href="/kmtc/departments">
            <GraduationCap className="mr-2 h-4 w-4" />
            All Departments
          </Link>
        </Button>
      </div>

      <KMTCProgrammeDetailClient
        initialProgramme={programme}
        initialError={error}
        programmeCode={code}
      />
    </>
  );
};

// Force dynamic for unmatched codes (fallback)
export const dynamic = "force-dynamic";

export default KMTCProgrammeDetailPage;