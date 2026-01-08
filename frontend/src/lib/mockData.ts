// Mock data for PineTrack application

export interface Plot {
  id: string;
  name: string;
  area: number;
  cropType: string;
  plantingDate: string;
  growthStage: string;
  status: 'Proceed' | 'Pending' | 'Stop';
  healthScore: number;
  location: { x: number; y: number };
}

export interface Task {
  id: string;
  plotId: string;
  plotName: string;
  title: string;
  type: string;
  date: string;
  status: 'Proceed' | 'Pending' | 'Stop';
  assignedWorker: string;
  description: string;
  originalDate?: string;
  proposedDate?: string;
  reason?: string;
}

export interface Worker {
  id: string;
  name: string;
  role: string;
  assignedPlots: string[];
  tasksCompleted: number;
  contact: string;
  avatarUrl?: string;
}

export interface SensorData {
  date: string;
  moisture: number;
  ph: number;
  nitrogen: number;
  temperature: number;
  rainfall: number;
}

export interface Observation {
  id: string;
  plotId: string;
  date: string;
  author: string;
  note: string;
}

// Mock plots
export const mockPlots: Plot[] = [
  {
    id: 'P001',
    name: 'Plot A-1',
    area: 2.5,
    cropType: 'MD2 Pineapple',
    plantingDate: '2024-08-15',
    growthStage: 'Vegetative',
    status: 'Proceed',
    healthScore: 92,
    location: { x: 1, y: 1 }
  },
  {
    id: 'P002',
    name: 'Plot A-2',
    area: 3.0,
    cropType: 'MD2 Pineapple',
    plantingDate: '2024-07-10',
    growthStage: 'Flowering',
    status: 'Pending',
    healthScore: 78,
    location: { x: 2, y: 1 }
  },
  {
    id: 'P003',
    name: 'Plot B-1',
    area: 2.8,
    cropType: 'Queen Pineapple',
    plantingDate: '2024-09-01',
    growthStage: 'Early Growth',
    status: 'Stop',
    healthScore: 65,
    location: { x: 1, y: 2 }
  },
  {
    id: 'P004',
    name: 'Plot B-2',
    area: 3.2,
    cropType: 'MD2 Pineapple',
    plantingDate: '2024-06-20',
    growthStage: 'Fruiting',
    status: 'Proceed',
    healthScore: 88,
    location: { x: 2, y: 2 }
  },
  {
    id: 'P005',
    name: 'Plot C-1',
    area: 2.0,
    cropType: 'Smooth Cayenne',
    plantingDate: '2024-10-05',
    growthStage: 'Establishment',
    status: 'Proceed',
    healthScore: 95,
    location: { x: 1, y: 3 }
  },
  {
    id: 'P006',
    name: 'Plot C-2',
    area: 2.7,
    cropType: 'MD2 Pineapple',
    plantingDate: '2024-05-15',
    growthStage: 'Mature',
    status: 'Pending',
    healthScore: 82,
    location: { x: 2, y: 3 }
  }
];

