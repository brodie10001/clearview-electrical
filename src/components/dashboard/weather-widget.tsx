"use client";

import { useEffect, useState } from "react";
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, Loader2 } from "lucide-react";
import { WidgetCard } from "./widget-card";

interface WeatherData {
  temperatureC: number;
  code: number;
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
            `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,weather_code`,
          );
          if (!res.ok) throw new Error("weather request failed");
          const data = await res.json();
          setWeather({
            temperatureC: Math.round(data.current.temperature_2m),
            code: data.current.weather_code,
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
    <WidgetCard title="Weather">
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
            <div className="flex items-center gap-3 py-1">
              <Icon className="h-9 w-9 text-amber-500" />
              <div>
                <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
                  {weather.temperatureC}°C
                </p>
                <p className="text-xs text-neutral-500">{label}</p>
              </div>
            </div>
          );
        })()
      ) : null}
    </WidgetCard>
  );
}
