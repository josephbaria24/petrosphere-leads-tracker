"use client"   

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSun, Droplet, Snowflake, Sun, Zap } from "lucide-react"
import ScrollFloat from "@/components/scroll-float"
import ClickSpark from "@/components/click-spark"


const API_KEY = "b4f287e75e221d9d3135d41c86b54784"


const cities = [
    { name: "Puerto Princesa", lat: 9.7856, lon: 118.6265 },
    { name: "Aborlan", lat: 9.4399, lon: 118.5478 },
    { name: "Narra", lat: 9.2290, lon: 118.3305 },
    { name: "Sofronio Española", lat: 8.9631, lon: 117.9909 },
    { name: "Brooke's Point", lat: 8.7862, lon: 117.8382 },
    { name: "Bataraza", lat:8.5878, lon: 117.4321 }
]

const getWeatherIcon = (condition: string) => {
    const lower = condition.toLowerCase();
  
    if (lower.includes("rain")) return <CloudRain className="w-5 h-5 ml-2" />;
    if (lower.includes("cloud")) return <Cloud className="w-5 h-5 ml-2" />;
    if (lower.includes("clear")) return <Sun className="w-5 h-5 ml-2" />;
    if (lower.includes("storm") || lower.includes("thunder")) return <Zap className="w-5 h-5 ml-2" />;
    if (lower.includes("drizzle")) return <CloudDrizzle className="w-5 h-5 ml-2" />;
    if (lower.includes("snow")) return <Snowflake className="w-5 h-5 ml-2" />;
    if (lower.includes("fog") || lower.includes("mist") || lower.includes("haze"))
      return <CloudFog className="w-5 h-5 ml-2" />;
    if (lower.includes("humidity")) return <Droplet className="w-5 h-5 ml-2" />;
    
    return <CloudSun className="w-5 h-5 ml-2" />; // fallback icon
  };


export default function WeatherPage() {
    const [weatherData, setWeatherData] = useState<any[]>([])

    useEffect(() => {
        const fetchWeather = async () => {
            const data = await Promise.all(
                cities.map(async (city) => {
                    const res = await fetch(
                        `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&appid=${API_KEY}&units=metric`  
                    )
                    const json = await res.json()
                    return { ...city, weather: json }
                })
            )
            setWeatherData(data)
        }
        fetchWeather()
    }, [])

    return (
        <div className="min-h-screen py-10">
            <div className="text-center 0">
            <p className="text-[50px] font-semibold tracking-tight">Weather overview</p>
            <p className="mt-2 text-muted-foreground text-lg">Live weather across Palawan municipalities</p>
            </div>
            
        
        <div className="grid grid-cols-1 p-10 md:grid-cols-6 gap-4">
            
            {weatherData.map((city) => (
                <Card key={city.name} className="bg-transparent">
                    <CardHeader>
                        <CardTitle className="font-bold text-2xl flex items-center">{city.name}{getWeatherIcon(city.weather.weather[0].description)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Temperature: {city.weather.main.temp}°C</p>
                        <p>Condition: {city.weather.weather[0].description}</p>
                        <p>Humidity: {city.weather.main.humidity}%</p>
                        <p>Wind: {city.weather.wind.speed}m/s</p>
                    </CardContent>
                </Card>
            ))}

            </div>
            
        </div>
    )
}