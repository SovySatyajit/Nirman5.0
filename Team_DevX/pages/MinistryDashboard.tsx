import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Download,
  Filter,
  Menu,
  MapPin,
  Layers,
  BarChart3,
} from 'lucide-react';
import Header from '@/components/Header';
import MinistryMap, {
  MinistryMapFilters,
  Correlation,
} from '@/components/maps/MinistryMap';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { MultiSelect } from '@/components/ui/multi-select';
import { Input } from '@/components/ui/input';
import { problem_category } from '@/integrations/supabase/types';
import { DateRange } from 'react-day-picker';
import { useDebounce } from 'use-debounce';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
} from '@/components/ui/sheet';

const categoryOptions = Object.values(problem_category).map((c) => ({
  value: c as string,
  label:
    (c as string).charAt(0).toUpperCase() + (c as string).slice(1),
}));

const MinistryDashboard = () => {
  const [filters, setFilters] = useState<MinistryMapFilters>({});
  const [mapData, setMapData] = useState<Correlation[]>([]);
  const [date, setDate] = useState<DateRange | undefined>();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState('');
  const [debouncedCity] = useDebounce(cityInput, 500);

  const handleFilterChange = (
    filterName: keyof MinistryMapFilters,
    value: any
  ) => {
    const newFilters = { ...filters };
    if (
      value === undefined ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    ) {
      delete newFilters[filterName];
    } else {
      newFilters[filterName] = value;
    }
    setFilters(newFilters);
  };

  useEffect(() => {
    handleFilterChange(
      'dateRange',
      date ? { from: date.from, to: date.to } : undefined
    );
  }, [date]);

  useEffect(() => {
    handleFilterChange(
      'categories',
      selectedCategories.length > 0 ? selectedCategories : undefined
    );
  }, [selectedCategories]);

  useEffect(() => {
    handleFilterChange('city', debouncedCity);
  }, [debouncedCity]);

  const handleExport = () => {
    if (mapData.length === 0) return;
    const headers = Object.keys(mapData[0]).join(',');
    const rows = mapData
      .map((row) => Object.values(row).join(','))
      .join('\n');
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', 'correlation_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const topCorrelation =
    mapData.length > 0
      ? [...mapData].sort(
          (a, b) => b.correlation_score - a.correlation_score
        )[0]
      : null;

  const avgCorrelation =
    mapData.length > 0
      ? mapData.reduce((acc, c) => acc + c.correlation_score, 0) /
        mapData.length
      : 0;

  const fadeIn = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  const FiltersPanel = (
    <aside className="w-full md:w-80 bg-gradient-to-b from-card/80 to-background backdrop-blur-xl border-r border-border/40 p-6 space-y-6">
      <h2 className="text-xl font-semibold flex items-center gap-2 text-primary">
        <Filter className="h-5 w-5" /> Filters
      </h2>

      <Card className="bg-card/70 backdrop-blur-md border-border/40">
        <CardHeader>
          <CardTitle className="text-base font-medium">Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <DateRangePicker date={date} onDateChange={setDate} />
        </CardContent>
      </Card>

      <Card className="bg-card/70 backdrop-blur-md border-border/40">
        <CardHeader>
          <CardTitle className="text-base font-medium">Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <MultiSelect
            options={categoryOptions}
            selected={selectedCategories}
            onChange={setSelectedCategories}
            placeholder="Select categories..."
          />
        </CardContent>
      </Card>

      <Card className="bg-card/70 backdrop-blur-md border-border/40">
        <CardHeader>
          <CardTitle className="text-base font-medium">City</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Filter by city..."
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
          />
        </CardContent>
      </Card>
    </aside>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-muted/10 to-background">
      <Header
        left={
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80">
              {FiltersPanel}
            </SheetContent>
          </Sheet>
        }
        right={
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">
              Ministry Official
            </p>
            <p className="text-xs text-muted-foreground">Admin Access</p>
          </div>
        }
      />

      <div className="flex flex-col md:flex-row flex-grow overflow-hidden">
        <div className="hidden md:block">{FiltersPanel}</div>

        {/* Main Section */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          {/* Stats Section */}
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-gradient-to-r from-card/40 via-background to-card/40 border-b border-border/20 backdrop-blur-sm">
            {[
              {
                title: 'Top Correlation Pair',
                value: topCorrelation
                  ? `${topCorrelation.category_a} & ${topCorrelation.category_b}`
                  : 'N/A',
                subtitle: topCorrelation
                  ? `in ${topCorrelation.city || 'N/A'}`
                  : '',
                icon: <Layers className="h-5 w-5 text-primary" />,
              },
              {
                title: 'Highest Score',
                value: topCorrelation
                  ? topCorrelation.correlation_score.toFixed(2)
                  : 'N/A',
                subtitle: 'Peak data correlation',
                icon: <BarChart3 className="h-5 w-5 text-primary" />,
              },
              {
                title: 'Average Correlation',
                value: avgCorrelation.toFixed(2),
                subtitle: 'Across all categories',
                icon: <MapPin className="h-5 w-5 text-primary" />,
              },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="group bg-card/70 border border-border/40 backdrop-blur-lg hover:shadow-lg transition-all duration-300 rounded-2xl">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      {stat.icon} {stat.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold text-foreground group-hover:text-primary transition-colors">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.subtitle}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Map Section */}
          <div className="relative flex-grow p-6">
            <div className="absolute top-6 right-6 z-10">
              <Button
                onClick={handleExport}
                disabled={mapData.length === 0}
                className="shadow-lg bg-gradient-to-r from-primary to-primary/80 text-white hover:from-primary/90 hover:to-primary transition-all"
              >
                <Download className="h-4 w-4 mr-2" /> Export Data
              </Button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-border/30 bg-card/50 backdrop-blur-lg shadow-md h-full">
              <MinistryMap filters={filters} onDataLoad={setMapData} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MinistryDashboard;
