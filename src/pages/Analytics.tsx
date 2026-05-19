import React from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { supabase } from '@/db/supabase';
import { Activity, Users, FileText, CheckCircle, AlertCircle, Eye, Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { trackEvent } from '@/lib/analytics';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AnalyticsStat {
  event_type: string;
  event_name: string;
  total_count: number;
}

const ANALYTICS_PASSWORD = 'MemeApp!26!Geslo';

export default function Analytics() {
  const [stats, setStats] = React.useState<AnalyticsStat[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAuthorized, setIsAuthorized] = React.useState(false);
  const [passwordInput, setPasswordInput] = React.useState('');

  React.useEffect(() => {
    trackEvent('Analytics Page', 'page_view');
    // Check session storage for existing authorization
    if (sessionStorage.getItem('analytics_authorized') === 'true') {
      setIsAuthorized(true);
      fetchStats();
    } else {
      setLoading(false);
    }
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ANALYTICS_PASSWORD) {
      setIsAuthorized(true);
      sessionStorage.setItem('analytics_authorized', 'true');
      fetchStats();
      toast.success('Authorized successfully');
    } else {
      toast.error('Incorrect password');
      setPasswordInput('');
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('analytics_summary')
        .select('*');

      if (error) throw error;
      setStats(data || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalEvents = stats.reduce((sum, s) => sum + Number(s.total_count), 0);
  const pageViews = stats.filter(s => s.event_type === 'page_view').reduce((sum, s) => sum + Number(s.total_count), 0);
  const uploads = stats.filter(s => s.event_type === 'upload').reduce((sum, s) => sum + Number(s.total_count), 0);
  const ocrSuccess = stats.filter(s => s.event_name === 'OCR Success').reduce((sum, s) => sum + Number(s.total_count), 0);
  const ocrFailed = stats.filter(s => s.event_name === 'OCR Failed').reduce((sum, s) => sum + Number(s.total_count), 0);
  const ocrRate = (ocrSuccess + ocrFailed) > 0 ? (ocrSuccess / (ocrSuccess + ocrFailed)) * 100 : 0;

  const typeData = Array.from(new Set(stats.map(s => s.event_type))).map(type => ({
    name: type.replace('_', ' ').toUpperCase(),
    value: stats.filter(s => s.event_type === type).reduce((sum, s) => sum + Number(s.total_count), 0)
  })).sort((a, b) => b.value - a.value);

  const topEvents = [...stats]
    .sort((a, b) => b.total_count - a.total_count)
    .slice(0, 10);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (loading && isAuthorized) {
    return (
      <AppLayout>
        <div className="p-4 md:p-8 space-y-8">
          <Skeleton className="h-10 w-64 bg-muted" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 bg-muted" />)}
          </div>
          <Skeleton className="h-96 w-full bg-muted" />
        </div>
      </AppLayout>
    );
  }

  if (!isAuthorized) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <Card className="w-full max-w-md bg-card border-border shadow-none">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl font-montserrat">Analytics Locked</CardTitle>
              <CardDescription>
                Please enter the administrator password to view application usage data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Enter password..."
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="text-center"
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full">
                  Access Analytics
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-montserrat tracking-tight text-foreground">App Usage Analytics</h1>
          <p className="text-muted-foreground">
            Live usage metrics and performance tracking for the Smart Expense Coach application.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border shadow-none">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                <h3 className="text-2xl font-bold">{totalEvents}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border shadow-none">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-500">
                <Eye className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Page Views</p>
                <h3 className="text-2xl font-bold">{pageViews}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border shadow-none">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Receipts Uploaded</p>
                <h3 className="text-2xl font-bold">{uploads}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border shadow-none">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">OCR Success Rate</p>
                <h3 className="text-2xl font-bold">{ocrRate.toFixed(1)}%</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Event Types Chart */}
          <Card className="bg-card border-border shadow-none">
            <CardHeader>
              <CardTitle className="text-lg font-montserrat">Interactions by Category</CardTitle>
              <CardDescription>Distribution of user actions by event type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Events Chart */}
          <Card className="bg-card border-border shadow-none">
            <CardHeader>
              <CardTitle className="text-lg font-montserrat">Most Frequent Actions</CardTitle>
              <CardDescription>Top 10 most common user interactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topEvents} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="event_name" 
                      type="category" 
                      width={120} 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="total_count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* OCR Performance */}
        <Card className="bg-card border-border shadow-none">
          <CardHeader>
            <CardTitle className="text-lg font-montserrat">OCR Performance Monitor</CardTitle>
            <CardDescription>Detailed breakdown of OCR processing results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /> Successes</span>
                  <span className="font-bold">{ocrSuccess}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-rose-500" /> Failures</span>
                  <span className="font-bold">{ocrFailed}</span>
                </div>
                <div className="pt-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Reliability Score</span>
                    <span>{ocrRate.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-1000" 
                      style={{ width: `${ocrRate}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="bg-accent/30 p-4 rounded-lg flex flex-col justify-center">
                <h4 className="text-sm font-semibold mb-2">Technical Insight</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The OCR success rate is calculated based on successful text extraction vs processing errors. 
                  A rate above 85% is considered healthy for high-density documents like receipts.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
