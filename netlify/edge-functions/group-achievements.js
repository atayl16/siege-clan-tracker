export default async (req) => {
  const url = new URL(req.url);
  const limit = url.searchParams.get("limit") || 10;
  const offset = url.searchParams.get("offset") || 0;

  const response = await fetch(
    `https://api.wiseoldman.net/v2/groups/${process.env.WOM_GROUP_ID}/achievements?limit=${limit}&offset=${offset}`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.WOM_API_KEY}`,
      },
    }
  );

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
    },
  });
};

export const config = { cache: "manual" };
