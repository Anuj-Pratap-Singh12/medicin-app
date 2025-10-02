"use client";

import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Target } from "lucide-react";

const WellnessPage = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Wellness Rate Dashboard
          </h1>
          <p className="text-muted-foreground">
            Track adherence patterns and ritual completion rates
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-card/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Weekly Average
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0%</div>
              <p className="text-xs text-muted-foreground">
                Adherence rate over last 7 days
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rituals</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Completed this week
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/80">
          <CardHeader>
            <CardTitle>Weekly Ritual Status (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Chart data will be displayed here.</p>
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
};

export default WellnessPage;