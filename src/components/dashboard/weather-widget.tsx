"use client";

import { useEffect, useState } from "react";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Loader2,
  Droplets,
  Wind,
  CloudDrizzle,
} from "lucide-react";
import { WidgetCard } from "./widget-card";

interface WeatherData {
  temperatureC: number;
  code: number;
  humidityPercent: number;
  windKmh: number;
  precipitationProbabilityPercent: number | null;
}

// WMO weather codes -> icon + label, per https://open-meteo.com/en/docs
function describeCode(code: number) {
  if (code === 0) return { label: "Clear", Icon: Sun };
  if ([1, 2].includes(code)) return { label: "Partly cloudy", Icon: Cloud };
  if (code === 3) return { label: "Overcast", Icon: Cloud };
  if ([45, 48].includes(code)) return { label: "Foggy", Icon: CloudFog };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return { label: "Rain", Icon: CloudRain };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: "Snow", Icon: CloudSnow };
  if ([95, 96, 99].includes(code)) return { label: "Storms", Icon: CloudLightning };
  return { label: "Clear", Icon: Sun };
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  // Always starts "loading" so server and client render identically before
  // hydration; geolocation support can only be checked client-side.
  const [state, setState] = useState<"loading" | "ready" | "error" | "denied">("loading");

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only capability check, can't be derived during SSR render
      setState("error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&hourly=precipitation_probability&forecast_days=1`,
          );
          if (!res.ok) throw new Error("weather request failed");
          const data = await res.json();

          // Match the current hour against the hourly precipitation series --
          // "probability of rain" is inherently a forecast figure, Open-Meteo
          // has no such thing in its "current" block, so this is the closest
          // real value to it rather than something invented.
          const currentHourIso: string = data.current.time.slice(0, 13);
          const hourIndex: number = (data.hourly?.time ?? []).findIndex((t: string) =>
            t.startsWith(currentHourIso),
          );
          const precipitationProbabilityPercent =
            hourIndex >= 0 ? (data.hourly.precipitation_probability[hourIndex] ?? null) : null;

          setWeather({
            temperatureC: Math.round(data.current.temperature_2m),
            code: data.current.weather_code,
            humidityPercent: Math.round(data.current.relative_humidity_2m),
            windKmh: Math.round(data.current.wind_speed_10m),
            precipitationProbabilityPercent,
          });
          setState("ready");
        } catch {
          setState("error");
        }
      },
      () => setState("denied"),
      { timeout: 8000 },
    );
  }, []);

  return (
    <WidgetCard title="Weather" icon={<Sun className="h-4 w-4 text-neutral-400" />}>
      {state === "loading" ? (
        <div className="flex items-center gap-2 py-2 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Getting local weather...
        </div>
      ) : null}

      {state === "denied" || state === "error" ? (
        <p className="py-2 text-sm text-neutral-500">
          {state === "denied"
            ? "Enable location access to see local weather."
            : "Weather unavailable right now."}
        </p>
      ) : null}

      {state === "ready" && weather ? (
        (() => {
          const { label, Icon } = describeCode(weather.code);
          return (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400">
                  <Icon className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                    {weather.temperatureC}°C
                  </p>
                  <p className="text-xs text-neutral-500">
                    {label} · Your location
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                <div className="flex flex-col items-center gap-1">
                  <Wind className="h-3.5 w-3.5 text-neutral-400" />
                  <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {weather.windKmh} km/h
                  </p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Droplets className="h-3.5 w-3.5 text-neutral-400" />
                  <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {weather.humidityPercent}%
                  </p>
                </div>
                {weather.precipitationProbabilityPercent !== null ? (
                  <div className="flex flex-col items-center gap-1">
                    <CloudDrizzle className="h-3.5 w-3.5 text-neutral-400" />
                    <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      {weather.precipitationProbabilityPercent}%
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })()
      ) : null}
    </WidgetCard>
  );
}