// Mock tasks - comprehensive pineapple plantation tasks across 14-month cycle
export const mockTasks: Task[] = [
  // November 2025 tasks
  {
    id: 'T001',
    plotId: 'P001',
    plotName: 'Plot A-1',
    title: 'Fertilizer Application',
    type: 'fertilization',
    date: '2025-11-06',
    status: 'Proceed',
    assignedWorker: 'Juan Santos',
    description: 'Apply nitrogen-rich fertilizer, 50kg per hectare'
  },
  {
    id: 'T002',
    plotId: 'P002',
    plotName: 'Plot A-2',
    title: 'Weeding',
    type: 'weeding',
    date: '2025-11-07',
    status: 'Pending',
    assignedWorker: 'Maria Lopez',
    description: 'Manual weeding around plant bases',
    originalDate: '2025-11-05',
    proposedDate: '2025-11-09',
    reason: 'Heavy rainfall forecasted - soil too wet for weeding'
  },
  {
    id: 'T003',
    plotId: 'P003',
    plotName: 'Plot B-1',
    title: 'pH Adjustment',
    type: 'soil-treatment',
    date: '2025-11-05',
    status: 'Stop',
    assignedWorker: 'Carlos Rivera',
    description: 'Apply lime to increase soil pH',
    originalDate: '2025-11-05',
    proposedDate: '2025-11-08',
    reason: 'Soil pH critically low (4.2) - wait for current nutrients to stabilize'
  },
  {
    id: 'T004',
    plotId: 'P001',
    plotName: 'Plot A-1',
    title: 'Pest Inspection',
    type: 'monitoring',
    date: '2025-11-08',
    status: 'Proceed',
    assignedWorker: 'Juan Santos',
    description: 'Check for mealybugs and other pests'
  },
  {
    id: 'T005',
    plotId: 'P004',
    plotName: 'Plot B-2',
    title: 'Hormone Treatment',
    type: 'hormone',
    date: '2025-11-10',
    status: 'Proceed',
    assignedWorker: 'Ana Torres',
    description: 'Apply ethylene for uniform flowering'
  },
  {
    id: 'T006',
    plotId: 'P005',
    plotName: 'Plot C-1',
    title: 'Irrigation Check',
    type: 'irrigation',
    date: '2025-11-06',
    status: 'Proceed',
    assignedWorker: 'Pedro Garcia',
    description: 'Verify drip irrigation system functionality'
  },
  {
    id: 'T007',
    plotId: 'P006',
    plotName: 'Plot C-2',
    title: 'Pre-Harvest Inspection',
    type: 'monitoring',
    date: '2025-11-12',
    status: 'Pending',
    assignedWorker: 'Maria Lopez',
    description: 'Assess fruit maturity and estimate harvest date',
    originalDate: '2025-11-12',
    proposedDate: '2025-11-14',
    reason: 'Moisture levels elevated - allow fruit to firm up'
  },
  {
    id: 'T008',
    plotId: 'P002',
    plotName: 'Plot A-2',
    title: 'Mulching',
    type: 'soil-treatment',
    date: '2025-11-14',
    status: 'Proceed',
    assignedWorker: 'Carlos Rivera',
    description: 'Apply organic mulch to retain moisture'
  },
  {
    id: 'T009',
    plotId: 'P003',
    plotName: 'Plot B-1',
    title: 'Pesticide Spray',
    type: 'pest-control',
    date: '2025-11-18',
    status: 'Proceed',
    assignedWorker: 'Ana Torres',
    description: 'Apply organic pesticide for mealybug control'
  },
  {
    id: 'T010',
    plotId: 'P005',
    plotName: 'Plot C-1',
    title: 'Soil Testing',
    type: 'monitoring',
    date: '2025-11-20',
    status: 'Proceed',
    assignedWorker: 'Carlos Rivera',
    description: 'Collect soil samples for nutrient analysis'
  },
  {
    id: 'T011',
    plotId: 'P001',
    plotName: 'Plot A-1',
    title: 'Drip Line Maintenance',
    type: 'irrigation',
    date: '2025-11-22',
    status: 'Proceed',
    assignedWorker: 'Pedro Garcia',
    description: 'Check and clean drip irrigation emitters'
  },
  {
    id: 'T012',
    plotId: 'P004',
    plotName: 'Plot B-2',
    title: 'Fruit Bagging',
    type: 'fruit-protection',
    date: '2025-11-25',
    status: 'Proceed',
    assignedWorker: 'Maria Lopez',
    description: 'Install protective bags on developing fruits'
  },
  
  // December 2025 tasks
  {
    id: 'T013',
    plotId: 'P001',
    plotName: 'Plot A-1',
    title: 'Fertilizer Application',
    type: 'fertilization',
    date: '2025-12-03',
    status: 'Proceed',
    assignedWorker: 'Juan Santos',
    description: 'Apply potassium-rich fertilizer for fruit development'
  },
  {
    id: 'T014',
    plotId: 'P003',
    plotName: 'Plot B-1',
    title: 'Weeding',
    type: 'weeding',
    date: '2025-12-05',
    status: 'Proceed',
    assignedWorker: 'Maria Lopez',
    description: 'Remove weeds to prevent competition'
  },
  {
    id: 'T015',
    plotId: 'P006',
    plotName: 'Plot C-2',
    title: 'Harvesting',
    type: 'harvesting',
    date: '2025-12-08',
    status: 'Proceed',
    assignedWorker: 'Juan Santos',
    description: 'Harvest mature pineapples, estimated 3 tons'
  },
  {
    id: 'T016',
    plotId: 'P002',
    plotName: 'Plot A-2',
    title: 'Hormone Spraying',
    type: 'hormone',
    date: '2025-12-10',
    status: 'Pending',
    assignedWorker: 'Ana Torres',
    description: 'Apply ethylene to induce flowering',
    reason: 'Temperature too high - wait for cooler conditions'
  },
  {
    id: 'T017',
    plotId: 'P005',
    plotName: 'Plot C-1',
    title: 'Disease Inspection',
    type: 'monitoring',
    date: '2025-12-12',
    status: 'Proceed',
    assignedWorker: 'Carlos Rivera',
    description: 'Check for heart rot and other diseases'
  },
  {
    id: 'T018',
    plotId: 'P004',
    plotName: 'Plot B-2',
    title: 'Fruit Quality Check',
    type: 'monitoring',
    date: '2025-12-15',
    status: 'Proceed',
    assignedWorker: 'Maria Lopez',
    description: 'Assess fruit size and color development'
  },
  {
    id: 'T019',
    plotId: 'P001',
    plotName: 'Plot A-1',
    title: 'Irrigation Adjustment',
    type: 'irrigation',
    date: '2025-12-18',
    status: 'Proceed',
    assignedWorker: 'Pedro Garcia',
    description: 'Increase water frequency for dry season'
  },
  {
    id: 'T020',
    plotId: 'P003',
    plotName: 'Plot B-1',
    title: 'Fertilizer Application',
    type: 'fertilization',
    date: '2025-12-20',
    status: 'Proceed',
    assignedWorker: 'Juan Santos',
    description: 'Apply balanced NPK fertilizer'
  },
  {
    id: 'T021',
    plotId: 'P006',
    plotName: 'Plot C-2',
    title: 'Post-Harvest Cleanup',
    type: 'cleanup',
    date: '2025-12-22',
    status: 'Proceed',
    assignedWorker: 'Maria Lopez',
    description: 'Remove plant debris and prepare for replanting'
  },
  {
    id: 'T022',
    plotId: 'P002',
    plotName: 'Plot A-2',
    title: 'Pest Trap Installation',
    type: 'pest-control',
    date: '2025-12-28',
    status: 'Proceed',
    assignedWorker: 'Ana Torres',
    description: 'Install pheromone traps for pest monitoring'
  },
  
  // January 2026 tasks
  {
    id: 'T023',
    plotId: 'P005',
    plotName: 'Plot C-1',
    title: 'Fertilizer Application',
    type: 'fertilization',
    date: '2026-01-05',
    status: 'Proceed',
    assignedWorker: 'Juan Santos',
    description: 'Apply nitrogen fertilizer for vegetative growth'
  },
  {
    id: 'T024',
    plotId: 'P001',
    plotName: 'Plot A-1',
    title: 'Weeding',
    type: 'weeding',
    date: '2026-01-08',
    status: 'Proceed',
    assignedWorker: 'Maria Lopez',
    description: 'Manual weeding and ground cover maintenance'
  },
  {
    id: 'T025',
    plotId: 'P004',
    plotName: 'Plot B-2',
    title: 'Harvesting',
    type: 'harvesting',
    date: '2026-01-10',
    status: 'Proceed',
    assignedWorker: 'Juan Santos',
    description: 'Harvest mature fruits at optimal ripeness'
  },
  {
    id: 'T026',
    plotId: 'P003',
    plotName: 'Plot B-1',
    title: 'Hormone Treatment',
    type: 'hormone',
    date: '2026-01-12',
    status: 'Proceed',
    assignedWorker: 'Ana Torres',
    description: 'Apply calcium carbide for flower induction'
  },
  {
    id: 'T027',
    plotId: 'P002',
    plotName: 'Plot A-2',
    title: 'Soil Moisture Check',
    type: 'monitoring',
    date: '2026-01-15',
    status: 'Proceed',
    assignedWorker: 'Carlos Rivera',
    description: 'Monitor soil moisture with IoT sensors'
  },
  {
    id: 'T028',
    plotId: 'P006',
    plotName: 'Plot C-2',
    title: 'Land Preparation',
    type: 'land-prep',
    date: '2026-01-18',
    status: 'Proceed',
    assignedWorker: 'Pedro Garcia',
    description: 'Plow and prepare beds for new planting'
  },
  {
    id: 'T029',
    plotId: 'P005',
    plotName: 'Plot C-1',
    title: 'Pest Inspection',
    type: 'monitoring',
    date: '2026-01-20',
    status: 'Proceed',
    assignedWorker: 'Ana Torres',
    description: 'Check for nematodes and root pests'
  },
  {
    id: 'T030',
    plotId: 'P001',
    plotName: 'Plot A-1',
    title: 'Mulch Replenishment',
    type: 'soil-treatment',
    date: '2026-01-22',
    status: 'Proceed',
    assignedWorker: 'Carlos Rivera',
    description: 'Add fresh organic mulch layer'
  },
  {
    id: 'T031',
    plotId: 'P004',
    plotName: 'Plot B-2',
    title: 'Sucker Removal',
    type: 'pruning',
    date: '2026-01-25',
    status: 'Proceed',
    assignedWorker: 'Maria Lopez',
    description: 'Remove unwanted suckers for next crop cycle'
  },
  {
    id: 'T032',
    plotId: 'P003',
    plotName: 'Plot B-1',
    title: 'Irrigation System Check',
    type: 'irrigation',
    date: '2026-01-28',
    status: 'Proceed',
    assignedWorker: 'Pedro Garcia',
    description: 'Inspect and repair irrigation infrastructure'
  },
  
  // February 2026 tasks
  {
    id: 'T033',
    plotId: 'P002',
    plotName: 'Plot A-2',
    title: 'Flower Development Check',
    type: 'monitoring',
    date: '2026-02-03',
    status: 'Proceed',
    assignedWorker: 'Carlos Rivera',
    description: 'Monitor flower emergence after hormone treatment'
  },
  {
    id: 'T034',
    plotId: 'P006',
    plotName: 'Plot C-2',
    title: 'Planting',
    type: 'planting',
    date: '2026-02-05',
    status: 'Proceed',
    assignedWorker: 'Juan Santos',
    description: 'Plant new pineapple suckers, 30,000 plants'
  },
  {
    id: 'T035',
    plotId: 'P005',
    plotName: 'Plot C-1',
    title: 'Fertilizer Application',
    type: 'fertilization',
    date: '2026-02-08',
    status: 'Proceed',
    assignedWorker: 'Ana Torres',
    description: 'Apply micronutrient fertilizer'
  },
  {
    id: 'T036',
    plotId: 'P001',
    plotName: 'Plot A-1',
    title: 'Fungicide Treatment',
    type: 'pest-control',
    date: '2026-02-10',
    status: 'Pending',
    assignedWorker: 'Carlos Rivera',
    description: 'Preventive fungicide spray',
    reason: 'High humidity - wait for drier conditions'
  },
  {
    id: 'T037',
    plotId: 'P003',
    plotName: 'Plot B-1',
    title: 'Weeding',
    type: 'weeding',
    date: '2026-02-12',
    status: 'Proceed',
    assignedWorker: 'Maria Lopez',
    description: 'Remove invasive weeds and grasses'
  },
  {
    id: 'T038',
    plotId: 'P004',
    plotName: 'Plot B-2',
    title: 'Ratoon Crop Assessment',
    type: 'monitoring',
    date: '2026-02-15',
    status: 'Proceed',
    assignedWorker: 'Juan Santos',
    description: 'Evaluate sucker quality for ratoon crop'
  },
  {
    id: 'T039',
    plotId: 'P002',
    plotName: 'Plot A-2',
    title: 'Fruit Bagging',
    type: 'fruit-protection',
    date: '2026-02-18',
    status: 'Proceed',
    assignedWorker: 'Maria Lopez',
    description: 'Install protective bags on forming fruits'
  },
  {
    id: 'T040',
    plotId: 'P006',
    plotName: 'Plot C-2',
    title: 'Post-Planting Irrigation',
    type: 'irrigation',
    date: '2026-02-20',
    status: 'Proceed',
    assignedWorker: 'Pedro Garcia',
    description: 'Ensure adequate moisture for new plants'
  },
  {
    id: 'T041',
    plotId: 'P005',
    plotName: 'Plot C-1',
    title: 'Growth Monitoring',
    type: 'monitoring',
    date: '2026-02-22',
    status: 'Proceed',
    assignedWorker: 'Carlos Rivera',
    description: 'Measure plant height and leaf count'
  },
  {
    id: 'T042',
    plotId: 'P001',
    plotName: 'Plot A-1',
    title: 'pH Testing',
    type: 'soil-treatment',
    date: '2026-02-25',
    status: 'Proceed',
    assignedWorker: 'Carlos Rivera',
    description: 'Test and adjust soil pH levels'
  }
];

