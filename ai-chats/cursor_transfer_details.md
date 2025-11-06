# Agregar señalización para transferencias pendientes
_Exported on 11/5/2025 at 21:24:00 EST from Cursor (2.0.63)_

---

**User**

en el dashboard de los actores esta la opcion de transfers sin embargo si el usuario se conecta no tiene conocimiento de que puede tener alguna trasnferencia pendiente de aprobacion, entonces agrega una senalizacion al lado del titulo de la opcion Transfer con un circulito amarillo y dentro de el la cantidad de pending request y el estado pending como texto para poder que esté enterado que tiene algo pendiente

---

**Cursor**


Revisando el código del dashboard y de transfers para ubicar dónde agregar el indicador de notificación con el conteo de pendientes.



Revisando el archivo del dashboard y la página de transfers para entender la estructura:



Revisando la página de transfers y el Web3Context para entender cómo obtener los transfers pendientes:



Revisando la página de transfers para entender la estructura:



Modificando el dashboard para agregar el indicador de notificación con el conteo de transfers pendientes:


```typescriptreact
"use client";

import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatAddress } from "@/lib/utils";
import { Header } from "@/components/Header";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";

export default function Dashboard() {
  const { 
    isConnected, 
    account, 
    user, 
    isApproved, 
    disconnectWallet,
    provider
  } = useWeb3();
  
  const router = useRouter();
  const [pendingTransfersCount, setPendingTransfersCount] = useState(0);

  useEffect(() => {
    // Redirect to home if not connected
    if (!isConnected) {
      router.push('/');
      return;
    }
    
    // Redirect to home if not approved
    if (!isApproved) {
      router.push('/');
    }
  }, [isConnected, isApproved, router]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-red-500";
      case "Producer":
        return "bg-blue-500";
      case "Factory":
        return "bg-green-500";
      case "Retailer":
        return "bg-blue-500";
      case "Consumer":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };



  if (!isConnected || !isApproved || !user) {
    return null;
  }

  const isAdmin = user.role === "Admin";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        <Header
          title="Dashboard"
          description="Welcome to your Supply Chain Tracker dashboard"
          actionButtons={
            <Button asChild variant="outline">
              <Link href="/profile">Profile</Link>
            </Button>
          }
        />

        {/* User Info Card */}
        <Card className="mb-8 cursor-pointer hover:shadow-lg transition-shadow">
          <Link href="/profile">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Your Profile</CardTitle>
                <Badge className={getRoleColor(user.role)}>
                  {user.role}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    User ID
                  </div>
                  <div className="text-lg font-semibold">
                    #{user.id}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Wallet Address
                  </div>
                  <div className="text-lg font-mono">
                    {formatAddress(user.userAddress)}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Click to view full profile details →
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {isAdmin && (
            <>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <Link href="/admin/users">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      👥 User Management
                    </CardTitle>
                    <CardDescription>
                      Review and moderate registration requests
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-primary">
                <Link href="/admin/tests">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🧪 Automated Tests
                    </CardTitle>
                    <CardDescription>
                      Run automated tests for system validation
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
            </>
          )}
          
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <Link href="/profile">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  👤 Profile
                </CardTitle>
                <CardDescription>
                  View and manage your account details
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
          
          {!isAdmin && (
            <>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <Link href="/token">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🪙 My Tokens
                    </CardTitle>
                    <CardDescription>
                      View and manage your product tokens
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <Link href="/token/create">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      ➕ Create Token
                    </CardTitle>
                    <CardDescription>
                      Create a new product token
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
            </>
          )}

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <Link href="/transfers">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📤 Transfers
                </CardTitle>
                <CardDescription>
                  View and manage transfer requests
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <Badge className={getRoleColor(user.role)}>
                    {user.role}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="bg-green-500">Approved</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Your account is active and ready to use.
                </p>
                {isAdmin && (
                  <p className="text-sm">
                    As an admin, you have access to user management features.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatAddress } from "@/lib/utils";
import { Header } from "@/components/Header";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";

export default function Dashboard() {
  const { 
    isConnected, 
    account, 
    user, 
    isApproved, 
    disconnectWallet,
    provider
  } = useWeb3();
  
  const router = useRouter();
  const [pendingTransfersCount, setPendingTransfersCount] = useState(0);

  const loadPendingTransfersCount = useCallback(async () => {
    if (!account || !provider || !isApproved) return;

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const pendingTransferIds = await contract.getPendingTransfers(account);
      setPendingTransfersCount(pendingTransferIds.length);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading pending transfers count:", error);
      }
      setPendingTransfersCount(0);
    }
  }, [account, provider, isApproved]);

  useEffect(() => {
    // Redirect to home if not connected
    if (!isConnected) {
      router.push('/');
      return;
    }
    
    // Redirect to home if not approved
    if (!isApproved) {
      router.push('/');
    }
  }, [isConnected, isApproved, router]);

  useEffect(() => {
    if (isConnected && isApproved && account) {
      loadPendingTransfersCount();
    }
  }, [isConnected, isApproved, account, loadPendingTransfersCount]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-red-500";
      case "Producer":
        return "bg-blue-500";
      case "Factory":
        return "bg-green-500";
      case "Retailer":
        return "bg-blue-500";
      case "Consumer":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };



  if (!isConnected || !isApproved || !user) {
    return null;
  }

  const isAdmin = user.role === "Admin";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        <Header
          title="Dashboard"
          description="Welcome to your Supply Chain Tracker dashboard"
          actionButtons={
            <Button asChild variant="outline">
              <Link href="/profile">Profile</Link>
            </Button>
          }
        />

        {/* User Info Card */}
        <Card className="mb-8 cursor-pointer hover:shadow-lg transition-shadow">
          <Link href="/profile">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Your Profile</CardTitle>
                <Badge className={getRoleColor(user.role)}>
                  {user.role}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    User ID
                  </div>
                  <div className="text-lg font-semibold">
                    #{user.id}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Wallet Address
                  </div>
                  <div className="text-lg font-mono">
                    {formatAddress(user.userAddress)}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Click to view full profile details →
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {isAdmin && (
            <>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <Link href="/admin/users">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      👥 User Management
                    </CardTitle>
                    <CardDescription>
                      Review and moderate registration requests
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-primary">
                <Link href="/admin/tests">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🧪 Automated Tests
                    </CardTitle>
                    <CardDescription>
                      Run automated tests for system validation
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
            </>
          )}
          
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <Link href="/profile">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  👤 Profile
                </CardTitle>
                <CardDescription>
                  View and manage your account details
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
          
          {!isAdmin && (
            <>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <Link href="/token">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🪙 My Tokens
                    </CardTitle>
                    <CardDescription>
                      View and manage your product tokens
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <Link href="/token/create">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      ➕ Create Token
                    </CardTitle>
                    <CardDescription>
                      Create a new product token
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
            </>
          )}

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <Link href="/transfers">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📤 Transfers
                </CardTitle>
                <CardDescription>
                  View and manage transfer requests
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <Badge className={getRoleColor(user.role)}>
                    {user.role}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="bg-green-500">Approved</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Your account is active and ready to use.
                </p>
                {isAdmin && (
                  <p className="text-sm">
                    As an admin, you have access to user management features.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatAddress } from "@/lib/utils";
import { Header } from "@/components/Header";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";

export default function Dashboard() {
  const { 
    isConnected, 
    account, 
    user, 
    isApproved, 
    disconnectWallet,
    provider
  } = useWeb3();
  
  const router = useRouter();
  const [pendingTransfersCount, setPendingTransfersCount] = useState(0);

  const loadPendingTransfersCount = useCallback(async () => {
    if (!account || !provider || !isApproved) return;

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const pendingTransferIds = await contract.getPendingTransfers(account);
      setPendingTransfersCount(pendingTransferIds.length);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading pending transfers count:", error);
      }
      setPendingTransfersCount(0);
    }
  }, [account, provider, isApproved]);

  useEffect(() => {
    // Redirect to home if not connected
    if (!isConnected) {
      router.push('/');
      return;
    }
    
    // Redirect to home if not approved
    if (!isApproved) {
      router.push('/');
    }
  }, [isConnected, isApproved, router]);

  useEffect(() => {
    if (isConnected && isApproved && account) {
      loadPendingTransfersCount();
    }
  }, [isConnected, isApproved, account, loadPendingTransfersCount]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-red-500";
      case "Producer":
        return "bg-blue-500";
      case "Factory":
        return "bg-green-500";
      case "Retailer":
        return "bg-blue-500";
      case "Consumer":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };



  if (!isConnected || !isApproved || !user) {
    return null;
  }

  const isAdmin = user.role === "Admin";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        <Header
          title="Dashboard"
          description="Welcome to your Supply Chain Tracker dashboard"
          actionButtons={
            <Button asChild variant="outline">
              <Link href="/profile">Profile</Link>
            </Button>
          }
        />

        {/* User Info Card */}
        <Card className="mb-8 cursor-pointer hover:shadow-lg transition-shadow">
          <Link href="/profile">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Your Profile</CardTitle>
                <Badge className={getRoleColor(user.role)}>
                  {user.role}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    User ID
                  </div>
                  <div className="text-lg font-semibold">
                    #{user.id}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Wallet Address
                  </div>
                  <div className="text-lg font-mono">
                    {formatAddress(user.userAddress)}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Click to view full profile details →
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {isAdmin && (
            <>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <Link href="/admin/users">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      👥 User Management
                    </CardTitle>
                    <CardDescription>
                      Review and moderate registration requests
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-primary">
                <Link href="/admin/tests">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🧪 Automated Tests
                    </CardTitle>
                    <CardDescription>
                      Run automated tests for system validation
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
            </>
          )}
          
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <Link href="/profile">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  👤 Profile
                </CardTitle>
                <CardDescription>
                  View and manage your account details
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
          
          {!isAdmin && (
            <>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <Link href="/token">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🪙 My Tokens
                    </CardTitle>
                    <CardDescription>
                      View and manage your product tokens
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <Link href="/token/create">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      ➕ Create Token
                    </CardTitle>
                    <CardDescription>
                      Create a new product token
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
            </>
          )}

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <Link href="/transfers">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📤 Transfers
                  {pendingTransfersCount > 0 && (
                    <div className="flex items-center gap-2 ml-2">
                      <div className="relative">
                        <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold text-yellow-900">
                          {pendingTransfersCount}
                        </div>
                      </div>
                      <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                        pending
                      </span>
                    </div>
                  )}
                </CardTitle>
                <CardDescription>
                  View and manage transfer requests
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <Badge className={getRoleColor(user.role)}>
                    {user.role}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="bg-green-500">Approved</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Your account is active and ready to use.
                </p>
                {isAdmin && (
                  <p className="text-sm">
                    As an admin, you have access to user management features.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


```


