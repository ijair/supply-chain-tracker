"use client";

import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatAddress } from "@/lib/utils";
import { X, LayoutDashboard, Package, ArrowLeftRight, User, Settings } from "lucide-react";
import { usePathname } from "next/navigation";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const { 
    isConnected, 
    account, 
    user, 
    disconnectWallet 
  } = useWeb3();
  const pathname = usePathname();

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-red-500";
      case "Producer":
        return "bg-blue-500";
      case "Factory":
        return "bg-green-500";
      case "Retailer":
        return "bg-yellow-500";
      case "Consumer":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  const handleLinkClick = () => {
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed left-0 top-0 h-full w-80 bg-background border-r shadow-xl z-50 transform transition-transform duration-300 ease-in-out
          lg:hidden
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Menu</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User Info */}
          {isConnected && account && user && (
            <div className="p-4 border-b bg-muted/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <Badge className={getRoleColor(user.role)}>
                    {user.role}
                  </Badge>
                  <div className="mt-1">
                    <div className="text-xs text-muted-foreground">Wallet Address</div>
                    <div className="text-sm font-mono font-medium truncate">
                      {formatAddress(account)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            <Link href="/dashboard" onClick={handleLinkClick}>
              <Button
                variant={isActive("/dashboard") ? "default" : "ghost"}
                className="w-full justify-start gap-3"
              >
                <LayoutDashboard className="h-5 w-5" />
                Dashboard
              </Button>
            </Link>

            <Link href="/token" onClick={handleLinkClick}>
              <Button
                variant={isActive("/token") ? "default" : "ghost"}
                className="w-full justify-start gap-3"
              >
                <Package className="h-5 w-5" />
                Tokens
              </Button>
            </Link>

            <Link href="/transfers" onClick={handleLinkClick}>
              <Button
                variant={pathname?.startsWith("/transfers") ? "default" : "ghost"}
                className="w-full justify-start gap-3"
              >
                <ArrowLeftRight className="h-5 w-5" />
                Transfers
              </Button>
            </Link>

            <Link href="/profile" onClick={handleLinkClick}>
              <Button
                variant={isActive("/profile") ? "default" : "ghost"}
                className="w-full justify-start gap-3"
              >
                <User className="h-5 w-5" />
                Profile
              </Button>
            </Link>

            {user?.role === "Admin" && (
              <>
                <Link href="/admin/users" onClick={handleLinkClick}>
                  <Button
                    variant={pathname?.startsWith("/admin/users") ? "default" : "ghost"}
                    className="w-full justify-start gap-3"
                  >
                    <Settings className="h-5 w-5" />
                    User Management
                  </Button>
                </Link>
                <Link href="/admin/tests" onClick={handleLinkClick}>
                  <Button
                    variant={pathname?.startsWith("/admin/tests") ? "default" : "ghost"}
                    className="w-full justify-start gap-3"
                  >
                    <Settings className="h-5 w-5" />
                    Tests
                  </Button>
                </Link>
              </>
            )}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t">
            {isConnected && (
              <Button
                onClick={() => {
                  disconnectWallet();
                  handleLinkClick();
                }}
                variant="outline"
                className="w-full"
              >
                Disconnect Wallet
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

