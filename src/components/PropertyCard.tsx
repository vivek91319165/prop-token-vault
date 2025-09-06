import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, Users } from "lucide-react";

interface PropertyCardProps {
  id: string;
  title: string;
  location: string;
  tokenPrice: number;
  totalTokens: number;
  tokensSold: number;
  estimatedRoi: number;
  imageUrl: string;
  propertyType: string;
}

export default function PropertyCard({
  id,
  title,
  location,
  tokenPrice,
  totalTokens,
  tokensSold,
  estimatedRoi,
  imageUrl,
  propertyType,
}: PropertyCardProps) {
  const progressPercentage = (tokensSold / totalTokens) * 100;
  const tokensRemaining = totalTokens - tokensSold;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-b from-card to-card/50">
      <div className="relative overflow-hidden rounded-t-lg">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm">
            {propertyType}
          </Badge>
        </div>
        <div className="absolute top-3 right-3">
          <Badge variant="default" className="bg-success/90 backdrop-blur-sm text-success-foreground">
            {estimatedRoi}% ROI
          </Badge>
        </div>
      </div>

      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-2">
              {title}
            </h3>
            <div className="flex items-center text-muted-foreground text-sm">
              <MapPin className="w-4 h-4 mr-1" />
              {location}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-sm font-medium">
                {tokensSold.toLocaleString()} / {totalTokens.toLocaleString()} tokens
              </span>
            </div>
            
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">
                {tokensRemaining.toLocaleString()} tokens left
              </span>
              <span className="font-medium text-foreground">
                {progressPercentage.toFixed(1)}% funded
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-foreground">
                ${tokenPrice}
              </div>
              <div className="text-sm text-muted-foreground">per token</div>
            </div>

            <div className="flex flex-col items-end space-y-2">
              <div className="flex items-center text-sm text-success">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span className="font-medium">{estimatedRoi}% ROI</span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="w-4 h-4 mr-1" />
                <span>{Math.floor(tokensSold / 10)} investors</span>
              </div>
            </div>
          </div>

          <Button variant="investment" className="w-full" asChild>
            <Link to={`/property/${id}`}>
              View Details & Invest
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}