Revisando errores de linting:



Verificando que todo esté correcto. Revisando el archivo completo para confirmar la integración:



Agregado el indicador de notificación en el dashboard. Cambios:

1. **Estado y función para obtener el conteo**: Se agregó `pendingTransfersCount` y `loadPendingTransfersCount` que consulta el contrato por transfers pendientes.

2. **Indicador visual**: Se muestra cuando hay transfers pendientes:
   - Círculo amarillo (`bg-yellow-400`) con el número de transfers pendientes
   - Texto "pending" al lado en color amarillo
   - Solo visible cuando `pendingTransfersCount > 0`

3. **Carga automática**: El conteo se carga cuando el usuario está conectado y aprobado.

El indicador aparece junto al título "📤 Transfers" en el dashboard, mostrando el número de transfers pendientes y el texto "pending" para que el usuario sepa que tiene solicitudes pendientes de aprobación.

¿Quieres que agregue un intervalo para actualizar el conteo periódicamente, o que se actualice cuando el usuario vuelve a la página?

---

**User**

ok ahora en la tabla presentada en las transacciones pendiente  remover la columna to para los que no son administradores, ya que eso quita espacio y ya se sabe que la transaccion es para ese actor, sintetizar las dos priomeras columnas en una sola, ID como column header y la info dentro de esa columna Track: [trackid] token:[tocken_id] con breackline para que sea legible y comprensible, para el request y el response utilizemos un formato de tiempo un poco mas compacto para que la tabla pueda ser mejor apreciada, pero sin perder lo escencial de la informacion.

