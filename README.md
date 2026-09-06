# AI Travel Planner Agent

> **Plan smarter. Travel better.**  
> An AI-powered travel planning web application built with IBM Granite (ibm/granite-4-h-small).

---

## Problem Statement

**Problem Statement No. 5 – Travel Planner Agent**

A Travel Planner Agent is an AI-powered assistant that helps users plan trips efficiently and intelligently. It suggests destinations, builds day-by-day itineraries, and recommends transportation and accommodation options. By understanding user preferences, budgets, and constraints, it generates personalized travel plans.

---

## Project Objective

Build an AI-powered travel planning web application where a user can enter their travel requirements and receive a complete, personalized travel plan generated using IBM Granite. The application is designed as a clear, working demonstration of an AI Travel Planner Agent suitable for a college project.

---

## Key Features

| Feature | Description |
|---|---|
| Trip Details Form | Starting location, destination, travelers, duration, dates, budget, currency, travel style |
| Travel Preferences | Interests (10 options), transportation, accommodation, dietary, special requirements |
| AI Plan Generation | Full IBM Granite-powered travel plan generation |
| Day-by-Day Itinerary | Morning / afternoon / evening activities with time allocation |
| Budget Breakdown | Estimated costs for transport, accommodation, food, activities, misc |
| Accommodation Guide | Recommendations based on budget and travel style |
| Transportation Guide | Practical options for getting around |
| Travel Tips | Destination-specific packing, customs, safety, and local tips |
| Dynamic Modification | Modify the existing itinerary with natural language requests |
| Quick-Modify Chips | One-click suggestions: "Make it cheaper", "More nature", "Family-friendly", etc. |
| Copy & Print | Copy plan to clipboard or print directly |
| Responsive Design | Works on desktop and mobile |

---

## Technology Used

| Layer | Technology |
|---|---|
| **AI Model** | IBM Granite (`ibm/granite-4-h-small`) via IBM Watson ML |
| **Backend** | Python 3.x + Flask 3.x |
| **Frontend** | Vanilla HTML5, CSS3, JavaScript (ES2020) |
| **Auth** | IBM IAM token exchange (API key → Bearer token) |
| **Config** | python-dotenv for environment variable management |
| **HTTP Client** | requests library |

---

## IBM Granite Integration

The application uses IBM Granite as its sole AI model via the IBM Watson Machine Learning text generation API.

**Flow:**
```
User Form Input
      ↓
Flask Backend (app.py)
      ↓
IBM IAM Token Exchange (API key → Bearer token)
      ↓
IBM Granite API (ibm/granite-4-h-small)
      ↓
Personalized Travel Plan
      ↓
Frontend Display
```

**API Endpoint used:**
```
POST https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29
```

The AI is given a detailed system prompt instructing it to act as an intelligent travel planner that creates realistic day-by-day itineraries, budget estimates, accommodation recommendations, transportation guides, and travel tips.

---

## IBM BOB Usage

This project was developed with the assistance of **IBM Bob**, IBM's AI software engineering assistant, which:
- Generated all application code (Python, HTML, CSS, JavaScript)
- Structured the Flask backend with IBM Granite integration
- Designed the responsive frontend interface
- Implemented secure API key handling via environment variables
- Built the itinerary rendering and modification workflow

---

## Environment Variable Setup

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
IBM_API_KEY=your_ibm_cloud_api_key_here
IBM_PROJECT_ID=your_watson_studio_project_id_here
IBM_MODEL_ID=ibm/granite-4-h-small
IBM_API_URL=https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29
```

> ⚠️ **Never commit `.env` to version control.** It is listed in `.gitignore`.

---

## Installation Instructions

### Prerequisites
- Python 3.9 or higher
- pip

### Steps

1. **Clone or download the project:**
   ```bash
   git clone <repo-url>
   cd IBM_Travel_Planner_Agent
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python -m venv venv

   # Windows
   venv\Scripts\activate

   # macOS / Linux
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your IBM credentials
   ```

---

## How to Run the Application

```bash
python app.py
```

Then open your browser and navigate to:
```
http://localhost:5000
```

---

## Project Structure

```
IBM_Travel_Planner_Agent/
│
├── app.py                  ← Flask backend + IBM Granite integration
├── requirements.txt        ← Python dependencies
├── .env                    ← Your credentials (not committed)
├── .env.example            ← Template for credentials
├── .gitignore
├── README.md
│
├── templates/
│   └── index.html          ← Main HTML page
│
└── static/
    ├── style.css           ← Responsive CSS stylesheet
    └── script.js           ← Frontend logic (no credentials)
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Serves the main application page |
| POST | `/api/generate-plan` | Generates a new travel plan via IBM Granite |
| POST | `/api/modify-plan` | Modifies an existing itinerary via IBM Granite |

