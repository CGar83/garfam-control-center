"use client";

import { useState } from "react";
import { Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppData } from "@/components/app/providers";
import { useToast } from "@/hooks/use-toast";

const categoryKeywords: Array<[string, string[]]> = [
  ["Produce", ["apple", "banana", "lettuce", "tomato", "onion", "pepper", "avocado", "berries", "strawberr", "grape", "lemon", "lime", "spinach", "broccoli", "carrot", "potato", "garlic", "cucumber", "orange", "melon", "kale", "celery", "mushroom", "zucchini"]],
  ["Dairy", ["milk", "cheese", "yogurt", "butter", "cream", "eggs", "egg"]],
  ["Meat and Seafood", ["chicken", "beef", "steak", "turkey", "pork", "salmon", "shrimp", "fish", "bacon", "sausage", "ham"]],
  ["Frozen", ["frozen", "ice cream", "pizza", "waffles", "popsicle"]],
  ["Pantry", ["rice", "pasta", "flour", "sugar", "oil", "beans", "cereal", "oats", "sauce", "soup", "bread", "tortilla", "peanut butter", "honey", "spice", "salt", "broth"]],
  ["Snacks", ["chips", "crackers", "granola", "pretzel", "cookies", "popcorn", "nuts", "fruit snacks"]],
  ["Drinks", ["juice", "coffee", "tea", "soda", "water", "sparkling", "lemonade"]],
  ["Household", ["paper towel", "toilet paper", "detergent", "soap", "sponge", "trash bag", "dish", "cleaner", "foil", "batteries"]],
  ["Baby and Kids", ["diaper", "wipes", "formula", "pouch"]],
  ["Pets", ["dog", "cat", "litter", "kibble", "treats"]]
];

export function guessGroceryCategory(name: string) {
  const lower = name.toLowerCase();
  for (const [category, keywords] of categoryKeywords) {
    if (keywords.some((keyword) => lower.includes(keyword))) return category;
  }
  return "Other";
}

function parseQuantity(raw: string): { name: string; quantity: string | null } {
  const leading = raw.match(/^(\d+(?:\.\d+)?)\s*(?:x\s*)?(.+)$/i);
  if (leading) return { name: leading[2].trim(), quantity: leading[1] };
  const trailing = raw.match(/^(.+?)\s*[x×]\s*(\d+)$/i);
  if (trailing) return { name: trailing[1].trim(), quantity: trailing[2] };
  return { name: raw.trim(), quantity: null };
}

/** One input, many items: "2 milk, eggs, bread x2" becomes three categorized grocery items. */
export function QuickGroceryBar() {
  const { createRecord, currentMemberId } = useAppData();
  const { toast } = useToast();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const parts = value
      .split(/,|\band\b|\n/i)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0 || saving) return;
    setSaving(true);
    try {
      await Promise.all(
        parts.map((part) => {
          const { name, quantity } = parseQuantity(part);
          return createRecord("grocery_items", {
            name: name.charAt(0).toUpperCase() + name.slice(1),
            category: guessGroceryCategory(name),
            quantity: quantity ?? "1",
            unit: null,
            store: null,
            needed_by: null,
            checked: false,
            added_by: currentMemberId
          });
        })
      );
      toast({ title: parts.length === 1 ? "Added to grocery" : `${parts.length} items added`, description: parts.join(", "), variant: "success" });
      setValue("");
    } catch (error) {
      toast({ title: "Could not add", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="surface-panel flex items-center gap-2 p-2 pl-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <ShoppingCart className="h-4 w-4 shrink-0 text-primary" />
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Add milk, eggs, bread x2…"
        aria-label="Quick add grocery items"
        className="h-11 border-0 bg-transparent shadow-none focus:bg-transparent focus:shadow-none dark:bg-transparent dark:focus:bg-transparent"
      />
      <Button type="submit" disabled={saving || !value.trim()} className="shrink-0">
        <Plus className="h-4 w-4" />
        Add
      </Button>
    </form>
  );
}
