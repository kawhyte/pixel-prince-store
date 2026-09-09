/**
 * Real buyer reviews, copied verbatim from the Etsy shop on 2026-09-08 (PLAN-39).
 * First names only, as Etsy shows them. Print reviews only; mug reviews left out.
 * Rules (tests/unit/reviews.test.ts): at most 220 chars, no em dashes, at least 9 entries.
 */

export interface Review {
  quote: string;
  name: string;
  product?: string;
  date?: string;
}

export const REVIEW_SUMMARY = {
  rating: "4.9",
  count: "1,900+",
  source: "verified buyers",
} as const;

export const REVIEWS: Review[] = [
  {
    quote: "Shipping was fast! The colors are just beautiful, thank you!",
    name: "Maria",
    product: "USA Map with State Capitals",
    date: "December 2025",
  },
  {
    quote: "Exactly what I was after and looks great in the game room.",
    name: "Jacob",
    product: "Video Game Controller Print",
    date: "January 2026",
  },
  {
    quote: "Beautiful print. Good quality paper and colors are perfect! Thank you!!",
    name: "Amy",
    product: "Chicago Skyline Print",
    date: "June 2023",
  },
  {
    quote: "Beautiful map, very stylish and practical. Great customer service and fast delivery.",
    name: "Joy",
    product: "Brooklyn Neighborhood Map",
    date: "July 2024",
  },
  {
    quote:
      "Arrived fairly quickly and in great protective packaging. Exactly the size it says, fits into a standard frame. My kids will enjoy this! Very neat piece.",
    name: "Jolee",
    product: "Video Game Controller Print",
    date: "January 2022",
  },
  {
    quote:
      "Great product, grandson is into geography and is going to love this map. Customer service is outstanding, the company stands by their product. Would purchase from them again.",
    name: "Jim",
    product: "World Map with Flags",
    date: "December 2023",
  },
  {
    quote: "I love my Brooklyn pic! The colors are vibrant and it fits perfectly with my decor.",
    name: "Natalee",
    product: "Brooklyn Neighborhood Map",
    date: "July 2022",
  },
  {
    quote: "Item arrived quickly and looks exactly as pictured.",
    name: "Leah",
    product: "Game Room Set of 2",
    date: "November 2024",
  },
  {
    quote: "Gift for brother in law. He absolutely loved it.",
    name: "Tabitha",
    product: "Console Evolution Print",
    date: "January 2025",
  },
  {
    quote: "Boyfriend loved it as a gift!",
    name: "Allison",
    product: "Video Game Controller Print",
    date: "May 2024",
  },
  {
    quote:
      "Great quality paper and item! It does come rolled up in a secure box, you'll need to flatten it before framing.",
    name: "Kristina",
    product: "Video Game Controller Print",
    date: "December 2021",
  },
];
