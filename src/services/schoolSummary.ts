// Service to fetch next-day school summary for a child
import { API_BASE } from "../config";

export type SchoolSummary = {
  summary: string;
  anomalies?: string[];
  schedule?: Array<{
    time: string;
    subject: string;
    homework?: string;
  }>;
  documents?: Array<{
    title: string;
    url: string;
  }>;
};

export async function fetchNextDaySummary(
  childSchoolIdOrUrl: string
): Promise<SchoolSummary | null> {
  try {
    // If the endpoint requires a query param, adjust accordingly
    const res = await fetch(
      `${API_BASE}/summary/next-day?school=${encodeURIComponent(childSchoolIdOrUrl)}`
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}
