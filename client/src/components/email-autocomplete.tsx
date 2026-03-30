import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { User, Clock } from "lucide-react";

interface Contact {
  id: number;
  email: string;
  name: string | null;
  useCount: number;
}

interface EmailAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

export function EmailAutocomplete({
  value,
  onChange,
  placeholder = "Recipients",
  className = "",
  "data-testid": testId,
}: EmailAutocompleteProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const lastEmail = value.split(",").pop()?.trim() || "";
  const previousEmails = value.includes(",") 
    ? value.substring(0, value.lastIndexOf(",") + 1) + " "
    : "";

  const { data: searchResults = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts/search", lastEmail],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/search?q=${encodeURIComponent(lastEmail)}`);
      if (!res.ok) throw new Error("Failed to fetch contacts");
      return res.json();
    },
    enabled: lastEmail.length > 0 && showSuggestions,
  });

  const { data: recentContacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts/search", ""],
    queryFn: async () => {
      const res = await fetch("/api/contacts/search?q=");
      if (!res.ok) throw new Error("Failed to fetch contacts");
      return res.json();
    },
    enabled: showSuggestions && lastEmail.length === 0,
  });

  const contacts = lastEmail.length > 0 ? searchResults : recentContacts;

  const filteredContacts = contacts.filter(c => {
    const existing = value.toLowerCase().split(",").map(e => e.trim());
    return !existing.includes(c.email.toLowerCase());
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredContacts.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectContact = (contact: Contact) => {
    const newValue = previousEmails + contact.email;
    onChange(newValue);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredContacts.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredContacts.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredContacts[selectedIndex]) {
          selectContact(filteredContacts[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
      case "Tab":
        if (filteredContacts[selectedIndex]) {
          e.preventDefault();
          selectContact(filteredContacts[selectedIndex]);
        }
        break;
    }
  };

  const isShowingRecent = lastEmail.length === 0 && filteredContacts.length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        data-testid={testId}
        autoComplete="off"
      />
      
      {showSuggestions && filteredContacts.length > 0 && (
        <div 
          className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl z-50 max-h-56 overflow-y-auto"
          style={{
            background: "rgba(22,22,28,0.98)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
          }}
          data-testid="email-autocomplete-dropdown"
        >
          {isShowingRecent && (
            <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <Clock className="w-3 h-3 text-foreground/25" />
              <span className="text-[10px] text-foreground/25 uppercase tracking-wider font-medium">Recent</span>
            </div>
          )}
          {filteredContacts.map((contact, index) => {
            const initial = (contact.name?.[0] || contact.email[0] || "?").toUpperCase();
            return (
              <button
                key={contact.id}
                type="button"
                onClick={() => selectContact(contact)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors cursor-pointer ${
                  index === selectedIndex 
                    ? "bg-blue-500/10" 
                    : "hover:bg-white/[0.03]"
                }`}
                data-testid={`contact-suggestion-${contact.id}`}
              >
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold"
                  style={{
                    background: index === selectedIndex ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.06)",
                    color: index === selectedIndex ? "rgba(147,197,253,0.9)" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {contact.name ? initial : <User className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  {contact.name && (
                    <div className="text-[13px] font-medium text-foreground/80 truncate">{contact.name}</div>
                  )}
                  <div className={`text-[12px] truncate ${contact.name ? "text-foreground/35" : "text-foreground/60"}`}>
                    {contact.email}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
