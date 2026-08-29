import * as React from "react";
import { cn } from "../utils/cn";
import { Label } from "./label";
import { Search, ChevronDown, X } from "lucide-react";

type Option = [string, string]; // [value, label]

interface AutocompleteProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  error?: string;
  disabled?: boolean;
  allowCustomValue?: boolean;
}

export const Autocomplete = React.forwardRef<HTMLInputElement, AutocompleteProps>(
  ({ label, value, onChange, options, placeholder = "Search...", className, error, disabled, allowCustomValue }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Find the current selected option label
    const selectedOption = options.find((opt) => opt[0] === value);
    const selectedLabel = selectedOption ? selectedOption[1] : (allowCustomValue ? value : "");

    // Sync query with value externally or initially
    React.useEffect(() => {
      if (value) {
        setQuery(selectedLabel);
      } else {
        setQuery("");
      }
    }, [value, selectedLabel]);

    // Handle clicks outside the component to close the dropdown
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          if (value) {
            setQuery(selectedLabel);
          } else {
            setQuery("");
          }
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [value, selectedLabel]);

    // Filter options based on query
    const filteredOptions = React.useMemo(() => {
      if (!query || query === selectedLabel) {
        return options;
      }
      return options.filter((opt) =>
        opt[1].toLowerCase().includes(query.toLowerCase())
      );
    }, [options, query, selectedLabel]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
      setIsOpen(true);
      if (e.target.value === "") {
        onChange("");
      } else if (allowCustomValue) {
        onChange(e.target.value);
      }
    };

    const handleSelectOption = (optValue: string, optLabel: string) => {
      onChange(optValue);
      setQuery(optLabel);
      setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange("");
      setQuery("");
      setIsOpen(false);
    };

    return (
      <div className={cn("relative flex flex-col w-full", isOpen && "z-[9999]", className)} ref={containerRef}>
        {label && <Label className="font-semibold block mb-1 text-xs">{label}</Label>}
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            disabled={disabled}
            className={cn(
              "flex h-9 w-full rounded-md border bg-background pl-8 pr-10 py-1.5 text-xs outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed",
              error ? "border-red-500" : ""
            )}
          />
          <div className="absolute left-2.5 text-muted-foreground pointer-events-none">
            <Search size={14} />
          </div>

          <div className="absolute right-2 flex items-center gap-1">
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-full text-muted-foreground hover:bg-muted transition"
              >
                <X size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="p-1 rounded-full text-muted-foreground hover:bg-muted transition"
            >
              <ChevronDown size={16} className={cn("transition-transform duration-200", isOpen ? "rotate-180" : "")} />
            </button>
          </div>
        </div>

        {isOpen && (
          <ul className="absolute top-[calc(100%+4px)] z-[9999] w-full max-h-60 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-lg animate-in fade-in slide-in-from-top-1 duration-200">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt[0] === value;
                return (
                  <li
                    key={opt[0]}
                    onClick={() => handleSelectOption(opt[0], opt[1])}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                      isSelected ? "bg-accent/55 font-medium text-accent-foreground" : ""
                    )}
                  >
                    {opt[1]}
                  </li>
                );
              })
            ) : (
              <li className="relative flex w-full select-none items-center px-3 py-3 text-sm text-muted-foreground">
                No options found
              </li>
            )}
          </ul>
        )}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    );
  }
);

Autocomplete.displayName = "Autocomplete";
