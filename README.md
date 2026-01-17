# 🌱 PineTrack  
### An AI-Driven Adaptive Scheduling System for Pineapple Plantation Operations  
*Final Year Project (FYP)*

PineTrack is a smart agriculture management platform designed to help pineapple plantation managers plan, monitor, and optimise their daily operations. It automates task scheduling, adapts to real-time conditions, and leverages AI to support data-driven decision-making.

---

## 🚀 Features

### **AgroPlanner Module**
- Automated daily task scheduling  
- Smart rescheduling based on weather, plot readiness, and worker availability  
- Real-time task status tracking  
- Plot management, worker assignment, and operation overview dashboards  

### **CropSense Module**
*(Future extension)*  
- Monitoring of environmental & soil conditions  
- Visualization of farm data  
- AI insights for fertigation and crop health  

---

## 🛠 Technology Stack

### **Frontend**
- React + TypeScript  
- Vite  
- Tailwind CSS  
- Radix UI / shadcn/ui components  
- Recharts for data visualization  

### **Backend**
- FastAPI (Python)  
- REST API architecture  
- Integration with ML models (Decision Tree, Random Forest)

### **Database**
- PostgreSQL (Neon or local Postgres)  
- SQLAlchemy / SQLModel ORM  

### **Machine Learning**
- scikit-learn  
- joblib  
- pandas, numpy  

---

## 📁 Project Structure

```
PineTrack/
│── frontend/ # React frontend
│ └── src/
│ ├── components/
│ ├── pages/
│ ├── api/
│ ├── styles/
│ └── lib/
│
│── backend/ # FastAPI backend (to be added)
│ ├── app/
│ └── ml/
│
└── README.md
```


---

## 🧑‍💻 Getting Started

### **Frontend**
```bash
cd frontend
npm install
npm run dev
```

### **Backend** 
```bash 
cd backend
uvicorn app.main:app --reload
```


