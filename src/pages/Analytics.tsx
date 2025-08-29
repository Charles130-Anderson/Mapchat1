import { Helmet } from "react-helmet-async";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Download, ShieldCheck } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { ExportButtons } from "@/components/analytics/ExportButtons";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";



// Demo data (replace with ChatGPT/Supabase powered data)
const kpis = [
  { label: "Queries", value: 12540 },
  { label: "Avg Tokens", value: 287 },
  { label: "Pos. Sent", value: "72%" },
  { label: "Neg. Sent", value: "18%" },
];

const lineData = [
  { date: "Mon", value: 120 },
  { date: "Tue", value: 200 },
  { date: "Wed", value: 150 },
  { date: "Thu", value: 300 },
  { date: "Fri", value: 280 },
  { date: "Sat", value: 220 },
  { date: "Sun", value: 190 },
];

const categories = [
  { name: "AI", value: 42 },
  { name: "Health", value: 26 },
  { name: "Coding", value: 18 },
  { name: "Finance", value: 14 },
];

const sentiments = [
  { name: "Positive", value: 72, color: "hsl(var(--success))" },
  { name: "Neutral", value: 10, color: "hsl(var(--muted-foreground))" },
  { name: "Negative", value: 18, color: "hsl(var(--destructive))" },
];

const words = [
  { text: "chatgpt", value: 80 },
  { text: "api", value: 70 },
  { text: "data", value: 50 },
  { text: "analytics", value: 45 },
  { text: "python", value: 30 },
  { text: "mapping", value: 25 },
  { text: "leaflet", value: 20 },
  { text: "community", value: 18 },
  { text: "participation", value: 16 },
];

// Heatmap demo: days x hours with random counts
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
const heatmap = days.map((d) => ({
  day: d,
  values: hours.map((h) => ({ hour: h, count: Math.floor(Math.random() * 10) })),
}));


