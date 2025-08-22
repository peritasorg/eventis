import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';

interface AddressData {
  line1?: string;
  line2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
}

interface AddressSearchInputProps {
  value: AddressData;
  onChange: (address: AddressData) => void;
  label?: string;
}

interface PostcodeResult {
  postcode: string;
  country: string;
  region: string;
  admin_district: string;
  admin_county?: string;
}

export const AddressSearchInput: React.FC<AddressSearchInputProps> = ({
  value,
  onChange,
  label = "Address"
}) => {
  const [postcodeSearch, setPostcodeSearch] = useState('');
  const [postcodeResults, setPostcodeResults] = useState<PostcodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const searchPostcode = useCallback(async (postcode: string) => {
    if (!postcode || postcode.length < 3) {
      setPostcodeResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Use postcodes.io API for UK postcode lookup (free service)
      const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          setPostcodeResults([data.result]);
        }
      } else if (response.status === 404) {
        // Try partial postcode search
        const partialResponse = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}/autocomplete`);
        if (partialResponse.ok) {
          const partialData = await partialResponse.json();
          if (partialData.result && partialData.result.length > 0) {
            // Get details for first few results
            const detailPromises = partialData.result.slice(0, 5).map((pc: string) =>
              fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`).then(r => r.json())
            );
            const details = await Promise.all(detailPromises);
            setPostcodeResults(details.map(d => d.result).filter(Boolean));
          }
        }
      }
    } catch (error) {
      console.error('Postcode search error:', error);
      toast.error('Failed to search postcode');
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handlePostcodeSelect = (result: PostcodeResult) => {
    onChange({
      ...value,
      city: result.admin_district,
      county: result.admin_county || result.region,
      postcode: result.postcode,
      country: 'United Kingdom'
    });
    setShowSearch(false);
    setPostcodeSearch('');
    setPostcodeResults([]);
  };

  const handleManualAddressChange = (field: keyof AddressData, fieldValue: string) => {
    onChange({
      ...value,
      [field]: fieldValue
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Popover open={showSearch} onOpenChange={setShowSearch}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <MapPin className="h-4 w-4 mr-2" />
              Search Postcode
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <Command>
              <CommandInput
                placeholder="Enter UK postcode..."
                value={postcodeSearch}
                onValueChange={(search) => {
                  setPostcodeSearch(search);
                  searchPostcode(search);
                }}
              />
              <CommandList>
                {isSearching && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Searching...
                  </div>
                )}
                {!isSearching && postcodeResults.length === 0 && postcodeSearch && (
                  <CommandEmpty>No postcodes found.</CommandEmpty>
                )}
                {postcodeResults.length > 0 && (
                  <CommandGroup>
                    {postcodeResults.map((result, index) => (
                      <CommandItem
                        key={index}
                        onSelect={() => handlePostcodeSelect(result)}
                        className="flex flex-col items-start"
                      >
                        <div className="font-medium">{result.postcode}</div>
                        <div className="text-sm text-muted-foreground">
                          {result.admin_district}, {result.region}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="line1">Address Line 1</Label>
          <Input
            id="line1"
            value={value.line1 || ''}
            onChange={(e) => handleManualAddressChange('line1', e.target.value)}
            placeholder="Street address"
          />
        </div>

        <div>
          <Label htmlFor="line2">Address Line 2 (Optional)</Label>
          <Input
            id="line2"
            value={value.line2 || ''}
            onChange={(e) => handleManualAddressChange('line2', e.target.value)}
            placeholder="Apartment, suite, etc."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={value.city || ''}
              onChange={(e) => handleManualAddressChange('city', e.target.value)}
              placeholder="City"
            />
          </div>
          <div>
            <Label htmlFor="postcode">Postcode</Label>
            <Input
              id="postcode"
              value={value.postcode || ''}
              onChange={(e) => handleManualAddressChange('postcode', e.target.value)}
              placeholder="Postcode"
            />
          </div>
        </div>
      </div>
    </div>
  );
};