"use client";

import { useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatAddress } from "@/lib/utils";
import { Menu } from "lucide-react";
import { MobileSidebar } from "./MobileSidebar";

interface HeaderProps {
  title: string;
  description?: string;
  backButton?: {
    href: string;
    label: string;
  };
  actionButtons?: React.ReactNode;
}

export function Header({ title, description, backButton, actionButtons }: HeaderProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { 
    isConnected, 
    account, 
    user, 
    disconnectWallet 
  } = useWeb3();

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-red-500";
      case "Producer":
        return "bg-blue-500";
      case "Factory":
        return "bg-green-500";
      case "Retailer":
        return "bg-blue-500"; // Blue for retailer
      case "Consumer":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getHeaderBorderColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "border-red-500";
      case "Producer":
        return "border-blue-500";
      case "Factory":
        return "border-green-500";
      case "Retailer":
        return "border-blue-500";
      case "Consumer":
        return "border-purple-500";
      default:
        return "border-gray-500";
    }
  };

  const role = user?.role || "";

  return (
    <>
      <MobileSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className={`border-b-2 ${getHeaderBorderColor(role)} mb-8 pb-4`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Mobile Menu Button - Only visible below lg breakpoint (tablet portrait) */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                {backButton && (
                  <Link href={backButton.href}>
                    <Button variant="ghost" size="sm">
                      ← {backButton.label}
                    </Button>
                  </Link>
                )}
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {title}
                </h1>
                {user && (
                  <Badge className={getRoleColor(role)}>
                    {role}
                  </Badge>
                )}
              </div>
              {description && (
                <p className="text-muted-foreground mt-2">
                  {description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {actionButtons}
            {/* Desktop wallet info - hidden on mobile since it's in sidebar */}
            {isConnected && account && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
                <span className="text-sm text-muted-foreground">Wallet:</span>
                <span className="text-sm font-mono font-medium">
                  {formatAddress(account)}
                </span>
              </div>
            )}
            {isConnected && (
              <Button 
                onClick={() => disconnectWallet()} 
                variant="outline" 
                size="sm"
                className="hidden lg:inline-flex"
              >
                Disconnect
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

