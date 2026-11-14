const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

const buckets = new Map();
function allowedRequest(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const source = new URL(origin);
    const host = new URL(request.url);
    return source.origin === host.origin;
  } catch { return false; }
}
function rateAllowed(request) {
  const forwarded = request.headers.get("x-nf-client-connection-ip") ||
    request.headers.get("x-forwarded-for") || "unknown";
  const ip = forwarded.split(",")[0].trim();
  const now = Date.now();
  const entry = buckets.get(ip) || { start: now, count: 0 };
  if (now - entry.start > 60_000) { entry.start = now; entry.count = 0; }
  entry.count += 1;
  buckets.set(ip, entry);
  return entry.count <= 12;
}
function decodeXml(value = "") {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}
function tags(xml, tag) {
  return [...xml.matchAll(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)</" + tag + ">", "g"))]
    .map(match => decodeXml(match[1].replace(/<[^>]+>/g, " ").replace(/\\s+/g, " ").trim()));
}
async function pubmedSearch(query) {
  const url = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi");
  url.search = new URLSearchParams({ db: "pubmed", term: query, retmax: "8", sort: "relevance", retmode: "json" });
  const search = await fetch(url, { headers: { "user-agent": "MBBS-Command-Center/1.0 (educational app)" } });
  if (!search.ok) throw new Error("PubMed search is temporarily unavailable.");
  const data = await search.json();
  const ids = data?.esearchresult?.idlist || [];
  if (!ids.length) return { answer: "No PubMed records matched that search.", papers: [] };
  const detailsUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi");
  detailsUrl.search = new URLSearchParams({ db: "pubmed", id: ids.join(","), retmode: "json" });
  const details = await fetch(detailsUrl, { headers: { "user-agent": "MBBS-Command-Center/1.0 (educational app)" } });
  if (!details.ok) throw new Error("PubMed details are temporarily unavailable.");
  const summary = await details.json();
  const papers = ids.map(id => {
    const item = summary?.result?.[id];
    if (!item) return null;
    return {
      pmid: id,
      title: item.title || "Untitled article",
      authors: (item.authors || []).slice(0, 4).map(a => a.name).join(", "),
      journal: item.fulljournalname || item.source || "",
      year: item.pubdate || "",
      url: "https://pubmed.ncbi.nlm.nih.gov/" + id + "/"
    };
  }).filter(Boolean);
  return { answer: "PubMed returned " + papers.length + " relevant record(s). Check each paper's abstract and study design before applying its findings.", papers };
}

export default async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "POST") return json({ error: "Use POST for this endpoint." }, 405);
  if (!allowedRequest(request)) return json({ error: "Request origin not allowed." }, 403);
  if (!rateAllowed(request)) return json({ error: "Too many requests. Please wait one minute and try again." }, 429);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON request." }, 400); }
  const mode = body?.mode;
  if (mode === "pubmed") {
    const query = String(body.query || "").trim().slice(0, 300);
    if (!query) return json({ error: "Enter a PubMed search query." }, 400);
    try { return json(await pubmedSearch(query)); }
    catch (error) { return json({ error: error.message || "PubMed search failed." }, 502); }
  }
  if (mode !== "chat") return json({ error: "Unsupported request mode." }, 400);

  const question = String(body.message || "").trim();
  if (!question || question.length > 6000) return json({ error: "Enter a question under 6,000 characters." }, 400);
  const accessCode = process.env.APP_ACCESS_CODE;
  if (!accessCode) return json({ error: "The app access code is not configured in Netlify yet." }, 503);
  if (request.headers.get("x-app-access-code") !== accessCode) return json({ error: "Access code is incorrect. Check the code configured by the app owner." }, 401);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return json({ error: "The secure AI service is not configured yet. Add OPENAI_API_KEY in Netlify environment variables." }, 503);

  const context = String(body.context || "").trim().slice(0, 12000);
  const instructions = [
    "You are the medical learning assistant inside MBBS Command Center.",
    "Teach undergraduate medical topics clearly, step by step, and distinguish established facts from uncertainty.",
    "Never invent textbook quotations, editions, chapter numbers, page numbers, papers, DOIs, or citations.",
    "If the user provides textbook excerpts, cite only the exact book/chapter/page metadata supplied with those excerpts. If none is supplied, say that a precise textbook citation cannot be verified and name no fabricated page.",
    "Do not claim to have searched PubMed unless the PubMed search mode supplied actual records.",
    "For clinical or treatment questions, state that the answer is educational and not a substitute for a qualified clinician; highlight emergencies and uncertainty.",
    "Prefer a concise structure: Core concept, Mechanism/steps, Clinical relevance, Exam points, References/verification."
  ].join("\\n");
  const input = context ? "User-provided study excerpts (not independently verified):\\n" + context + "\\n\\nQuestion: " + question : question;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "authorization": "Bearer " + apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-6-luna",
        instructions,
        input,
        max_output_tokens: 1400
      })
    });
    const result = await response.json();
    if (!response.ok) {
      const message = result?.error?.message || "The AI provider returned an error.";
      return json({ error: message }, response.status === 429 ? 429 : 502);
    }
    const answer = result.output_text || (result.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text).join("\\n");
    if (!answer) return json({ error: "The AI returned an empty response. Please try again." }, 502);
    return json({ answer });
  } catch {
    return json({ error: "Could not reach the AI service. Check the connection and try again." }, 502);
  }
};

export const config = { path: "/api/medical-ai" };
