"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { CheckCircle2, XCircle, X } from "lucide-react";

interface UserInfoPanelProps {
  className?: string;
}

export function UserInfoPanel({ className = "" }: UserInfoPanelProps) {
  const { 
      user, 
      requirePayment, 
      setUser,           // ← FIXED: now destructured correctly
      validateToken 
    } = useAuth();
  const { toast } = useToast();
  const [editingClusterPoints, setEditingClusterPoints] = useState(false);
  const [tempClusterPoints, setTempClusterPoints] = useState(
    user?.cluster_points != null ? Number(user.cluster_points).toFixed(3) : "00.000"
  );

  if (!user) return null;

  const saveClusterPoints = async () => {
    const newValue = parseFloat(tempClusterPoints);

    if (isNaN(newValue) || newValue < 0 || newValue > 84) {
      toast({
        title: "Invalid Value",
        description: "Cluster points must be between 0.000 and 84.000",
        variant: "destructive",
      });
      setTempClusterPoints("00.000");
      setEditingClusterPoints(false);
      return;
    }

    const payload = { cluster_points: newValue.toFixed(3) };
    console.log("Sending PATCH:", payload);

    try {
      await apiClient.patch("/auth/profile/update/", payload);

      // Optimistic update
      setUser((prev: any) => ({
        ...prev,
        cluster_points: newValue.toFixed(3),
      }));

      // Sync with backend
      await validateToken();

      toast({
        title: "Saved",
        description: `Cluster points set to ${newValue.toFixed(3)}`,
      });
      setEditingClusterPoints(false);
    } catch (err: any) {
      console.error("PATCH error:", err.response?.data || err.message);
      toast({
        title: "Failed",
        description: "Could not save cluster points",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 border border-gray-200 dark:border-gray-700 w-full md:w-auto ${className}`}>
      {/* Logged in as */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Logged in as</span>
        <Badge variant="secondary" className="text-xs">
          {user.phone_number}
        </Badge>
      </div>

      {/* Cluster Points - Editable */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Cluster points</span>

        {editingClusterPoints ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.001"
              min="0"
              max="84"
              value={tempClusterPoints}
              onChange={(e) => setTempClusterPoints(e.target.value)}
              onBlur={saveClusterPoints}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveClusterPoints();
                }
              }}
              className="w-28 text-right text-lg font-bold border-emerald-500 focus:ring-emerald-500"
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditingClusterPoints(false);
                setTempClusterPoints(user?.cluster_points != null ? Number(user.cluster_points).toFixed(3) : "00.000");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity group"
            onClick={() => {
              setEditingClusterPoints(true);
              setTempClusterPoints(user?.cluster_points != null ? Number(user.cluster_points).toFixed(3) : "00.000");
            }}
          >
            <Badge
              variant="outline"
              className={`text-lg font-bold border-emerald-500 px-3 py-1 ${
                (Number(user?.cluster_points) || 0) <= 0
                  ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30"
                  : "text-emerald-600 dark:text-emerald-400"
              } group-hover:border-emerald-600 transition-colors`}
            >
              {(Number(user?.cluster_points) || 0).toFixed(3)}
            </Badge>
            <span className="text-xs text-red-400 ">
              Edit
            </span>
          </div>
        )}
      </div>

      {/* Subscription Status */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Subscription</span>
        {requirePayment ? (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Inactive
          </Badge>
        ) : (
          <Badge variant="default" className="bg-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Active
          </Badge>
        )}
      </div>
    </div>
  );
}