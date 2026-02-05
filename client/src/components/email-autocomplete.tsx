import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { User } from "lucide-react";

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

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts/search", lastEmail],
    enabled: lastEmail.length > 0 && showSuggestions,
  });

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
          className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto"
          data-testid="email-autocomplete-dropdown"
        >
          {filteredContacts.map((contact, index) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => selectContact(contact)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                index === selectedIndex 
                  ? "bg-accent text-accent-foreground" 
                  : "hover:bg-muted"
              }`}
              data-testid={`contact-suggestion-${contact.id}`}
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                {contact.name && (
                  <div className="text-sm font-medium truncate">{contact.name}</div>
                )}
                <div className={`text-sm truncate ${contact.name ? "text-muted-foreground" : ""}`}>
                  {contact.email}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
