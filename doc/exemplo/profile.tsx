import React, { useState } from "react";
import {
  User,
  Settings,
  Bell,
  Shield,
  CreditCard,
  LogOut,
  Edit,
  Camera
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

interface ProfileScreenProps {
  user: any;
  onLogout: () => void;
  isDarkMode: boolean;
}

export function ProfileScreen({
  user,
  onLogout,
  isDarkMode
}: ProfileScreenProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(user);

  const investmentStats = {
    totalInvestments: 12,
    totalAmount: "R$ 850.000",
    activeInvestments: 8,
    successfulExits: 2,
    averageROI: "23.5%",
    portfolioValue: "R$ 1.2M"
  };

  const recentInvestments = [
    {
      startup: "EcoTech Solutions",
      amount: "R$ 50.000",
      date: "15 Jan 2025",
      status: "Ativo",
      roi: "+15%"
    },
    {
      startup: "HealthAI",
      amount: "R$ 75.000",
      date: "8 Jan 2025",
      status: "Ativo",
      roi: "+8%"
    },
    {
      startup: "EdTech Pro",
      amount: "R$ 100.000",
      date: "22 Dez 2024",
      status: "Ativo",
      roi: "+22%"
    }
  ];

  const handleSaveProfile = () => {
    // Here you would save the profile changes
    setIsEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="outline"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold">
                  {user?.name || "João Silva"}
                </h1>
                <Badge variant="secondary">Investidor Verificado</Badge>
              </div>
              <p className="text-muted-foreground">
                {user?.email || "joao@exemplo.com"}
              </p>
              <p className="text-sm text-muted-foreground">
                {user?.company || "Tech Ventures"} • Membro desde Jan 2024
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span>{isEditing ? "Cancelar" : "Editar Perfil"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Investment Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Investimentos</CardDescription>
            <CardTitle className="text-lg">
              {investmentStats.totalInvestments}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Valor Total</CardDescription>
            <CardTitle className="text-lg">
              {investmentStats.totalAmount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Ativos</CardDescription>
            <CardTitle className="text-lg">
              {investmentStats.activeInvestments}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Exits</CardDescription>
            <CardTitle className="text-lg">
              {investmentStats.successfulExits}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">ROI Médio</CardDescription>
            <CardTitle className="text-lg text-green-600">
              {investmentStats.averageROI}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Portfólio</CardDescription>
            <CardTitle className="text-lg">
              {investmentStats.portfolioValue}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="investments">Investimentos</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Recent Investments */}
          <Card>
            <CardHeader>
              <CardTitle>Investimentos Recentes</CardTitle>
              <CardDescription>
                Seus últimos investimentos em startups
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentInvestments.map((investment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{investment.startup}</p>
                      <p className="text-sm text-muted-foreground">
                        {investment.date}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-medium">{investment.amount}</p>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            investment.status === "Ativo"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {investment.status}
                        </Badge>
                        <span className="text-sm text-green-600">
                          {investment.roi}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="investments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio de Investimentos</CardTitle>
              <CardDescription>
                Visão detalhada dos seus investimentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Funcionalidade em desenvolvimento. Em breve você poderá ver
                  detalhes completos do seu portfólio.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle>Editar Perfil</CardTitle>
                <CardDescription>
                  Atualize suas informações pessoais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input
                      id="name"
                      value={editedUser.name}
                      onChange={(e) =>
                        setEditedUser({ ...editedUser, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editedUser.email}
                      onChange={(e) =>
                        setEditedUser({ ...editedUser, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Empresa</Label>
                    <Input
                      id="company"
                      value={editedUser.company}
                      onChange={(e) =>
                        setEditedUser({
                          ...editedUser,
                          company: e.target.value
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" placeholder="(11) 99999-9999" />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleSaveProfile}>Salvar alterações</Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Preferências</CardTitle>
                <CardDescription>
                  Configure suas preferências de conta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações por email</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba atualizações sobre seus investimentos
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações push</Label>
                    <p className="text-sm text-muted-foreground">
                      Alertas em tempo real sobre oportunidades
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Newsletter semanal</Label>
                    <p className="text-sm text-muted-foreground">
                      Resumo semanal das melhores oportunidades
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Segurança da Conta</CardTitle>
              <CardDescription>
                Gerencie a segurança da sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Autenticação de dois fatores</p>
                    <p className="text-sm text-muted-foreground">Ativada</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Configurar
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Métodos de pagamento</p>
                    <p className="text-sm text-muted-foreground">
                      2 cartões salvos
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Gerenciar
                </Button>
              </div>

              <div className="pt-4">
                <Button
                  variant="destructive"
                  onClick={onLogout}
                  className="w-full"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair da conta
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
