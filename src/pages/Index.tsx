import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/assets/mapchat-logo.png";
const Index = () => {
  const { user } = useAuth();

  return (
    <main className="relative min-h-[80vh] flex items-center">
      <Helmet>
        <title>Mapchat CPMT - A Community Participatory Mapping Tool (Mapchat CPMT)</title>
        <meta
          name="description"
          content="Map points, polygons, and polylines collaboratively. Upload CSV/GeoJSON, export CSV/KML, and unlock AI analytics with Pro."
        />
        <link rel="canonical" href={window.location.origin + "/"} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'Mapchat CPMT - A Community Participatory Mapping Tool',
          applicationCategory: 'GeographicInformationSystem',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
        })}</script>
      </Helmet>
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-accent/10 to-background" />
      <div className="container relative z-10 py-16 text-center">
        {/* Circular logo above the title */}
        <div className="mx-auto mb-7 w-32 h-32 rounded-full bg-[rgb(248,250,252)] flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.25)]">
          <img src={Logo} alt="Mapchat CPMT Logo" className="max-w-[70%] max-h-[70%]" />
        </div>
        <h1 className="text-2xl md:text-4xl font-bold tracking-tight mb-2">
          Mapchat CPMT - A Community Participatory Mapping Tool
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground text-lg md:text-xl mb-8">
          Create maps together. Draw points, lines, and polygons, gather feedback, and export your data. Upgrade for AI insights and unlimited mapping.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button asChild>
            <Link to="/map">Open Map</Link>
          </Button>
          {!user && (
            <Button asChild variant="outline">
              <Link to="/auth">Sign In</Link>
            </Button>
          )}
          <Button asChild variant="secondary">
            <Link to="/pricing">View Pricing</Link>
          </Button>
        </div>
      </div>
    </main>
  );
};

export default Index;
