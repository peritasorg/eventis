import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface Option {
  value: string
  label: string
}

interface MultiSelectProps {
  options: Option[]
  value?: string[]
  onValueChange?: (value: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function MultiSelect({
  options,
  value = [],
  onValueChange,
  placeholder = "Select options...",
  className,
  disabled,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleUnselect = (optionValue: string) => {
    onValueChange?.(value.filter((v) => v !== optionValue))
  }

  const handleSelect = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue]
    onValueChange?.(newValue)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between h-auto min-h-10 p-1", className)}
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1 p-1">
            {value.length > 0 ? (
              value.map((val) => {
                const option = options.find((opt) => opt.value === val)
                return (
                  <Badge
                    variant="secondary"
                    key={val}
                    className="mr-1 mb-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUnselect(val)
                    }}
                  >
                    {option?.label || val}
                    <X className="ml-1 h-3 w-3 cursor-pointer" />
                  </Badge>
                )
              })
            ) : (
              <span className="text-muted-foreground px-1">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search options..." />
          <CommandList>
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}