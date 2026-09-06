import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/today",
    name: "Gather: Family Home Base",
    short_name: "Gather",
    description: "Your family's shared hub for today: calendar, chores, routines, meals, lists, memories, and check-ins.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#fbf7f2",
    theme_color: "#F0705A",
    orientation: "portrait",
    categories: ["productivity", "lifestyle", "utilities"],
    launch_handler: {
      client_mode: "focus-existing"
    },
    icons: [
      {
        src: "/icons/family-control.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/family-control-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable"
      },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ],
    shortcuts: [
      {
        name: "Today",
        short_name: "Today",
        description: "Open today's family brief.",
        url: "/today",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }]
      },
      {
        name: "Chores",
        short_name: "Chores",
        description: "Check off chores and see points.",
        url: "/chores",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }]
      },
      {
        name: "Grocery List",
        short_name: "Groceries",
        description: "Open the shared grocery list.",
        url: "/grocery",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }]
      },
      {
        name: "Family Calendar",
        short_name: "Calendar",
        description: "Open family calendar and sync tools.",
        url: "/calendar",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }]
      },
      {
        name: "Budget & Cards",
        short_name: "Budget",
        description: "Open budget, cards, utilization, and sinking funds.",
        url: "/budget",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }]
      }
    ]
  };
}