// Mock workers
export const mockWorkers: Worker[] = [
  {
    id: 'W001',
    name: 'Juan Santos',
    role: 'Field Supervisor',
    assignedPlots: ['P001', 'P002'],
    tasksCompleted: 124,
    contact: '+63 912 345 6789',
    avatarUrl: '',
    
  },
  {
    id: 'W002',
    name: 'Maria Lopez',
    role: 'Field Worker',
    assignedPlots: ['P002', 'P006'],
    tasksCompleted: 98,
    contact: '+63 923 456 7890',
    avatarUrl: '',
  },
  {
    id: 'W003',
    name: 'Carlos Rivera',
    role: 'Soil Specialist',
    assignedPlots: ['P003'],
    tasksCompleted: 76,
    contact: '+63 934 567 8901',
    avatarUrl: '',
  },
  {
    id: 'W004',
    name: 'Ana Torres',
    role: 'Field Worker',
    assignedPlots: ['P004', 'P005'],
    tasksCompleted: 112,
    contact: '+63 945 678 9012',
    avatarUrl: '',
  },
  {
    id: 'W005',
    name: 'Pedro Garcia',
    role: 'Irrigation Technician',
    assignedPlots: ['P005', 'P001'],
    tasksCompleted: 89,
    contact: '+63 956 789 0123',
    avatarUrl: '',
  }
];