---

**Cursor**


Modificando la página de transfers para aplicar los cambios solicitados:



Modificando la página de transfers según los cambios solicitados:


```typescriptreact
"use client";

import { useEffect, useState, useCallback } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transfer {
  id: number;
  tokenId: number;
  from: string;
  to: string;
  amount: number;
  status: number; // 0 = Pending, 1 = Accepted, 2 = Rejected
  requestTimestamp: number;
  responseTimestamp: number;
}

export default function TransfersPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"pending" | "all" | "history">("pending");
  const isAdmin = user?.role === "Admin";

  const loadTransfers = useCallback(async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      let transferIds: bigint[] = [];

      if (isAdmin && (viewMode === "all" || viewMode === "history")) {
        // For admin: get all transfers
        const totalTransfers = Number(await contract.getTotalTransfers());
        transferIds = [];
        for (let i = 0; i < totalTransfers; i++) {
          try {
            const transferId = await contract.transferIds(i);
            transferIds.push(transferId);
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error(`Error fetching transfer ID at index ${i}:`, error);
            }
          }
        }
      } else {
        // For regular users or admin pending view: get pending transfers
        transferIds = await contract.getPendingTransfers(account);
      }
      
      // Load transfer details
      const transferPromises = transferIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          return {
            id: Number(transferId),
            tokenId: Number(transferData.tokenId),
            from: transferData.from,
            to: transferData.to,
            amount: Number(transferData.amount),
            status: Number(transferData.status),
            requestTimestamp: Number(transferData.requestTimestamp),
            responseTimestamp: Number(transferData.responseTimestamp),
          };
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error loading transfer ${transferId}:`, error);
          }
          return null;
        }
      });

      const transferResults = await Promise.all(transferPromises);
      let validTransfers = transferResults.filter(
        (transfer): transfer is Transfer => transfer !== null
      );

      // Filter based on view mode
      if (!isAdmin || viewMode === "pending") {
        validTransfers = validTransfers.filter(transfer => transfer.status === 0);
      } else if (viewMode === "history") {
        validTransfers = validTransfers.filter(transfer => transfer.status !== 0);
      }

      // Sort by timestamp (newest first)
      validTransfers.sort((a, b) => b.requestTimestamp - a.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading transfers:", error);
      }
      toast.error("Failed to load transfers");
    } finally {
      setLoading(false);
    }
  }, [account, provider, isAdmin, viewMode]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTransfers();
  }, [isConnected, isApproved, router, loadTransfers]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(Number(timestamp) * 1000);
    // Format: MM/DD/YY HH:MM (compact format)
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}`;
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 1:
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 2:
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  if (!isConnected || !isApproved) {
    return null;
  }

  const getTitle = () => {
    if (isAdmin) {
      switch (viewMode) {
        case "all":
          return "All Transfers";
        case "history":
          return "Transfer History";
        default:
          return "Pending Transfers";
      }
    }
    return "Pending Transfers";
  };

  const getDescription = () => {
    if (isAdmin) {
      switch (viewMode) {
        case "all":
          return "View all transfers in the system across all stages";
        case "history":
          return "View completed transfer history (accepted and rejected)";
        default:
          return "Review and manage incoming transfer requests";
      }
    }
    return "Review and manage incoming transfer requests";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        <Header
          title={getTitle()}
          description={getDescription()}
          backButton={{
            href: "/dashboard",
            label: "Back to Dashboard"
          }}
          actionButtons={
            isAdmin && (
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("pending")}
                >
                  Pending
                </Button>
                <Button
                  variant={viewMode === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("all")}
                >
                  All Transfers
                </Button>
                <Button
                  variant={viewMode === "history" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("history")}
                >
                  History
                </Button>
              </div>
            )
          }
        />

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading transfers...</div>
            </CardContent>
          </Card>
        ) : transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {isAdmin && viewMode === "history" 
                    ? "No transfer history found" 
                    : isAdmin && viewMode === "all"
                    ? "No transfers found"
                    : "No pending transfers"}
                </p>
                {!isAdmin && (
                  <Link href="/token">
                    <Button>View Tokens</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Transfer Requests</CardTitle>
              <CardDescription>
                {isAdmin 
                  ? `Showing ${transfers.length} transfer(s)`
                  : `You have ${transfers.length} pending transfer request(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transfer ID</TableHead>
                    <TableHead>Token ID</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    {viewMode !== "history" && <TableHead>Response</TableHead>}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-medium">#{transfer.id}</TableCell>
                      <TableCell>
                        <Link href={`/token/${transfer.tokenId}`}>
                          <Button variant="link" className="p-0 h-auto">
                            #{transfer.tokenId}
                          </Button>
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(transfer.from)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(transfer.to)}
                      </TableCell>
                      <TableCell className="font-semibold">{transfer.amount}</TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(transfer.requestTimestamp)}
                      </TableCell>
                      {viewMode !== "history" && (
                        <TableCell className="text-sm">
                          {transfer.responseTimestamp > 0 
                            ? formatDate(transfer.responseTimestamp)
                            : "-"}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/transfers/${transfer.id}`}>
                            <Button variant="outline" size="sm">
                              {viewMode === "history" ? "View Details" : "Review"}
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState, useCallback } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transfer {
  id: number;
  tokenId: number;
  from: string;
  to: string;
  amount: number;
  status: number; // 0 = Pending, 1 = Accepted, 2 = Rejected
  requestTimestamp: number;
  responseTimestamp: number;
}

export default function TransfersPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"pending" | "all" | "history">("pending");
  const isAdmin = user?.role === "Admin";

  const loadTransfers = useCallback(async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      let transferIds: bigint[] = [];

      if (isAdmin && (viewMode === "all" || viewMode === "history")) {
        // For admin: get all transfers
        const totalTransfers = Number(await contract.getTotalTransfers());
        transferIds = [];
        for (let i = 0; i < totalTransfers; i++) {
          try {
            const transferId = await contract.transferIds(i);
            transferIds.push(transferId);
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error(`Error fetching transfer ID at index ${i}:`, error);
            }
          }
        }
      } else {
        // For regular users or admin pending view: get pending transfers
        transferIds = await contract.getPendingTransfers(account);
      }
      
      // Load transfer details
      const transferPromises = transferIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          return {
            id: Number(transferId),
            tokenId: Number(transferData.tokenId),
            from: transferData.from,
            to: transferData.to,
            amount: Number(transferData.amount),
            status: Number(transferData.status),
            requestTimestamp: Number(transferData.requestTimestamp),
            responseTimestamp: Number(transferData.responseTimestamp),
          };
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error loading transfer ${transferId}:`, error);
          }
          return null;
        }
      });

      const transferResults = await Promise.all(transferPromises);
      let validTransfers = transferResults.filter(
        (transfer): transfer is Transfer => transfer !== null
      );

      // Filter based on view mode
      if (!isAdmin || viewMode === "pending") {
        validTransfers = validTransfers.filter(transfer => transfer.status === 0);
      } else if (viewMode === "history") {
        validTransfers = validTransfers.filter(transfer => transfer.status !== 0);
      }

      // Sort by timestamp (newest first)
      validTransfers.sort((a, b) => b.requestTimestamp - a.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading transfers:", error);
      }
      toast.error("Failed to load transfers");
    } finally {
      setLoading(false);
    }
  }, [account, provider, isAdmin, viewMode]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTransfers();
  }, [isConnected, isApproved, router, loadTransfers]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(Number(timestamp) * 1000);
    // Format: MM/DD/YY HH:MM (compact format)
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}`;
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 1:
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 2:
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  if (!isConnected || !isApproved) {
    return null;
  }

  const getTitle = () => {
    if (isAdmin) {
      switch (viewMode) {
        case "all":
          return "All Transfers";
        case "history":
          return "Transfer History";
        default:
          return "Pending Transfers";
      }
    }
    return "Pending Transfers";
  };

  const getDescription = () => {
    if (isAdmin) {
      switch (viewMode) {
        case "all":
          return "View all transfers in the system across all stages";
        case "history":
          return "View completed transfer history (accepted and rejected)";
        default:
          return "Review and manage incoming transfer requests";
      }
    }
    return "Review and manage incoming transfer requests";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        <Header
          title={getTitle()}
          description={getDescription()}
          backButton={{
            href: "/dashboard",
            label: "Back to Dashboard"
          }}
          actionButtons={
            isAdmin && (
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("pending")}
                >
                  Pending
                </Button>
                <Button
                  variant={viewMode === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("all")}
                >
                  All Transfers
                </Button>
                <Button
                  variant={viewMode === "history" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("history")}
                >
                  History
                </Button>
              </div>
            )
          }
        />

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading transfers...</div>
            </CardContent>
          </Card>
        ) : transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {isAdmin && viewMode === "history" 
                    ? "No transfer history found" 
                    : isAdmin && viewMode === "all"
                    ? "No transfers found"
                    : "No pending transfers"}
                </p>
                {!isAdmin && (
                  <Link href="/token">
                    <Button>View Tokens</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Transfer Requests</CardTitle>
              <CardDescription>
                {isAdmin 
                  ? `Showing ${transfers.length} transfer(s)`
                  : `You have ${transfers.length} pending transfer request(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>From</TableHead>
                    {isAdmin && <TableHead>To</TableHead>}
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    {viewMode !== "history" && <TableHead>Response</TableHead>}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">Track: {transfer.id}</span>
                          <Link href={`/token/${transfer.tokenId}`}>
                            <Button variant="link" className="p-0 h-auto text-xs text-primary">
                              token: {transfer.tokenId}
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(transfer.from)}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="font-mono text-sm">
                          {formatAddress(transfer.to)}
                        </TableCell>
                      )}
                      <TableCell className="font-semibold">{transfer.amount}</TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(transfer.requestTimestamp)}
                      </TableCell>
                      {viewMode !== "history" && (
                        <TableCell className="text-sm">
                          {transfer.responseTimestamp > 0 
                            ? formatDate(transfer.responseTimestamp)
                            : "-"}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/transfers/${transfer.id}`}>
                            <Button variant="outline" size="sm">
                              {viewMode === "history" ? "View Details" : "Review"}
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}


```


Revisando errores de linting:



Cambios aplicados en la página de transfers:

1. Columna "To" removida para usuarios no administradores: solo se muestra si el usuario es administrador.

2. Columnas combinadas: "Transfer ID" y "Token ID" ahora forman una sola columna "ID" con:
   - `Track: [transfer.id]` en la primera línea
   - `token: [token.id]` en la segunda línea (con enlace al token)
   - Formato en columnas con `flex flex-col` para mostrar en líneas separadas

3. Formato de fecha compacto: "Requested" y "Response" ahora usan `MM/DD/YY HH:MM` en lugar del formato completo, manteniendo la información esencial pero más compacto.

La tabla queda más compacta y legible, especialmente para usuarios no administradores. El formato de fecha es más corto y el ID combinado muestra toda la información necesaria en menos espacio.

