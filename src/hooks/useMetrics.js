import useSWR from "swr";

const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
};

export function useMetrics(playerId, metricType = null) {
  const { data, error } = useSWR(
    playerId ? `/api/pwom-player?id=${playerId}` : null,
    fetcher,
    { refreshInterval: 300000, dedupingInterval: 60000 }
  );

  const loading = !error && !data;

  // Extract metrics by type
  const skills = data?.latestSnapshot?.data?.skills
    ? Object.keys(data.latestSnapshot.data.skills).map((key) => ({
        metric: key,
        name: key, // Replace with a proper name if available
        type: "skill",
      }))
    : [];
  const bosses = data?.latestSnapshot?.data?.bosses
    ? Object.keys(data.latestSnapshot.data.bosses).map((key) => ({
        metric: key,
        name: key, // Replace with a proper name if available
        type: "boss",
      }))
    : [];
  const activities = data?.latestSnapshot?.data?.activities
    ? Object.keys(data.latestSnapshot.data.activities).map((key) => ({
        metric: key,
        name: key, // Replace with a proper name if available
        type: "activity",
      }))
    : [];
  const computed = data?.latestSnapshot?.data?.computed
    ? Object.keys(data.latestSnapshot.data.computed).map((key) => ({
        metric: key,
        name: key, // Replace with a proper name if available
        type: "computed",
      }))
    : [];

  // Combine all metric lists into one array
  const allMetrics = [...skills, ...activities, ...bosses, ...computed];

  // Filter metrics by type if a metricType is provided
  const filteredMetrics = metricType
    ? allMetrics.filter((metric) => metric.type === metricType)
    : allMetrics;

  return { metrics: filteredMetrics, loading, error };
}
