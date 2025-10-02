"use client";

import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

const PerformersPage = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Circus Performers
            </h1>
            <p className="text-muted-foreground">
              Manage your troupe and their elixir needs
            </p>
          </div>
          <div>
            <Button>+ Add Performer</Button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center text-center h-[50vh] bg-card/50 rounded-lg border-2 border-dashed border-border">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-xl font-semibold text-foreground">
            No performers in your troupe yet
          </p>
          <p className="text-muted-foreground mt-2">Add your first performer to begin tracking their potions.</p>
        </div>
      </div>
    </Layout>
  );
};

export default PerformersPage;