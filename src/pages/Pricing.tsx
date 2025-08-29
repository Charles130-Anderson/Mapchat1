import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    features: [
      "View public maps",
      "Add up to 20 markers/month",
      "Basic CSV export",
      "Basic AI summary (limited)",
    ],
    cta: "Get Started",
  },
  {
    name: "Pro",
    price: "$9.99",
    period: "/mo",
    features: [
      "Unlimited markers",
      "AI analytics dashboard",
      "CSV/PDF/KML exports",
      "Private maps & scheduled reports",
    ],
    cta: "Go Pro",
    highlighted: true,
  },
  {
    name: "Team",
    price: "$49",
    period: "/mo",
    features: [
      "Multi-user collaboration",
      "API access",
      "Priority support",
      "Advanced AI credits & bulk uploads",
    ],
    cta: "Contact Sales",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: [
      "Custom integrations & SSO",
      "SLA & dedicated support",
      "White-label branding",
    ],
    cta: "Talk to Us",
  },
];

const Pricing = () => {
  return (
    <main className="container py-10">
      <Helmet>
        <title>Mapchat CPMT Pricing — Free, Pro, Team, Enterprise</title>
        <meta
          name="description"
          content="Compare Mapchat CPMT plans: Free, Pro, Team, Enterprise. Unlock unlimited markers, AI analytics, and advanced exports."
        />
        <link rel="canonical" href={window.location.origin + "/pricing"} />
      </Helmet>
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Pricing</h1>
      <p className="mb-10 text-muted-foreground max-w-2xl">
        Choose the plan that fits your mapping needs. Upgrade anytime. Pro includes a 14-day free trial.
      </p>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {tiers.map((tier) => (
          <Card key={tier.name} className={tier.highlighted ? "border-primary shadow-sm" : undefined}>
            <CardHeader>
              <CardTitle>{tier.name}</CardTitle>
              <CardDescription>
                <span className="text-3xl font-semibold">{tier.price}</span>
                <span className="text-muted-foreground">{tier.period}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="mb-6 space-y-2 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="text-muted-foreground">• {f}</li>
                ))}
              </ul>
              <Button
                className="w-full"
                onClick={() =>
                  toast({
                    title: tier.name === "Pro" ? "Pro checkout coming up" : `${tier.name} selected`,
                    description:
                      tier.name === "Pro"
                        ? "Connect Stripe + Supabase to enable subscriptions."
                        : "We'll guide you through next steps soon.",
                  })
                }
              >
                {tier.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
};

export default Pricing;
