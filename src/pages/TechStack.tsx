import React from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Box, Code2, Database, Layout, Palette, Zap, Globe, Image as ImageIcon, ScanText, Languages } from 'lucide-react';

interface TechItem {
  name: string;
  version?: string;
  description: string;
  category: string;
  icon: React.ElementType;
}

const techStack: TechItem[] = [
  {
    name: 'React',
    version: '18.0.0',
    description: 'A JavaScript library for building user interfaces.',
    category: 'Framework',
    icon: Layout,
  },
  {
    name: 'Supabase',
    version: '2.103.1',
    description: 'Open source Firebase alternative providing database, auth, and edge functions.',
    category: 'Backend',
    icon: Database,
  },
  {
    name: 'Tailwind CSS',
    version: '3.4.11',
    description: 'A utility-first CSS framework for rapid UI development.',
    category: 'Styling',
    icon: Palette,
  },
  {
    name: 'shadcn/ui',
    description: 'Beautifully designed components built with Radix UI and Tailwind CSS.',
    category: 'UI Components',
    icon: Box,
  },
  {
    name: 'React Router',
    version: '7.9.5',
    description: 'Standard library for routing in React applications.',
    category: 'Routing',
    icon: Globe,
  },
  {
    name: 'Lucide React',
    version: '0.576.0',
    description: 'Beautiful & consistent icon toolkit made by the community.',
    category: 'Icons',
    icon: Code2,
  },
  {
    name: 'Recharts',
    version: '2.15.4',
    description: 'A composable charting library built on React components.',
    category: 'Data Visualization',
    icon: Zap,
  },
  {
    name: 'Motion',
    version: '12.23.25',
    description: 'A production-ready motion library for React.',
    category: 'Animation',
    icon: Zap,
  },
  {
    name: 'OCR Plugin',
    description: 'Built-in platform plugin for extracting text from receipt images.',
    category: 'API / Plugin',
    icon: ScanText,
  },
  {
    name: 'Google Translation',
    description: 'Built-in platform plugin for text translation services.',
    category: 'API / Plugin',
    icon: Languages,
  },
  {
    name: 'Unsplash API',
    description: 'Used for providing high-quality demo images for receipts.',
    category: 'External API',
    icon: ImageIcon,
  },
];

export default function TechStack() {
  const categories = Array.from(new Set(techStack.map((item) => item.category)));

  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-montserrat tracking-tight text-foreground">Technology Stack</h1>
          <p className="text-muted-foreground text-lg">
            A comprehensive list of SDKs, libraries, and APIs that power the Smart Expense Coach.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((category) => (
            <Card key={category} className="bg-card border-border shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-montserrat flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-md">
                    {category}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {techStack
                  .filter((item) => item.category === category)
                  .map((item) => (
                    <div key={item.name} className="flex gap-4 items-start group">
                      <div className="p-2 rounded-lg bg-accent/50 text-accent-foreground shrink-0 transition-colors group-hover:bg-accent">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{item.name}</h3>
                          {item.version && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border font-mono">
                              v{item.version}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-secondary-text leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="pt-8 border-t border-border">
          <Card className="bg-accent/10 border-dashed border-border shadow-none">
            <CardContent className="p-6 text-center space-y-2">
              <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">
                Built with precision
              </p>
              <h2 className="text-xl font-bold text-foreground">Smart Expense Coach Infrastructure</h2>
              <p className="max-w-2xl mx-auto text-secondary-text text-sm">
                Our architecture is designed for performance, security, and scalability. All data is processed securely 
                using Supabase and our specialized OCR engine, ensuring your financial privacy while providing 
                actionable insights.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
