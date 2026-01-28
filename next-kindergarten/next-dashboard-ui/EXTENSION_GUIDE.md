# 🚀 Teacher Panel UI - Extension Guide

This guide shows you how to extend and customize your teacher panel with new features.

---

## 📋 Table of Contents

1. [Adding New Menu Items](#adding-new-menu-items)
2. [Creating New Dashboard Cards](#creating-new-dashboard-cards)
3. [Adding New Sidebar Sections](#adding-new-sidebar-sections)
4. [Customizing Colors](#customizing-colors)
5. [Adding Real Data](#adding-real-data)
6. [Creating New Pages](#creating-new-pages)
7. [Advanced Customization](#advanced-customization)

---

## Adding New Menu Items

### In Sidebar Navigation

Edit `src/app/components/TeacherSidebar.tsx`:

```typescript
import { YourNewIcon } from "lucide-react";

const menuGroups = [
  {
    title: "Teaching",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/teacher" },
      // Add your new item:
      { icon: YourNewIcon, label: "New Feature", href: "/teacher/new-feature" },
    ],
  },
];
```

[Browse 1400+ icons from Lucide](https://lucide.dev)

### In Quick Actions Menu

Edit `src/app/components/TeacherTopBar.tsx`:

```typescript
{quickActionMenu && (
  <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-50 w-56">
    {/* Existing items... */}
    
    {/* Your new quick action: */}
    <button className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3">
      <YourIcon className="w-4 h-4 text-color-600" />
      Your New Action
    </button>
  </div>
)}
```

---

## Creating New Dashboard Cards

### Add to Stats Grid

Edit `src/app/components/TeacherDashboardStats.tsx`:

```typescript
const stats = [
  // ... existing stats ...
  {
    title: "New Metric",
    value: "99",
    subtitle: "Description here",
    icon: YourIcon,
    color: "bg-indigo-50",
    textColor: "text-indigo-600",
  },
];
```

### Create Custom Card Component

```typescript
// src/app/components/TeacherCustomCard.tsx
"use client";

import { ReactNode } from "react";

interface CustomCardProps {
  title: string;
  children: ReactNode;
  action?: { label: string; onClick: () => void };
}

export default function TeacherCustomCard({ 
  title, 
  children, 
  action 
}: CustomCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        {action && (
          <button 
            onClick={action.onClick}
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
          >
            {action.label} →
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
```

Usage:
```typescript
<TeacherCustomCard 
  title="My Card"
  action={{ label: "View All", onClick: () => {} }}
>
  Your content here
</TeacherCustomCard>
```

---

## Adding New Sidebar Sections

Edit `src/app/components/TeacherSidebar.tsx`:

```typescript
const menuGroups = [
  // ... existing groups ...
  {
    title: "Advanced", // New section
    items: [
      { icon: Zap, label: "Analytics", href: "/teacher/analytics" },
      { icon: BarChart3, label: "Reports", href: "/teacher/reports" },
      { icon: TrendingUp, label: "Insights", href: "/teacher/insights" },
    ],
  },
];
```

---

## Customizing Colors

### Global Theme Colors

Edit `tailwind.config.ts`:

```typescript
theme: {
  extend: {
    colors: {
      primary: "#FF6B6B",        // Change primary (red)
      accent: "#4ECDC4",         // Change accent (teal)
      success: "#95E1D3",        // Change success (mint)
      "bg-light": "#F7F7F7",     // Change background
    },
  },
}
```

### Tailwind Color Reference

```
Reds:     from-red-50 to red-100, red-200, ... red-900
Blues:    from-blue-50 to blue-900
Greens:   from-green-50 to green-900
Purples:  from-purple-50 to purple-900
Yellows:  from-yellow-50 to yellow-900
Grays:    from-gray-50 to gray-900
```

### Component-Specific Colors

```typescript
// Use different colors for different sections
<div className="bg-blue-50 text-blue-600">Blue Section</div>
<div className="bg-green-50 text-green-600">Green Section</div>
<div className="bg-purple-50 text-purple-600">Purple Section</div>
```

---

## Adding Real Data

### Connect to API

```typescript
"use client";

import { useEffect, useState } from "react";

export default function TeacherDashboardStats() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/teacher/stats");
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <StatCard key={stat.id} stat={stat} />
      ))}
    </div>
  );
}
```

### Use React Query (Recommended)

```bash
npm install @tanstack/react-query
```

```typescript
import { useQuery } from "@tanstack/react-query";

function TeacherDashboardStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["teacher-stats"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/stats");
      return res.json();
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    // Your JSX
  );
}
```

---

## Creating New Pages

### Step 1: Create Page File

```bash
mkdir -p src/app/(dashboard)/teacher/analytics
touch src/app/(dashboard)/teacher/analytics/page.tsx
```

### Step 2: Create Component

```typescript
// src/app/(dashboard)/teacher/analytics/page.tsx

import TeacherSidebar from "@/app/components/TeacherSidebar";
import TeacherTopBar from "@/app/components/TeacherTopBar";
import MobileTeacherSidebar from "@/app/components/MobileTeacherSidebar";

export default function AnalyticsPage() {
  return (
    <div className="flex h-screen bg-slate-50">
      <TeacherSidebar />
      <MobileTeacherSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TeacherTopBar />

        <main className="flex-1 overflow-y-auto p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-8">
            Analytics Dashboard
          </h1>
          
          {/* Your page content */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <p className="text-slate-600">Analytics content goes here</p>
          </div>
        </main>
      </div>
    </div>
  );
}
```

### Step 3: Add to Sidebar Menu

Update `TeacherSidebar.tsx`:
```typescript
{ icon: Analytics, label: "Analytics", href: "/teacher/analytics" }
```

---

## Advanced Customization

### Create Custom Hooks

```typescript
// src/hooks/useTeacherStats.ts
import { useQuery } from "@tanstack/react-query";

export function useTeacherStats() {
  return useQuery({
    queryKey: ["teacher-stats"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/stats");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
}
```

### Create Reusable Components

```typescript
// src/app/components/StatCard.tsx
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  Icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  Icon,
  colorClass,
}: StatCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-600 text-sm font-medium">{title}</p>
          <p className="text-4xl font-bold text-slate-900 mt-2">{value}</p>
          <p className="text-slate-500 text-xs mt-1">{subtitle}</p>
        </div>
        <div className={`${colorClass} p-3 rounded-lg`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
```

### Add Dark Mode

```typescript
// In your layout or root component
export default function RootLayout({ children }) {
  const [theme, setTheme] = useState("light");

  return (
    <html className={theme === "dark" ? "dark" : ""}>
      <body>{children}</body>
    </html>
  );
}
```

Then in Tailwind classes:
```typescript
<div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
  Content
</div>
```

---

## Common Customizations

### Change Button Style

Find all buttons and add classes:
```typescript
// Primary button
className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg transition"

// Secondary button
className="border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg transition"

// Soft button
className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded-lg transition"
```

### Add Notifications (Toast)

```bash
npm install react-hot-toast
```

```typescript
import toast from "react-hot-toast";

function MyComponent() {
  const handleSuccess = () => {
    toast.success("Success!");
  };

  const handleError = () => {
    toast.error("Error!");
  };

  return (
    <div>
      <button onClick={handleSuccess}>Success</button>
      <button onClick={handleError}>Error</button>
    </div>
  );
}
```

### Add Loading States

```typescript
"use client";

import { useState } from "react";

export default function MyComponent() {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      // Your async operation
      await fetch("/api/something");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleClick}
      disabled={loading}
      className="disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? "Loading..." : "Click me"}
    </button>
  );
}
```

---

## Performance Tips

1. **Lazy Load Components**
   ```typescript
   import dynamic from "next/dynamic";
   const HeavyComponent = dynamic(() => import("./HeavyComponent"));
   ```

2. **Memoize Components**
   ```typescript
   import { memo } from "react";
   export default memo(MyComponent);
   ```

3. **Optimize Images**
   ```typescript
   import Image from "next/image";
   <Image src="/image.jpg" width={400} height={300} />
   ```

4. **Use SWR for Data**
   ```bash
   npm install swr
   ```
   ```typescript
   import useSWR from "swr";
   const { data, error } = useSWR("/api/data", fetch);
   ```

---

## Testing Your Changes

```bash
# Development server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Linting
npm run lint
```

---

## Deployment

### Vercel (Recommended for Next.js)
```bash
npm install -g vercel
vercel
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Troubleshooting

### Issue: Styles not applying
```bash
# Restart dev server
npm run dev
# Clear Next.js cache
rm -rf .next
```

### Issue: Icon not showing
```typescript
// Make sure to import from lucide-react
import { IconName } from "lucide-react";
```

### Issue: Page not found
```bash
# Check file structure
ls -la src/app/\(dashboard\)/teacher/
```

---

## Resources

- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Lucide Icons](https://lucide.dev)
- [React Query](https://tanstack.com/query/latest)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## Need Help?

1. Check the component source code
2. Look at existing components for patterns
3. Read the inline comments
4. Check the TEACHER_PANEL_UI.md file

**Happy customizing! 🎉**
