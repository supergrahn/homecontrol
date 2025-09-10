import React from "react";
import { View, Text, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isBetween from "dayjs/plugin/isBetween";
import { useTranslation } from "react-i18next";

import { useTheme } from "../design/theme";
import Card from "./Card";

dayjs.extend(weekOfYear);
dayjs.extend(isBetween);

export type CommunityHeaderVariant = "default" | "compact" | "greeting_only";

interface CommunityHeaderProps {
  userName?: string;
  location?: string;
  currentWeather?: string;
  temperature?: number;
  variant?: CommunityHeaderVariant;
  style?: ViewStyle;
}

export default function CommunityHeader({ 
  userName = "Venn",
  location = "Norge",
  currentWeather = "Partly cloudy",
  temperature = 15,
  variant = "default",
  style 
}: CommunityHeaderProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  
  const isNorwegian = i18n.language === "no" || i18n.language === "nb";
  const now = dayjs();
  
  // Norwegian seasonal context
  const getSeasonalInfo = () => {
    const month = now.month();
    const day = now.date();
    
    // Check for specific Norwegian holidays/seasons
    if (month === 4 && day === 17) {
      return {
        season: "17mai",
        emoji: "🇳🇴",
        greeting: isNorwegian ? "Gratulerer med dagen!" : "Happy Constitution Day!",
        color: "#C41E3A", // Norwegian flag red
        activity: isNorwegian ? "Perfekt vær for barnetoget!" : "Perfect weather for the parade!"
      };
    }
    
    if (month === 11 && day === 13) {
      return {
        season: "lucia",
        emoji: "🕯️",
        greeting: isNorwegian ? "God Lucia!" : "Happy Lucia Day!",
        color: "#FFD700", // Gold for candles
        activity: isNorwegian ? "Lucia-tog i dag!" : "Lucia procession today!"
      };
    }
    
    if (month === 11 && (day >= 1 && day <= 25)) {
      return {
        season: "advent",
        emoji: "🎄",
        greeting: isNorwegian ? "God advent!" : "Happy Advent!",
        color: "#0F7B0F", // Christmas green
        activity: isNorwegian ? "Kalendertid!" : "Calendar season!"
      };
    }
    
    // Seasonal greetings
    if (month >= 2 && month <= 4) { // Spring
      return {
        season: "spring",
        emoji: "🌸",
        greeting: isNorwegian ? "Våren er her!" : "Spring is here!",
        color: theme.colors.accentMint,
        activity: isNorwegian ? "Tid for friluftsliv!" : "Time for outdoor activities!"
      };
    }
    
    if (month >= 5 && month <= 7) { // Summer
      return {
        season: "summer", 
        emoji: "☀️",
        greeting: isNorwegian ? "God sommer!" : "Happy summer!",
        color: theme.colors.accentSeafoam,
        activity: isNorwegian ? "Nyt de lyse nettene!" : "Enjoy the bright nights!"
      };
    }
    
    if (month >= 8 && month <= 10) { // Autumn
      return {
        season: "autumn",
        emoji: "🍂", 
        greeting: isNorwegian ? "God høst!" : "Happy autumn!",
        color: theme.colors.accentCoral,
        activity: isNorwegian ? "Bærplukking-sesong!" : "Berry picking season!"
      };
    }
    
    // Winter
    return {
      season: "winter",
      emoji: "❄️",
      greeting: isNorwegian ? "God vinter!" : "Happy winter!",
      color: theme.colors.focus,
      activity: isNorwegian ? "Skiføre snart!" : "Ski conditions coming soon!"
    };
  };

  const getTimeBasedGreeting = () => {
    const hour = now.hour();
    
    if (hour < 6) {
      return isNorwegian ? "God natt" : "Good night";
    } else if (hour < 10) {
      return isNorwegian ? "God morgen" : "Good morning";  
    } else if (hour < 17) {
      return isNorwegian ? "God dag" : "Good day";
    } else if (hour < 22) {
      return isNorwegian ? "God kveld" : "Good evening";
    } else {
      return isNorwegian ? "God natt" : "Good night";
    }
  };

  const getWeatherEmoji = () => {
    const weather = currentWeather.toLowerCase();
    if (weather.includes("rain") || weather.includes("regn")) return "🌧️";
    if (weather.includes("snow") || weather.includes("snø")) return "❄️";
    if (weather.includes("sun") || weather.includes("sol")) return "☀️";
    if (weather.includes("cloud") || weather.includes("sky")) return "☁️";
    if (weather.includes("partly")) return "⛅";
    return "🌤️";
  };

  const getWeatherAdvice = () => {
    const weather = currentWeather.toLowerCase();
    
    if (weather.includes("rain") || weather.includes("regn")) {
      return isNorwegian ? "Husk regntøy!" : "Remember rain gear!";
    }
    if (weather.includes("snow") || weather.includes("snø")) {
      return isNorwegian ? "Tid for vinterklær!" : "Time for winter clothes!";
    }
    if (temperature && temperature < 0) {
      return isNorwegian ? "Kle deg varmt!" : "Dress warmly!";
    }
    if (temperature && temperature > 20) {
      return isNorwegian ? "Perfekt ute-vær!" : "Perfect outdoor weather!";
    }
    
    return isNorwegian ? "Ha en fin dag!" : "Have a nice day!";
  };

  const getSchoolCalendarInfo = () => {
    // Mock function - would integrate with Norwegian school calendar API
    const month = now.month();
    const week = now.week();
    
    if (month === 9 && week <= 3) {
      return isNorwegian ? "Skolestart!" : "School starting!";
    }
    if (month === 5 && week >= 20) {
      return isNorwegian ? "Sommerferie snart!" : "Summer holiday soon!";
    }
    if (month === 1 && (week === 7 || week === 8)) {
      return isNorwegian ? "Vinterferie!" : "Winter break!";
    }
    if (month === 3 && (week === 13 || week === 14)) {
      return isNorwegian ? "Påskeferie!" : "Easter break!";
    }
    if (month === 9 && week >= 40) {
      return isNorwegian ? "Høstferie!" : "Autumn break!";
    }
    
    return null;
  };

  const seasonalInfo = getSeasonalInfo();
  const timeGreeting = getTimeBasedGreeting();
  const schoolInfo = getSchoolCalendarInfo();

  if (variant === "greeting_only") {
    return (
      <View style={[{ alignItems: "center", paddingVertical: 12 }, style]}>
        <Text style={{ 
          fontSize: 18, 
          fontWeight: "700", 
          color: seasonalInfo.color,
          textAlign: "center" 
        }}>
          {seasonalInfo.emoji} {seasonalInfo.greeting}
        </Text>
        <Text style={{ 
          fontSize: 14, 
          color: theme.colors.textSecondary,
          textAlign: "center",
          marginTop: 4,
        }}>
          {timeGreeting}, {userName}!
        </Text>
      </View>
    );
  }

  if (variant === "compact") {
    return (
      <View style={[{ paddingVertical: 8 }, style]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.text }}>
              {timeGreeting}, {userName}! {seasonalInfo.emoji}
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
              {location} • {temperature}°C {getWeatherEmoji()}
            </Text>
          </View>
          
          {schoolInfo && (
            <View style={{
              backgroundColor: seasonalInfo.color + "20",
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: theme.radius.sm,
            }}>
              <Text style={{ 
                fontSize: 11, 
                color: seasonalInfo.color, 
                fontWeight: "600" 
              }}>
                🏫 {schoolInfo}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Default variant - full header
  return (
    <Card style={[{
      marginBottom: 16,
      backgroundColor: theme.colors.card,
      borderTopWidth: 4,
      borderTopColor: seasonalInfo.color,
    }, style]}>
      {/* Main Greeting */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ 
          fontSize: 24, 
          fontWeight: "700", 
          color: theme.colors.text,
          textAlign: "center",
          marginBottom: 4,
        }}>
          {seasonalInfo.emoji} {seasonalInfo.greeting}
        </Text>
        <Text style={{ 
          fontSize: 16, 
          color: theme.colors.textSecondary,
          textAlign: "center",
        }}>
          {timeGreeting}, {userName}!
        </Text>
      </View>

      {/* Weather and Location */}
      <View style={{ 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: 16,
      }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            <Ionicons name="location-outline" size={16} color={theme.colors.primary} />
            <Text style={{ 
              fontSize: 14, 
              color: theme.colors.text, 
              marginLeft: 4,
              fontWeight: "600",
            }}>
              {location}
            </Text>
          </View>
          
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 20, marginRight: 8 }}>
              {getWeatherEmoji()}
            </Text>
            <View>
              <Text style={{ fontSize: 16, fontWeight: "600", color: theme.colors.text }}>
                {temperature}°C
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                {currentWeather}
              </Text>
            </View>
          </View>
        </View>

        {/* Weather Advice */}
        <View style={{
          backgroundColor: theme.colors.background,
          padding: 12,
          borderRadius: theme.radius.md,
          alignItems: "center",
          minWidth: 120,
        }}>
          <Text style={{ 
            fontSize: 12, 
            color: theme.colors.textSecondary,
            textAlign: "center",
            marginBottom: 4,
          }}>
            {isNorwegian ? "Dagens råd" : "Today's tip"}
          </Text>
          <Text style={{ 
            fontSize: 14, 
            fontWeight: "600", 
            color: theme.colors.text,
            textAlign: "center",
          }}>
            {getWeatherAdvice()}
          </Text>
        </View>
      </View>

      {/* Seasonal Activity & School Info */}
      <View style={{ 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center",
      }}>
        {/* Seasonal Activity */}
        <View style={{
          backgroundColor: seasonalInfo.color + "20",
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: theme.radius.md,
          flex: schoolInfo ? 1 : 2,
          marginRight: schoolInfo ? 8 : 0,
        }}>
          <Text style={{ 
            fontSize: 13, 
            color: seasonalInfo.color, 
            fontWeight: "600",
            textAlign: "center",
          }}>
            {seasonalInfo.activity}
          </Text>
        </View>

        {/* School Calendar Info */}
        {schoolInfo && (
          <View style={{
            backgroundColor: theme.colors.primary + "20",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: theme.radius.md,
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Ionicons name="school-outline" size={16} color={theme.colors.primary} />
            <Text style={{ 
              fontSize: 13, 
              color: theme.colors.primary, 
              fontWeight: "600",
              marginLeft: 4,
            }}>
              {schoolInfo}
            </Text>
          </View>
        )}
      </View>

      {/* Norwegian Cultural Note */}
      {(seasonalInfo.season === "17mai" || seasonalInfo.season === "lucia" || seasonalInfo.season === "advent") && (
        <View style={{
          backgroundColor: "#C41E3A" + "15", // Norwegian flag red
          borderLeftWidth: 3,
          borderLeftColor: "#C41E3A",
          padding: 12,
          borderRadius: theme.radius.sm,
          marginTop: 16,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>🇳🇴</Text>
            <Text style={{ 
              fontSize: 14, 
              color: "#C41E3A", 
              fontWeight: "600",
              flex: 1,
            }}>
              {isNorwegian 
                ? "En spesiell dag i norsk kultur!" 
                : "A special day in Norwegian culture!"
              }
            </Text>
          </View>
        </View>
      )}
    </Card>
  );
}