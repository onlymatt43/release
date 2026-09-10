"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { cn } from "@/lib/utils";

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

interface Props {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function AddressAutocomplete({
  id,
  value,
  onChange,
  placeholder = "123 Rue Exemple, Montréal, QC H1A 1A1",
  required,
  className,
}: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showList, setShowList] = useState(false);
  const tokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placesRef = useRef<google.maps.PlacesLibrary | null>(null);

  useEffect(() => {
    if (!KEY) return;
    setOptions({ key: KEY, v: "weekly" });
    importLibrary("places")
      .then((lib) => {
        placesRef.current = lib as google.maps.PlacesLibrary;
        tokenRef.current = new (lib as google.maps.PlacesLibrary).AutocompleteSessionToken();
      })
      .catch(() => {});
  }, []);

  const fetchSuggestions = useCallback(async (input: string) => {
    const lib = placesRef.current;
    if (!lib || input.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { suggestions: results } = await (lib as any).AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: tokenRef.current,
        includedPrimaryTypes: ["address"],
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSuggestions(results.map((s: any) => s.placePrediction?.text?.toString() ?? "").filter(Boolean));
      setShowList(true);
    } catch {
      setSuggestions([]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchSuggestions(e.target.value), 300);
  };

  const select = (addr: string) => {
    onChange(addr);
    setSuggestions([]);
    setShowList(false);
    // Reset session token after selection (billing best practice)
    if (placesRef.current) {
      tokenRef.current = new placesRef.current.AutocompleteSessionToken();
    }
  };

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        required={required}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setShowList(true)}
        onBlur={() => setTimeout(() => setShowList(false), 150)}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      />
      {showList && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover py-1 text-sm shadow-md">
          {suggestions.map((addr, i) => (
            <li
              key={i}
              onMouseDown={() => select(addr)}
              className="cursor-pointer px-3 py-2 hover:bg-accent hover:text-accent-foreground"
            >
              {addr}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