export default function Analytics() {
  const { isPro } = useSubscription();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [commentsData, setCommentsData] = useState({
    totalComments: 0,
    sentimentBreakdown: [
      { name: "Positive", value: 0, color: "hsl(var(--success))" },
      { name: "Neutral", value: 0, color: "hsl(var(--muted-foreground))" },
      { name: "Negative", value: 0, color: "hsl(var(--destructive))" },
    ]
  });

  const lineRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const heatRef = useRef<HTMLDivElement>(null);
  const pieRef = useRef<HTMLDivElement>(null);
  const cloudRef = useRef<HTMLDivElement>(null);
  const sentimentRef = useRef<HTMLDivElement>(null);

  // Fetch real comments data for Pro users
  useEffect(() => {
    if (isPro) {
      const fetchCommentsAnalytics = async () => {
        try {
          const { data: comments } = await supabase
            .from('feature_comments')
            .select('sentiment_category')
            .not('sentiment_category', 'is', null);

          if (comments) {
            const totalComments = comments.length;
            const sentimentCounts = comments.reduce((acc, comment) => {
              const sentiment = comment.sentiment_category || 'Neutral';
              acc[sentiment] = (acc[sentiment] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            const total = totalComments || 1; // Avoid division by zero
            setCommentsData({
              totalComments,
              sentimentBreakdown: [
                { name: "Positive", value: Math.round((sentimentCounts.Positive || 0) / total * 100), color: "hsl(var(--success))" },
                { name: "Neutral", value: Math.round((sentimentCounts.Neutral || 0) / total * 100), color: "hsl(var(--muted-foreground))" },
                { name: "Negative", value: Math.round((sentimentCounts.Negative || 0) / total * 100), color: "hsl(var(--destructive))" },
              ]
            });
          }
        } catch (error) {
          console.error('Error fetching comments analytics:', error);
        }
      };

      fetchCommentsAnalytics();
    }
  }, [isPro]);
  


  const exportDashboardPdf = async () => {
    if (!isPro) {
      toast({ title: "Pro feature", description: "Upgrade to export the full dashboard as PDF." });
      return;
    }
    if (!dashboardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(dashboardRef.current, { backgroundColor: "#ffffff", scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
      const imgWidth = canvas.width * ratio;
      const imgHeight = canvas.height * ratio;
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;
      pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
      pdf.save("ai-analytics-dashboard.pdf");
    } finally {
      setDownloading(false);
    }
  };

  const pieColors = sentiments.map((s) => s.color);

  const fontSizeMapper = (word: { value: number }) => Math.max(14, Math.log2(word.value) * 7 + 14);
  

  return (
    <div className="container py-8">
      <Helmet>
        <title>AI Analytics Dashboard |Mapchat CPMT</title>
        <meta name="description" content="AI Analytics dashboard for community participation mapping: KPIs, trends, categories, heatmap, sentiment, word cloud." />
        <link rel="canonical" href="/analytics" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "AI Analytics Dashboard",
          description: "KPIs and insights for community mapping data",
        })}</script>
      </Helmet>

      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">AI Analytics Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button onClick={exportDashboardPdf} disabled={downloading}>
            <Download className="mr-2" /> Export PDF
          </Button>
          {!isPro && (
            <div className="flex items-center text-sm text-muted-foreground">
              <ShieldCheck className="mr-1" /> Pro only
            </div>
          )}
        </div>
      </header>

      <main ref={dashboardRef}>
        {/* KPI Cards */}
        <section aria-label="Key metrics" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <Card key={k.label} className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{k.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{k.value}</div>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Middle Row */}
        <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card ref={lineRef as any}>
            <CardHeader className="flex items-center justify-between space-y-0">
              <CardTitle>Queries Over Time</CardTitle>
              <ExportButtons targetRef={lineRef as any} fileBase="queries-over-time" json={{ type: "line", data: lineData }} isPro={isPro} />
            </CardHeader>
            <CardContent className="pt-4">
              <ChartContainer config={{}} className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card ref={barRef as any}>
            <CardHeader className="flex items-center justify-between space-y-0">
              <CardTitle>Top Categories</CardTitle>
              <ExportButtons targetRef={barRef as any} fileBase="top-categories" json={{ type: "bar", data: categories }} isPro={isPro} />
            </CardHeader>
            <CardContent className="pt-4">
              <ChartContainer config={{}} className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categories}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      <Cell fill="hsl(var(--primary))" />
                      <Cell fill="hsl(var(--success))" />
                      <Cell fill="hsl(var(--warning))" />
                      <Cell fill="hsl(var(--destructive))" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>

        {/* Bottom Row */}
        <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card ref={heatRef as any}>
            <CardHeader className="flex items-center justify-between space-y-0">
              <CardTitle>Activity Heatmap</CardTitle>
              <ExportButtons targetRef={heatRef as any} fileBase="activity-heatmap" json={{ type: "heatmap", data: heatmap }} isPro={isPro} />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(25, minmax(0, 1fr))" }}>
                {/* Hours header */}
                <div />
                {hours.map((h) => (
                  <div key={h} className="text-[10px] text-muted-foreground text-center">{h.replace(":00", "")}</div>
                ))}
                {heatmap.map((row) => (
                  <div key={row.day} className="contents">
                    <div className="text-xs text-muted-foreground">{row.day}</div>
                    {row.values.map((v, idx) => {
                      const intensity = v.count / 10; // 0..1
                      const bg = `hsl(var(--primary) / ${0.1 + intensity * 0.9})`;
                      return <div key={idx} style={{ background: bg }} className="h-4 rounded" title={`${row.day} ${v.hour}: ${v.count}`} />;
                    })}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card ref={pieRef as any}>
            <CardHeader className="flex items-center justify-between space-y-0">
              <CardTitle>Sentiment Breakdown</CardTitle>
              <ExportButtons targetRef={pieRef as any} fileBase="sentiment-breakdown" json={{ type: "pie", data: sentiments }} isPro={isPro} />
            </CardHeader>
            <CardContent className="pt-4">
              <ChartContainer config={{}} className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sentiments} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
                      {sentiments.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>

        {/* Comments Sentiment Analysis (Pro Only) */}
        {isPro && (
          <section className="mb-6">
            <Card ref={sentimentRef as any}>
              <CardHeader className="flex items-center justify-between space-y-0">
                <CardTitle>
                  Spatial Comments Sentiment Analysis
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({commentsData.totalComments} comments analyzed)
                  </span>
                </CardTitle>
                <ExportButtons 
                  targetRef={sentimentRef as any} 
                  fileBase="comments-sentiment-analysis" 
                  json={{ type: "comments_sentiment", data: commentsData }} 
                  isPro={isPro} 
                />
              </CardHeader>
              <CardContent className="pt-4">
                <ChartContainer config={{}} className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={commentsData.sentimentBreakdown} 
                        dataKey="value" 
                        nameKey="name" 
                        innerRadius={60} 
                        outerRadius={100}
                      >
                        {commentsData.sentimentBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Word Cloud */}
        <section>
          <Card ref={cloudRef as any}>
            <CardHeader className="flex items-center justify-between space-y-0">
              <CardTitle>Word Cloud</CardTitle>
              <ExportButtons targetRef={cloudRef as any} fileBase="word-cloud" json={{ type: "wordcloud", data: words }} isPro={isPro} />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="min-h-[240px] w-full flex flex-wrap items-center justify-center gap-3">
                {words.map((w) => {
                  const size = Math.round(fontSizeMapper({ value: w.value } as any));
                  const weight = w.value > 60 ? "font-extrabold" : w.value > 40 ? "font-bold" : "font-medium";
                  return (
                    <span
                      key={w.text}
                      className={weight}
                      style={{ fontSize: `${size}px`, color: "hsl(var(--foreground))" }}
                      aria-label={`${w.text} (${w.value})`}
                    >
                      {w.text}
                    </span>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="mt-8 text-sm text-muted-foreground">
        Tip: Connect ChatGPT via Supabase Edge Functions to generate these insights from real data.
      </footer>
    </div>
  );
}