// Mock sensor data
export const generateMockSensorData = (days: number = 20): SensorData[] => {
  const data: SensorData[] = [];
  const today = new Date('2025-11-05');
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      moisture: 45 + Math.random() * 20 + Math.sin(i / 5) * 10,
      ph: 5.5 + Math.random() * 1.5,
      nitrogen: 120 + Math.random() * 60,
      temperature: 26 + Math.random() * 6,
      rainfall: Math.random() > 0.7 ? Math.random() * 30 : 0
    });
  }
  
  return data;
};

// Mock forecast data
export const generateMockForecastData = (days: number = 7): SensorData[] => {
  const data: SensorData[] = [];
  const today = new Date('2025-11-05');
  
  for (let i = 1; i <= days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      moisture: 50 + Math.random() * 15 + Math.sin(i / 10) * 5,
      ph: 5.8 + Math.random() * 1.0,
      nitrogen: 140 + Math.random() * 40,
      temperature: 27 + Math.random() * 5,
      rainfall: Math.random() > 0.6 ? Math.random() * 25 : 0
    });
  }
  
  return data;
};

// Mock observations
export const mockObservations: Observation[] = [
  {
    id: 'O001',
    plotId: 'P001',
    date: '2025-11-04',
    author: 'Juan Santos',
    note: 'Plants showing healthy growth. No pest activity detected.'
  },
  {
    id: 'O002',
    plotId: 'P002',
    date: '2025-11-03',
    author: 'Maria Lopez',
    note: 'Slight yellowing on lower leaves. May need nitrogen supplement.'
  },
  {
    id: 'O003',
    plotId: 'P003',
    date: '2025-11-04',
    author: 'Carlos Rivera',
    note: 'Soil pH testing shows acidic conditions. Lime treatment scheduled.'
  },
  {
    id: 'O004',
    plotId: 'P004',
    date: '2025-11-02',
    author: 'Ana Torres',
    note: 'Fruits developing well. Estimated 3 weeks until harvest.'
  },
  {
    id: 'O005',
    plotId: 'P005',
    date: '2025-11-01',
    author: 'Pedro Garcia',
    note: 'Irrigation system functioning optimally. Soil moisture stable.'
  }
];

