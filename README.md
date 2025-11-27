PocketPulse is a web-based tool designed to move beyond generic metrics like the Consumer Price Index (CPI) to provide a Personalized Inflation Score for a household's micro-economy. It uses a Fuzzy Logic Control System written in Python (Flask/scikit-fuzzy) to process subjective user inputs and qualitative text data, generating an accurate, human-centric metric of financial stress caused by the cost of living.

I. Core Features

Personalized Index: Calculates a score (0-20) that reflects the user's specific spending habits (rent, food, debt) and financial resilience, not just aggregate national data.

Dual Input Methods: Supports calculation via a 10-question slider questionnaire or a free-form text input processed by a sophisticated text-to-slider mapping system.

Fuzzy Logic Core: Utilizes a Fuzzy Control System to handle the inherent subjectivity and uncertainty of inflation's impact.

Regional Comparison: Provides context by comparing the user's score against a simulated regional average score for countries like the USA, UK, Canada, and Nigeria.

Responsive UI: Features a dynamic ECharts gauge for score visualization and a map to display regional averages.

II. Application Flow

The overall process, from user interaction to final result, involves these steps:

Selection: The user selects a Region (e.g., USA, UK) and an Input Method (Questionnaire or Text Input).

Request: The frontend (PP.js) collects the 10 inputs (either from sliders or the mapped text data) and sends a POST request to the Flask API endpoint (/calculate_inflation_sliders or /calculate_inflation_text).

Calculation: The Flask backend (app.py) runs the input through the scikit-fuzzy control system, computes the result, and retrieves the simulated Regional Average Score.

Response: The backend returns the Personal Inflation Score and the Regional Average Score as JSON.

Visualization: The frontend updates the ECharts Gauge with the user's personal score and displays a comparison text showing how the user's score stacks up against the regional average.

III. Installation and Launch

To run PocketPulse, you must launch the Python API server before viewing the HTML interface.

1. Prerequisites
Ensure you have Python 3 installed, and install the required libraries: pip install flask, scikit-fuzzy, & numpy

2. Run the Backend API
Navigate to the project directory in your terminal.
Execute the main Python server script:
python app.py
Crucial: Confirm the script is running and displays the message: Flask app running on http://127.0.0.1:5000/.

3. Launch the Application
Once the backend server is active:
Open the file PP_home.html in your web browser.
