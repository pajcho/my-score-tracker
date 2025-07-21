import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface OpponentAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  opponents: string[];
  placeholder?: string;
  required?: boolean;
  label?: string;
  className?: string;
}

export function OpponentAutocomplete({
  value,
  onChange,
  opponents,
  placeholder = "Enter opponent's name",
  required = false,
  label = "Opponent",
  className
}: OpponentAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOpponents, setFilteredOpponents] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter opponents based on input
  useEffect(() => {
    if (value && isOpen) {
      const filtered = opponents.filter(opponent =>
        opponent.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredOpponents(filtered);
      setSelectedIndex(-1);
    } else {
      setFilteredOpponents([]);
    }
  }, [value, opponents, isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || filteredOpponents.length === 0) {
      if (e.key === 'ArrowDown' && value) {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredOpponents.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOpponents.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredOpponents.length) {
          handleSelect(filteredOpponents[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  }, [isOpen, filteredOpponents, selectedIndex]);

  // Handle opponent selection
  const handleSelect = useCallback((opponent: string) => {
    onChange(opponent);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  }, [onChange]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
  };

  // Handle input focus
  const handleFocus = () => {
    if (value) {
      setIsOpen(true);
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("space-y-2 relative", className)}>
      <Label htmlFor="opponent">{label} {required && '*'}</Label>
      <Input
        ref={inputRef}
        id="opponent"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
      
      {/* Autocomplete Dropdown */}
      {isOpen && filteredOpponents.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {filteredOpponents.map((opponent, index) => (
            <div
              key={opponent}
              className={cn(
                "px-3 py-2 hover:bg-accent cursor-pointer text-sm transition-colors",
                selectedIndex === index && "bg-accent"
              )}
              onClick={() => handleSelect(opponent)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {opponent}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}