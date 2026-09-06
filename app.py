import os
import requests
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

IBM_API_KEY    = os.getenv("IBM_API_KEY", "")
IBM_PROJECT_ID = os.getenv("IBM_PROJECT_ID", "")
IBM_MODEL_ID   = os.getenv("IBM_MODEL_ID", "ibm/granite-4-h-small")
IBM_API_URL    = os.getenv("IBM_API_URL", "https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29")
IBM_CHAT_URL   = "https://us-south.ml.cloud.ibm.com/ml/v1/text/chat?version=2023-05-29"
IBM_IAM_URL    = "https://iam.cloud.ibm.com/identity/token"

SYSTEM_PROMPT = (
    "You are an intelligent AI Travel Planner. "
    "Your role is to create practical, personalized travel plans based on the user's destination, "
    "budget, duration, interests, travel style, number of travelers, transportation preferences, "
    "accommodation preferences, and special requirements. "
    "Create realistic day-by-day itineraries without overloading each day. "
    "Each day should include: morning activities, afternoon activities, evening activities, "
    "suggested attractions with approximate time allocation, food suggestions, and transportation tips. "
    "Provide approximate budget estimates for accommodation, food, transportation, activities, and miscellaneous expenses. "
    "Provide practical transportation suggestions and destination-specific travel tips. "
    "Adapt the itinerary when the user changes their requirements. "
    "Never claim that you have real-time access to prices, weather, hotel availability, transportation schedules, "
    "maps, or bookings unless such information has actually been provided by an integrated external service. "
    "Clearly label all costs as ESTIMATES. Do not claim that bookings have been completed. "
    "Prioritize useful, realistic, concise, and personalized travel recommendations. "
    "Structure your response clearly with these sections: "
    "1. TRIP OVERVIEW, 2. DAY-BY-DAY ITINERARY, 3. BUDGET BREAKDOWN (ESTIMATES), "
    "4. ACCOMMODATION RECOMMENDATIONS, 5. TRANSPORTATION GUIDE, 6. TRAVEL TIPS."
)


