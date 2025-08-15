import React from "react";
import {
  Heart,
  TrendingUp,
  Users,
  Calendar,
  ArrowUpRight,
  Lock,
  Clock
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface Startup {
  id: string;
  name: string;
  category: string;
  stage: string;
  fundingGoal: string;
  raised: string;
  percentage: number;
  valuation: string;
  investors: number;
  timeLeft: string;
  image: string;
  description: string;
  trending?: boolean;
}

interface StartupCardProps {
  startup: Startup;
  size?: "small" | "medium" | "large";
  featured?: boolean;
  onToggleFavorite?: (id: string) => void;
  isFavorite?: boolean;
  onInvestClick?: (startup?: Startup) => void;
  isAuthenticated?: boolean;
}

export function StartupCard({
  startup,
  size = "large",
  featured = false,
  onToggleFavorite,
  isFavorite = false,
  onInvestClick,
  isAuthenticated = false
}: StartupCardProps) {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(startup.id);
    }
  };

  const handleInvestClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onInvestClick) {
      onInvestClick(startup);
    }
  };

  const isEndingSoon = parseInt(startup.timeLeft) <= 7;

  // Small card layout (compact)
  if (size === "small") {
    return (
      <Card className="group cursor-pointer transition-all duration-200 hover:shadow-md w-48 flex-shrink-0">
        <CardHeader className="p-0">
          <div className="relative">
            <ImageWithFallback
              src={startup.image}
              alt={startup.name}
              className="w-full h-28 object-cover rounded-t-lg"
            />
            <div className="absolute top-2 left-2">
              <Badge
                variant="secondary"
                className="bg-background/80 backdrop-blur-sm text-xs"
              >
                {startup.stage}
              </Badge>
            </div>
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                className={`absolute top-2 right-2 h-6 w-6 bg-background/80 backdrop-blur-sm hover:bg-background/90 ${
                  isFavorite ? "text-red-500" : "text-muted-foreground"
                }`}
                onClick={handleFavoriteClick}
              >
                <Heart
                  className={`h-3 w-3 ${isFavorite ? "fill-current" : ""}`}
                />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          <div className="space-y-1">
            <CardTitle className="text-sm group-hover:text-primary transition-colors line-clamp-1">
              {startup.name}
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {startup.category}
            </Badge>
          </div>
          <div className="space-y-1">
            <Progress value={startup.percentage} className="h-1" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{startup.percentage}%</span>
              <span>{startup.timeLeft}</span>
            </div>
          </div>
          <Button
            size="sm"
            className="w-full text-xs h-7"
            onClick={handleInvestClick}
          >
            {isAuthenticated ? "Investir" : "Login"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Medium card layout
  if (size === "medium") {
    return (
      <Card className="group cursor-pointer transition-all duration-200 hover:shadow-lg w-64 flex-shrink-0">
        <CardHeader className="p-0">
          <div className="relative">
            <ImageWithFallback
              src={startup.image}
              alt={startup.name}
              className="w-full h-36 object-cover rounded-t-lg"
            />
            <div className="absolute top-3 left-3 flex items-center space-x-1">
              <Badge
                variant="secondary"
                className="bg-background/80 backdrop-blur-sm text-xs"
              >
                {startup.stage}
              </Badge>
              {startup.trending && (
                <Badge className="bg-green-500 text-white text-xs">
                  <TrendingUp className="h-2 w-2 mr-1" />
                  Hot
                </Badge>
              )}
            </div>
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                className={`absolute top-3 right-3 h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background/90 ${
                  isFavorite ? "text-red-500" : "text-muted-foreground"
                }`}
                onClick={handleFavoriteClick}
              >
                <Heart
                  className={`h-3 w-3 ${isFavorite ? "fill-current" : ""}`}
                />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          <div className="space-y-1">
            <CardTitle className="text-sm group-hover:text-primary transition-colors line-clamp-1">
              {startup.name}
            </CardTitle>
            <CardDescription className="text-xs line-clamp-2">
              {startup.description}
            </CardDescription>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Meta: {startup.fundingGoal}
              </span>
              <span className="font-medium">{startup.percentage}%</span>
            </div>
            <Progress value={startup.percentage} className="h-1.5" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center">
                <Users className="h-2 w-2 mr-1" />
                {startup.investors}
              </span>
              <span className="flex items-center">
                <Clock className="h-2 w-2 mr-1" />
                {startup.timeLeft}
              </span>
            </div>
          </div>
          <Button size="sm" className="w-full" onClick={handleInvestClick}>
            {isAuthenticated ? (
              <>
                Investir
                <ArrowUpRight className="h-3 w-3 ml-1" />
              </>
            ) : (
              <>
                <Lock className="h-3 w-3 mr-1" />
                Login
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Large card layout (original)
  return (
    <Card
      className={`group cursor-pointer transition-all duration-200 hover:shadow-lg ${
        featured ? "border-primary/20" : ""
      } ${isEndingSoon ? "border-destructive/30 bg-destructive/5" : ""}`}
    >
      <CardHeader className="p-0">
        <div className="relative">
          <ImageWithFallback
            src={startup.image}
            alt={startup.name}
            className="w-full h-48 object-cover rounded-t-lg"
          />

          <div className="absolute top-3 left-3 flex items-center space-x-2">
            <Badge
              variant="secondary"
              className="bg-background/80 backdrop-blur-sm"
            >
              {startup.stage}
            </Badge>
            {startup.trending && (
              <Badge className="bg-green-500 text-white">
                <TrendingUp className="h-3 w-3 mr-1" />
                Trending
              </Badge>
            )}
            {isEndingSoon && (
              <Badge className="bg-destructive text-destructive-foreground">
                <Clock className="h-3 w-3 mr-1" />
                Encerrando
              </Badge>
            )}
          </div>

          {isAuthenticated && (
            <Button
              variant="ghost"
              size="icon"
              className={`absolute top-3 right-3 bg-background/80 backdrop-blur-sm hover:bg-background/90 ${
                isFavorite ? "text-red-500" : "text-muted-foreground"
              }`}
              onClick={handleFavoriteClick}
            >
              <Heart
                className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`}
              />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg group-hover:text-primary transition-colors">
              {startup.name}
            </CardTitle>
            <Badge variant="outline">{startup.category}</Badge>
          </div>
          <CardDescription className="text-sm line-clamp-2">
            {startup.description}
          </CardDescription>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">
              {startup.raised} de {startup.fundingGoal}
            </span>
          </div>
          <Progress value={startup.percentage} className="h-2" />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{startup.percentage}% arrecadado</span>
            <span
              className={isEndingSoon ? "text-destructive font-medium" : ""}
            >
              {startup.timeLeft} restantes
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground">Valuation</div>
            <div className="font-medium">{startup.valuation}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">Investidores</div>
            <div className="font-medium flex items-center">
              <Users className="h-3 w-3 mr-1" />
              {startup.investors}
            </div>
          </div>
        </div>

        <div className="flex space-x-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1">
            Ver detalhes
          </Button>
          <Button
            size="sm"
            className={`flex-1 ${
              isEndingSoon ? "bg-destructive hover:bg-destructive/90" : ""
            }`}
            onClick={handleInvestClick}
          >
            {isAuthenticated ? (
              <>
                Investir
                <ArrowUpRight className="h-3 w-3 ml-1" />
              </>
            ) : (
              <>
                <Lock className="h-3 w-3 mr-1" />
                Login para Investir
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