### POST `/api/generate-plan`

**Request body (JSON):**
```json
{
  "from_location": "New York, USA",
  "destination": "Paris, France",
  "num_travelers": "2",
  "duration": "7 days",
  "travel_dates": "July 10 - July 17",
  "budget": "3000",
  "currency": "USD",
  "travel_style": "Moderate",
  "interests": ["History", "Food", "Culture"],
  "transportation": "Flights",
  "accommodation": "Mid-range Hotel",
  "dietary": "Vegetarian",
  "special_requirements": "",
  "other_preferences": "Prefer less touristy spots"
}
```

### POST `/api/modify-plan`

**Request body (JSON):**
```json
{
  "existing_plan": "<the full plan text from a previous response>",
  "modification": "Make this trip cheaper and add more outdoor activities"
}
```

---

## Example Input

- **From:** Mumbai, India
- **Destination:** Bangkok, Thailand
- **Travelers:** 2
- **Duration:** 5 days
- **Budget:** INR 80,000
- **Travel Style:** Moderate
- **Interests:** Food, Culture, Shopping
- **Accommodation:** Mid-range Hotel

---

## Example Generated Output (Summary)

The application generates a structured plan including:

```
TRIP OVERVIEW
Trip from Mumbai to Bangkok | 5 Days | 2 Travelers | INR 80,000 budget

DAY-BY-DAY ITINERARY

Day 1 – Arrival & Old Town Exploration
  Morning:   Arrive at Suvarnabhumi Airport, check into hotel in Silom area
  Afternoon: Visit Wat Pho (Grand Palace area), ~2 hours
  Evening:   Dinner at a local Thai restaurant on Khao San Road

Day 2 – Temples & Culture
  Morning:   Visit Wat Arun (Temple of Dawn), ~1.5 hours
  Afternoon: Explore Chinatown (Yaowarat Road), street food tour
  Evening:   Chao Phraya River dinner cruise

...

BUDGET BREAKDOWN (ESTIMATES)
  Flights (round trip):  INR 25,000 – 30,000 per person
  Accommodation:         INR 2,500 – 4,000/night (mid-range)
  Food:                  INR 800 – 1,200/day per person
  Activities:            INR 5,000 – 8,000 total
  Miscellaneous:         INR 3,000 – 5,000
  TOTAL ESTIMATE:        INR 70,000 – 85,000 for 2 people

TRAVEL TIPS
  - Best time to visit: November to February (cooler weather)
  - Dress modestly when visiting temples
  - Use BTS Skytrain and MRT for affordable city travel
  ...
```

> All figures are AI-generated estimates and not real-time data.

---

## Future Scope

| Feature | Description |
|---|---|
| Maps Integration | Google Maps / OpenStreetMap for interactive itinerary visualization |
| Weather API | Real-time weather forecasts for travel dates |
| Flight Search | Live flight search via Skyscanner / Amadeus API |
| Hotel Search | Live hotel availability via Booking.com / Hotels.com API |
| User Accounts | Save, share, and revisit generated itineraries |
| PDF Export | Download the full travel plan as a PDF |
| Multi-language | Generate itineraries in multiple languages |
| Voice Input | Speak your travel preferences instead of typing |
| Currency Converter | Live exchange rate for budget estimates |
| Collaborative Planning | Share and co-edit itineraries with travel companions |

---

## Important Notes

- **No real-time data:** All prices, availability, and schedules are AI-generated estimates only.
- **No bookings are made:** The application does not complete any reservations.
- **API key security:** The IBM API key is stored only in the `.env` file and handled exclusively by the Flask backend. It is never sent to or visible in the frontend.

---

## License

This project is created as a student prototype for educational demonstration purposes.