def get_iam_token(api_key: str) -> str:
    """Exchange an IBM Cloud API key for a short-lived IAM bearer token."""
    resp = requests.post(
        IBM_IAM_URL,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={"grant_type": "urn:ibm:params:oauth:grant-type:apikey", "apikey": api_key},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def call_granite(prompt: str) -> str:
    """Send a prompt to IBM Granite via the chat API and return the generated text."""
    if not IBM_API_KEY or not IBM_PROJECT_ID:
        raise ValueError("IBM credentials are not configured. Please set IBM_API_KEY and IBM_PROJECT_ID in your .env file.")

    token = get_iam_token(IBM_API_KEY)

    # granite-4-h-small uses the chat/messages format
    payload = {
        "model_id": IBM_MODEL_ID,
        "project_id": IBM_PROJECT_ID,
        "messages": [
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        "parameters": {
            "max_new_tokens": 3000,
            "temperature": 0.7,
            "repetition_penalty": 1.1,
        },
    }

    resp = requests.post(
        IBM_CHAT_URL,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        json=payload,
        timeout=120,
    )
    resp.raise_for_status()
    data = resp.json()

    # Chat API response: {"choices": [{"message": {"content": "..."}}]}
    choices = data.get("choices", [])
    if choices:
        text = choices[0].get("message", {}).get("content", "").strip()
        if text:
            return text

    # Fallback: legacy text/generation response shape
    results = data.get("results", [])
    if results:
        text = results[0].get("generated_text", "").strip()
        if text:
            return text

    raise ValueError("IBM Granite returned an empty response. Please try again.")


def build_travel_prompt(form: dict) -> str:
    """Build the user-turn prompt for the chat API."""
    interests = ", ".join(form.get("interests", [])) or "Not specified"
    travel_prompt = form.get("travel_prompt", "").strip()
    natural_language_section = (
        f"\nUser's own words: \"{travel_prompt}\"\n"
        f"Use the above to personalise every aspect of the itinerary.\n"
    ) if travel_prompt else ""
    prompt = (
        f"USER REQUEST:\n"
        f"Starting Location: {form.get('from_location', 'Not specified')}\n"
        f"Destination: {form.get('destination', 'Not specified')}\n"
        f"Number of Travelers: {form.get('num_travelers', '1')}\n"
        f"Trip Duration: {form.get('duration', 'Not specified')}\n"
        f"Travel Dates: {form.get('travel_dates', 'Flexible')}\n"
        f"Budget: {form.get('currency', 'USD')} {form.get('budget', 'Not specified')}\n"
        f"Travel Style: {form.get('travel_style', 'Moderate')}\n"
        f"Interests: {interests}\n"
        f"Preferred Transportation: {form.get('transportation', 'Any')}\n"
        f"Accommodation Preference: {form.get('accommodation', 'Any')}\n"
        f"Dietary Preferences: {form.get('dietary', 'None')}\n"
        f"Special Requirements: {form.get('special_requirements', 'None')}\n"
        f"Other Preferences: {form.get('other_preferences', 'None')}\n"
        f"{natural_language_section}\n"
        f"Please generate a complete, personalized travel plan."
    )
    return prompt


def build_modify_prompt(existing_plan: str, modification: str) -> str:
    """Build the user-turn prompt for modifying an existing itinerary."""
    prompt = (
        f"EXISTING TRAVEL PLAN:\n{existing_plan}\n\n"
        f"USER MODIFICATION REQUEST:\n{modification}\n\n"
        f"Please update the travel plan according to the user's modification request. "
        f"Keep the same structure but apply the requested changes. "
        f"Re-output the complete updated plan."
    )
    return prompt


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/generate-plan", methods=["POST"])
def generate_plan():
    data = request.get_json(silent=True) or {}

    # Basic validation
    if not data.get("destination", "").strip():
        return jsonify({"error": "Destination is required."}), 400
    if not data.get("duration", "").strip():
        return jsonify({"error": "Trip duration is required."}), 400

    try:
        prompt = build_travel_prompt(data)
        result = call_granite(prompt)
        return jsonify({"plan": result})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Could not connect to IBM Watson API. Check your internet connection."}), 503
    except requests.exceptions.Timeout:
        return jsonify({"error": "The request to IBM Watson timed out. Please try again."}), 504
    except requests.exceptions.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else 0
        if status == 401:
            return jsonify({"error": "IBM API authentication failed. Check your API key."}), 401
        if status == 403:
            return jsonify({"error": "IBM API access denied. Check your Project ID and permissions."}), 403
        return jsonify({"error": f"IBM API returned an error (HTTP {status})."}), 502
    except Exception as exc:
        app.logger.error("Unexpected error in /api/generate-plan: %s", exc)
        return jsonify({"error": "An unexpected error occurred. Please try again."}), 500


@app.route("/api/modify-plan", methods=["POST"])
def modify_plan():
    data = request.get_json(silent=True) or {}

    existing_plan = data.get("existing_plan", "").strip()
    modification  = data.get("modification", "").strip()

    if not existing_plan:
        return jsonify({"error": "No existing travel plan provided."}), 400
    if not modification:
        return jsonify({"error": "Please describe how you would like to modify the itinerary."}), 400

    try:
        prompt = build_modify_prompt(existing_plan, modification)
        result = call_granite(prompt)
        return jsonify({"plan": result})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Could not connect to IBM Watson API. Check your internet connection."}), 503
    except requests.exceptions.Timeout:
        return jsonify({"error": "The request to IBM Watson timed out. Please try again."}), 504
    except requests.exceptions.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else 0
        if status == 401:
            return jsonify({"error": "IBM API authentication failed. Check your API key."}), 401
        return jsonify({"error": f"IBM API returned an error (HTTP {status})."}), 502
    except Exception as exc:
        app.logger.error("Unexpected error in /api/modify-plan: %s", exc)
        return jsonify({"error": "An unexpected error occurred. Please try again."}), 500


if __name__ == "__main__":
    app.run(debug=True)
