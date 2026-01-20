import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { getThresholds, updateThresholds, resetThresholds } from '../lib/api';
import { toast } from 'sonner';
import { Save, RotateCcw, Settings, Database } from 'lucide-react';

export function ConfigurationPage() {
  const [thresholds, setThresholds] = useState({
    temperature: { min: 0, max: 60 },
    moisture: { min: 1, max: 100 }
  });
  const [loading, setLoading] = useState(true);

  // Fetch thresholds on component mount
  useEffect(() => {
    fetchThresholds();
  }, []);

  const fetchThresholds = async () => {
    try {
      setLoading(true);
      const data = await getThresholds();
      setThresholds({
        temperature: { min: data.temperature_min, max: data.temperature_max },
        moisture: { min: data.soil_moisture_min, max: data.soil_moisture_max }
      });
    } catch (error) {
      toast.error('Failed to load thresholds');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveThresholds = async () => {
    try {
      await updateThresholds({
        temperature_min: thresholds.temperature.min,
        temperature_max: thresholds.temperature.max,
        soil_moisture_min: thresholds.moisture.min,
        soil_moisture_max: thresholds.moisture.max
      });
      toast.success('Configuration saved successfully');
    } catch (error) {
      toast.error('Failed to save configuration');
      console.error(error);
    }
  };

  const handleResetThresholds = async () => {
    try {
      await resetThresholds();
      await fetchThresholds(); // Refresh data
      toast.info('Thresholds reset to default values');
    } catch (error) {
      toast.error('Failed to reset thresholds');
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[20px] text-[#111827]">System Configuration</h2>
        <p className="text-[16px] text-[#374151]">Manage thresholds and system preferences</p>
      </div>

      <Tabs defaultValue="thresholds" className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-xl bg-transparent">
          <TabsTrigger
            value="thresholds"
            className="rounded-lg gap-2 data-[state=active]:bg-[#B9EEC9] data-[state=active]:text-[#065F46] hover:bg-[#DFF7E8] transition"
          >
            <Settings size={16} />
            Thresholds
          </TabsTrigger>

          <TabsTrigger
            value="system"
            className="rounded-lg gap-2 data-[state=active]:bg-[#B9EEC9] data-[state=active]:text-[#065F46] hover:bg-[#DFF7E8] transition"
          >
            <Database size={16} />
            System
          </TabsTrigger>
        </TabsList>





        {/* Thresholds Tab */}
        <TabsContent value="thresholds" className="mt-6 space-y-6">
          <Card className="p-6 rounded-2xl bg-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-[#111827] mb-1">Critical Thresholds</h3>
                <p className="text-sm text-[#6B7280]">
                  Define acceptable ranges for soil and environmental parameters
                </p>
              </div>
              <Button
                variant="outline"
                className="rounded-xl gap-2"
                onClick={handleResetThresholds}
              >
                <RotateCcw size={16} />
                Reset to Default
              </Button>
            </div>

            <div className="space-y-6">
              {/* Moisture */}
              <div className="p-5 bg-[#F9FAFB] rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-[#16A34A] rounded-lg flex items-center justify-center text-white">
                    💧
                  </div>
                  <div>
                    <h4 className="text-[#111827]">Soil Moisture</h4>
                    <p className="text-xs text-[#6B7280]">Optimal range for pineapple growth</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="moistureMin">Minimum (%)</Label>
                    <Input
                      id="moistureMin"
                      type="number"
                      value={thresholds.moisture.min}
                      onChange={(e) =>
                        setThresholds({
                          ...thresholds,
                          moisture: { ...thresholds.moisture, min: Number(e.target.value) }
                        })
                      }
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="moistureMax">Maximum (%)</Label>
                    <Input
                      id="moistureMax"
                      type="number"
                      value={thresholds.moisture.max}
                      onChange={(e) =>
                        setThresholds({
                          ...thresholds,
                          moisture: { ...thresholds.moisture, max: Number(e.target.value) }
                        })
                      }
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Temperature */}
              <div className="p-5 bg-[#F9FAFB] rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-[#DC2626] rounded-lg flex items-center justify-center text-white">
                    🌡️
                  </div>
                  <div>
                    <h4 className="text-[#111827]">Temperature</h4>
                    <p className="text-xs text-[#6B7280]">Optimal temperature range</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tempMin">Minimum (°C)</Label>
                    <Input
                      id="tempMin"
                      type="number"
                      value={thresholds.temperature.min}
                      onChange={(e) =>
                        setThresholds({
                          ...thresholds,
                          temperature: { ...thresholds.temperature, min: Number(e.target.value) }
                        })
                      }
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tempMax">Maximum (°C)</Label>
                    <Input
                      id="tempMax"
                      type="number"
                      value={thresholds.temperature.max}
                      onChange={(e) =>
                        setThresholds({
                          ...thresholds,
                          temperature: { ...thresholds.temperature, max: Number(e.target.value) }
                        })
                      }
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                className="flex-1 bg-[#16A34A] hover:bg-[#16A34A] rounded-xl gap-2"
                onClick={handleSaveThresholds}
              >
                <Save size={16} />
                Save Thresholds
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="mt-6 space-y-6">
          <Card className="p-6 rounded-2xl bg-white">
            <h3 className="text-[#111827] mb-1">System Information</h3>
            <p className="text-sm text-[#6B7280] mb-6">Application and data management</p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-xl">
                <div>
                  <p className="text-sm text-[#111827]">Application Version</p>
                  <p className="text-xs text-[#6B7280]">PineTrack AgroPlanner</p>
                </div>
                <span className="text-sm text-[#6B7280]">v2.1.0</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-xl">
                <div>
                  <p className="text-sm text-[#111827]">Last Backup</p>
                  <p className="text-xs text-[#6B7280]">Automatic daily backups</p>
                </div>
                <span className="text-sm text-[#6B7280]">Nov 5, 2025 02:00 AM</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-xl">
                <div>
                  <p className="text-sm text-[#111827]">Data Storage</p>
                  <p className="text-xs text-[#6B7280]">Local and cloud sync</p>
                </div>
                <span className="text-sm text-[#6B7280]">2.4 GB / 10 GB</span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => toast.info('Backup initiated')}>
                Backup Data
              </Button>
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => toast.info('Export initiated')}>
                Export Reports
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}