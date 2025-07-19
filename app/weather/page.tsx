"use client"   

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const API_KEY = "b4f287e75e221d9d3135d41c86b54784"


const cities = [
    { name: "Puerto Princesa", lat: 9.7856, lon: 118.6265 },
  { name: "Cebu", lat: 10.3157, lon: 123.8854 },
  { name: "Davao", lat: 7.1907, lon: 125.4553 },
  { name: "Baguio", lat: 16.4023, lon: 120.596 },
  { name: "Zamboanga", lat: 6.9214, lon: 122.079 }
]


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
        <div className="grid grid-cols-1 p-20 md:grid-cols-3 gap-4">
            {weatherData.map((city) => (
                <Card key={city.name}>
                    <CardHeader>
                        <CardTitle>{city.name}</CardTitle>
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
    )
}