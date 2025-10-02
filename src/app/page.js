"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";

const Dashboard = () => {
  const [rituals, setRituals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTodaysRituals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    
    const { data, error } = await supabase
      .from("rituals")
      .select(`*, performers (name)`)
      .eq("alchemist_id", user.id)
      .eq("scheduled_date", today)
      .order("execution_time", { ascending: true });

    if (error) {
      toast.error("Failed to fetch today's rituals");
      console.error("Fetch rituals error:", error);
    } else {
      setRituals(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTodaysRituals();
  }, []);

  const updateRitualStatus = async (id, status) => {
    const { error } = await supabase
      .from("rituals")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update ritual status");
    } else {
      toast.success(status === "Taken" ? "Potion administered!" : "Ritual marked as missed");
      fetchTodaysRituals();
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Taken": return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "Missed": return <XCircle className="w-5 h-5 text-destructive" />;
      default: return <Clock className="w-5 h-5 text-accent" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      Taken: "bg-green-500/20 text-green-400 border-green-500/30",
      Missed: "bg-destructive/20 text-destructive border-destructive/30",
      Upcoming: "bg-accent/20 text-accent border-accent/30",
    };
    return variants[status] || variants.Upcoming;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Sparkles className="w-8 h-8 text-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-2">
            Today's Ritual Schedule
          </h1>
          <p className="text-muted-foreground">
            Monitor and track your performers' elixir regimens
          </p>
        </div>

        {rituals.length === 0 ? (
          <div className="flex items-center justify-center h-[50vh] flex-col gap-4 text-center">
             <Sparkles className="w-16 h-16 text-muted-foreground opacity-30" />
             <h2 className="text-2xl font-semibold text-muted-foreground">No rituals scheduled for today</h2>
          </div>
        ) : (
          <div className="grid gap-4">
            {rituals.map((ritual) => (
              <Card key={ritual.id} className="bg-secondary/40 border-border/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(ritual.status)}
                      <div>
                        <CardTitle className="text-xl text-foreground">
                          {ritual.potion_name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          For Performer: <span className="text-accent">{ritual.performers.name}</span>
                        </p>
                      </div>
                    </div>
                    <Badge className={`${getStatusBadge(ritual.status)} border`}>
                      {ritual.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Dosage:</span>
                        <span className="text-foreground font-medium">{ritual.dosage}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Time:</span>
                        <span className="text-accent font-medium">{ritual.execution_time}</span>
                      </div>
                    </div>
                    {ritual.status === "Upcoming" && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => updateRitualStatus(ritual.id, "Taken")}
                          className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Mark Taken
                        </Button>
                        <Button
                          onClick={() => updateRitualStatus(ritual.id, "Missed")}
                          variant="outline"
                          className="border-destructive/30 hover:bg-destructive/10 text-destructive"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Mark Missed
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
