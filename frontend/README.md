# 🌿 PineTrack: AI-Driven Adaptive Scheduling for Pineapple Plantations

An intelligent web-based management and decision-support system for pineapple farm operations, combining IoT sensor data with AI-driven analysis to automate daily operational planning.

## 🎯 Overview

PineTrack (AgroPlanner Module) digitalizes and automates daily operational planning for pineapple plantations. It replaces manual whiteboard scheduling with an intelligent platform that:

- Monitors soil and weather conditions in real-time
- Automatically generates and updates work schedules
- Makes data-driven decisions on task execution (Proceed/Pending/Stop)
- Efficiently allocates resources and workers across plots

## ✨ Core Features

### 📊 Dashboard & Monitoring
- Real-time farm overview with interactive plot status indicators
- Weather forecasting and current conditions
- Critical action alerts and notifications
- Upcoming task summaries
- Farm statistics and KPIs

### 🗺️ Farm Map
- Interactive visual map of all plots
- Color-coded status indicators (Green/Yellow/Red)
- Quick access to plot details
- Grid-based layout showing plot locations

### 📋 Plot Management
- Comprehensive plot registration and tracking
- Automated 14-month schedule generation upon planting date entry
- Real-time health scoring
- Growth stage monitoring
- Detailed plot information and history

### 📅 Smart Scheduling
- Monthly calendar view of all farm tasks
- Color-coded task statuses
- Filter by plot, task type, or status
- Drag-and-drop rescheduling capability
- Multi-plot task coordination

### 🔄 AI-Powered Reschedule Center
- Automated reschedule proposals based on:
  - Weather forecasts
  - Soil conditions (moisture, pH, nutrients)
  - Temperature trends
- Sequential search algorithm for optimal rescheduling
- Manager approval workflow
- Detailed reasoning for each proposal

### 📈 Analytics & Insights (CropSense Integration)
- 30-day historical data visualization
- 7-day forecast predictions
- Multi-parameter tracking:
  - Soil moisture
  - pH levels
  - Nitrogen content
  - Temperature
  - Rainfall
- Trend analysis and alerts
- AI-generated recommendations

### 👷 Worker Management
- Worker profiles and contact information
- Task assignment tracking
- Performance metrics
- Completion rate monitoring
- Role-based organization

### ⚙️ Configuration
- Customizable threshold settings for:
  - Soil moisture (40-70%)
  - pH levels (5.5-6.5)
  - Nitrogen content (120-180 mg/kg)
  - Temperature (24-32°C)
- Notification preferences (Email, SMS, Push)
- System preferences and data management

### 📊 Reports & History
- Task completion history
- Harvest summaries with yield data
- Reschedule logs
- Export functionality (CSV/PDF)
- Performance analytics

## 🎨 Design System

### Color Palette
- **Primary**: Pine Green (#15803D)
- **Secondary**: Fresh Leaf (#16A34A)
- **Accent**: Soft Sky Blue (#2563EB)
- **Status Colors**:
  - Proceed: Green (#16A34A)
  - Pending: Amber (#CA8A04)
  - Stop: Red (#DC2626)

### Typography
- **Headings**: Poppins (Bold, Semibold)
- **Body**: Nunito (Regular)
- Modern, rounded, clean aesthetic

### Layout
- Light mode with white to mint gradient background
- Rounded corners (10-16px)
- Soft shadows for depth
- Clean spacing using 4px base grid
- Responsive design for desktop and tablet

## 🏗️ Architecture

### Component Structure
```
/components
  ├── AppLayout.tsx          # Main layout with sidebar
  ├── StatusBadge.tsx        # Reusable status indicator
  ├── PlotCard.tsx          # Plot information card
  ├── WeatherCard.tsx       # Weather display component
  └── ui/                   # Shadcn UI components

/pages
  ├── LoginPage.tsx
  ├── DashboardPage.tsx
  ├── FarmMapPage.tsx
  ├── PlotManagementPage.tsx
  ├── PlotDetailsPage.tsx
  ├── SchedulePage.tsx
  ├── RescheduleCenterPage.tsx
  ├── AnalyticsPage.tsx
  ├── WorkersPage.tsx
  ├── ConfigurationPage.tsx
  └── ReportsPage.tsx

/lib
  └── mockData.ts           # Sample data for demonstration
```

### Technology Stack
- **React** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Shadcn UI** - Component library
- **Recharts** - Data visualization
- **Lucide React** - Icons
- **Sonner** - Toast notifications

## 🚀 Key Features Implementation

### Accessibility (WCAG AA)
- Semantic HTML throughout
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus indicators
- Screen reader friendly
- Sufficient color contrast ratios (4.5:1 minimum)
- Descriptive alt text and labels

### Responsive Design
- Flexbox and Grid layouts (no absolute positioning)
- Mobile-first approach
- Breakpoints: Mobile (0-599px), Tablet (600-1023px), Desktop (1024px+)
- Adaptive components for different screen sizes

### Code Quality
- Reusable component architecture
- Clean separation of concerns
- Type-safe with TypeScript
- Consistent naming conventions
- Well-documented code
- Maintainable structure

## 📱 User Flows

### Farm Manager Journey
1. Login → Dashboard overview
2. Configure thresholds and preferences
3. Register plots with planting dates
4. Monitor daily AI-generated task statuses
5. Review and approve reschedule proposals
6. Access detailed plot information and analytics
7. Manage workers and assignments
8. Generate and export reports

### Worker Journey
1. Login to view assigned tasks
2. Check task status (Proceed/Pending/Stop)
3. Perform field operations
4. Report observations and issues
5. Mark tasks as completed

## 🔔 AI Decision Logic

The system automatically:
1. Collects IoT sensor data (moisture, pH, nitrogen, temperature)
2. Validates data quality
3. Generates 1-7 day forecasts
4. Compares forecasts against configured thresholds
5. Assigns task statuses:
   - **Proceed**: All conditions optimal
   - **Pending**: Conditions suboptimal but not critical
   - **Stop**: Critical threshold violations
6. Proposes alternative dates using sequential search
7. Notifies manager for approval

## 📊 Sample Use Cases

### UC 11.0: Automated Schedule Generation
- Enter planting date → System generates 14-month routine schedule
- Includes: fertilization, weeding, hormone treatment, pest control, irrigation

### UC 13.0: AI Status Logic
- Daily automated checks against CropSense data
- Real-time status updates
- Threshold violation alerts

### UC 14.0: Reschedule Proposal
- AI identifies unsafe conditions
- Calculates optimal alternative date
- Provides detailed reasoning
- Awaits manager approval

## 🎯 Benefits

1. **Data-Driven Decisions**: Eliminate guesswork with AI-powered recommendations
2. **Reduced Crop Loss**: Prevent operations during unsuitable conditions
3. **Optimized Resource Allocation**: Efficient worker and task management
4. **Improved Productivity**: 14-month automated planning reduces manual effort
5. **Better Traceability**: Complete historical records and analytics
6. **Scalability**: Easily manage multiple plots and expansion

## 🔐 Demo Credentials

- **Email**: Any email address
- **Password**: Any password
- The demo accepts any credentials for testing purposes

## 🌟 Future Enhancements

- Real-time IoT sensor integration
- Mobile app for field workers
- Machine learning yield prediction
- Multi-language support
- Advanced reporting and business intelligence
- Integration with market pricing systems

---

**Built with ❤️ for modern agricultural management**

© 2025 PineTrack. All rights reserved.