// Weather data
export const currentWeather = {
  temperature: 29,
  condition: 'Partly Cloudy',
  humidity: 68,
  windSpeed: 12,
  icon: 'cloud-sun'
};

export const weatherForecast = [
  { day: 'Wed', temp: 29, icon: 'cloud-sun', condition: 'Partly Cloudy' },
  { day: 'Thu', temp: 30, icon: 'sun', condition: 'Sunny' },
  { day: 'Fri', temp: 28, icon: 'cloud-rain', condition: 'Rainy' },
  { day: 'Sat', temp: 27, icon: 'cloud-rain', condition: 'Rainy' },
  { day: 'Sun', temp: 28, icon: 'cloud', condition: 'Cloudy' },
  { day: 'Mon', temp: 29, icon: 'cloud-sun', condition: 'Partly Cloudy' },
  { day: 'Tue', temp: 30, icon: 'sun', condition: 'Sunny' },
  { day: 'Wed', temp: 31, icon: 'sun', condition: 'Sunny' },
  { day: 'Thu', temp: 29, icon: 'cloud-sun', condition: 'Partly Cloudy' },
  { day: 'Fri', temp: 28, icon: 'cloud', condition: 'Cloudy' }
];

// Threshold configurations
export const defaultThresholds = {
  moisture: { min: 40, max: 70, unit: '%' },
  ph: { min: 5.5, max: 6.5, unit: '' },
  nitrogen: { min: 120, max: 180, unit: 'mg/kg' },
  temperature: { min: 24, max: 32, unit: '°C' }
};