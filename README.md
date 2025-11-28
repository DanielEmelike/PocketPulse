## ✨ PocketPulse: Personalized Inflation Index Calculator

PocketPulse is a web application designed to generate a Personalized Inflation Score that measures the specific financial stress and cost of living changes experienced by an individual household, moving beyond generic national metrics like the Consumer Price Index (CPI). The project's core innovation is the use of a Fuzzy Logic Control System to process subjective perceptions and qualitative data, translating them into an accurate, human-centric financial stress metric.

### 🌟 Core Features

| Feature | Description |
| :--- | :--- |
| **Personalized Index** | Calculates a score (0-20) reflecting the user's specific spending profile (rent, food, debt, savings), not just aggregate national data. |
| **Dual Input Methods** | Supports calculation via a detailed **10-question slider questionnaire** or a **free-form text input** that is parsed and mapped by the backend. |
| **Fuzzy Logic Core** | Utilizes the `scikit-fuzzy` library to handle the inherent subjectivity and uncertainty of inflation's impact, converting vague inputs (e.g., "high debt burden") into precise numerical outputs. |
| **Regional Context** | Compares the user's personal score against simulated **Regional Average Scores** for selected countries (USA, UK, Canada, Nigeria) to provide context. |
| **Dynamic UI** | Features a responsive frontend with theme toggles, a score **Gauge Chart** (ECharts), and **Map Pins** showing regional averages. |

### 🛠️ Technology Stack

| Component | Technology | Role in Project |
| :--- | :--- | :--- |
| **Backend/API** | **Python (Flask)** | Provides the RESTful API endpoints (`/calculate_inflation_sliders`, `/calculate_inflation_text`) and manages server logic. |
| **Core Logic** | **scikit-fuzzy, NumPy** | Implements the **10-input Fuzzy Control System** and its rule-base for the core calculation. |
| **Frontend UI** | **HTML5** (`PP_home.html`, `PP_about.html`), **CSS3**, **JavaScript** (`PP.js`) | Handles user interaction, pagination, method toggling, and data presentation. |
| **Visualization** | **ECharts** (for Gauge) and **Custom CSS/JS** (for Map) | Renders the dynamic score gauge and positions interactive map pins to display regional data. |

### 🧠 How the Fuzzy Logic Core Works

The core innovation is the use of a Fuzzy Logic Control System that effectively models the non-linear, subjective nature of financial strain.

**1. Fuzzification (Input)**
  
The system takes 10 input variables (Antecedents). Each value (0-10) is converted into a degree of belonging to three fuzzy sets: (`low`, `medium`, or `high`).

**Input Handling:**

- **Sliders:** User input directly defines the 0-10 value for factors like `food_change` and `debt_burden`.

- **Text Input:** The `map_text_to_sliders` function parses text for keywords (e.g., "soaring," "struggling") and currency amounts, dynamically mapping the description to the 10 corresponding 0-10 scales.

**2. Rule Evaluation (Inference)**

A comprehensive rule-base (defined in `app.py`) processes the fuzzy inputs, modeling financial stress relationships.

**Example Rules:**

- **High Stress Rule:** If `food_change` is high AND `rent_change` is high AND `income_level` is low, then `inflation_score` is very high.

- **Resilience Rule:** If `food_change` is low OR rent_change is low AND `income_level` is medium, then `inflation_score` is low.

**3. Defuzzification (Output)**

The system aggregates the fuzzy output (e.g., "partially moderate, partially high") and uses a centroid method to convert it back into a single, precise numerical result, the **Personal Inflation Score** on a **0 to 20** scale.

### 🚀 Process for Project Execution

The application requires two separate processes to run simultaneously: the Python Flask server (Backend API) and the HTML interface (Frontend).

**1. Prerequisites**

You must have Python 3 installed on your system.
  
**2. Install Python Libraries**

Navigate to the project directory in your terminal and install the required packages:

```bash
pip install flask numpy skfuzzy flask_cors
```

**3. Run the Backend API**

Execute the main server script to start the Flask application. This API handles all score calculations on port 5000:

```bash
python app.py
```

- **Status Check:** Ensure the script is running and displays the message: `Flask app running on http://127.0.0.1:5000/`.

**4. Launch the Application Interface**

Once the backend server is running: Open the file `PP_home.html` in your web browser.

The JavaScript file (`PP.js`) will automatically connect to the running API to request the score calculation when the user clicks the **Calculate** or **Analyze Text** button.


