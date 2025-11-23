from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl
import re

# --- FLASK SETUP ---
app = Flask(__name__)
# Enable CORS to allow the frontend running on a different port/domain to connect
CORS(app)

# --- REGIONAL AVERAGE SIMULATION ---
REGIONAL_AVERAGE_SCORES = {
    'USA': 10.5,
    'CANADA': 9.2,
    'UK': 11.8,
    'NIGERIA': 15.1,
}

# --- FUZZY LOGIC DEFINITION ---
# Antecedents (Inputs)
food_change = ctrl.Antecedent(np.arange(0, 11, 1), 'food_change')
rent_change = ctrl.Antecedent(np.arange(0, 11, 1), 'rent_change')
income_level = ctrl.Antecedent(np.arange(0, 11, 1), 'income_level')  # 0=Poor Resilience, 10=High Resilience
transport_dependence = ctrl.Antecedent(np.arange(0, 11, 1), 'transport_dependence')
utility_sensitivity = ctrl.Antecedent(np.arange(0, 11, 1), 'utility_sensitivity')
# New Antecedents
healthcare_access = ctrl.Antecedent(np.arange(0, 11, 1), 'healthcare_access')
debt_burden = ctrl.Antecedent(np.arange(0, 11, 1), 'debt_burden')
discretionary_spending = ctrl.Antecedent(np.arange(0, 11, 1), 'discretionary_spending')
education_cost = ctrl.Antecedent(np.arange(0, 11, 1), 'education_cost')
savings_impact = ctrl.Antecedent(np.arange(0, 11, 1), 'savings_impact')

# List of all input keys, used for robust dictionary initialization in map_text_to_sliders
INPUT_KEYS = [
    'food_change', 'rent_change', 'income_level', 'transport_dependence', 'utility_sensitivity',
    'healthcare_access', 'debt_burden', 'discretionary_spending', 'education_cost', 'savings_impact'
]

# Consequent (Output)
inflation_score = ctrl.Consequent(np.arange(0, 21, 1), 'inflation_score')  # Score 0 to 20

# 3. Membership Functions (MFs)
# Input MFs: Low, Medium, High (Applied to all 10 inputs)
for antecedent in [food_change, rent_change, income_level, transport_dependence, utility_sensitivity,
                   healthcare_access, debt_burden, discretionary_spending, education_cost, savings_impact]:
    antecedent.automf(3, names=['low', 'medium', 'high'])

# Output MFs: Custom definitions for Very Low to Very High (Unchanged)
inflation_score['very_low'] = fuzz.trimf(inflation_score.universe, [0, 0, 4])
inflation_score['low'] = fuzz.trimf(inflation_score.universe, [2, 6, 10])
inflation_score['moderate'] = fuzz.trimf(inflation_score.universe, [8, 12, 16])
inflation_score['high'] = fuzz.trimf(inflation_score.universe, [14, 18, 20])
inflation_score['very_high'] = fuzz.trimf(inflation_score.universe, [18, 20, 20])

# Fuzzy Rules (SUPER SMART EXPANSION)
rules = [
    # --- LEVEL 1: EXTREME DIFFERENTIATION (Highest Priority) ---
    # 1. LOW STRESS: Food/Rent Low AND Income High -> VERY LOW SCORE
    ctrl.Rule(
        food_change['low'] & rent_change['low'] & income_level['high'],
        inflation_score['very_low']
    ),

    # 2. HIGH STRESS: Food/Rent High AND Income Low/Medium -> VERY HIGH SCORE
    ctrl.Rule(
        food_change['high'] & rent_change['high'] & (income_level['low'] | income_level['medium']),
        inflation_score['very_high']
    ),

    # --- LEVEL 2: CUMULATIVE BURDEN FOR LOW RESILIENCE ---
    # 3. Critical Failure: High Debt, High Savings Impact, AND Low Income
    ctrl.Rule(
        savings_impact['high'] & debt_burden['high'] & income_level['low'],
        inflation_score['very_high']
    ),

    # 4. Crisis Potential: High Cost-of-Living PLUS High Healthcare/Education burden for Low/Medium Income
    ctrl.Rule(
        (food_change['high'] | rent_change['high']) & (healthcare_access['high'] | education_cost['high']) &
        income_level['low'],
        inflation_score['high']
    ),

    # --- LEVEL 3: MEDIUM RESILIENCE / HIGH COST SENSITIVITY ---
    # 5. Transportation/Utilities Risk: High dependence on non-negotiables for Medium Income
    ctrl.Rule(
        transport_dependence['high'] & utility_sensitivity['high'] & income_level['medium'],
        inflation_score['high']
    ),

    # 6. Debt/Savings Strain: Medium Income starting to fail on debt AND savings
    ctrl.Rule(
        debt_burden['high'] & savings_impact['high'] & income_level['medium'],
        inflation_score['moderate']
    ),

    # --- LEVEL 4: MODERATE/LOW STRESS SCENARIOS ---
    # 7. Low Vulnerability: Low cost change combined with medium/high resilience.
    ctrl.Rule(
        (food_change['low'] | rent_change['low'] | education_cost['low']) & income_level['medium'],
        inflation_score['low']
    ),

    # 8. Baseline Stress: Everything neutral or moderate
    ctrl.Rule(
        food_change['medium'] & rent_change['medium'] & income_level['medium'] & discretionary_spending['medium'],
        inflation_score['moderate']
    )
]

# Control System
inflation_ctrl = ctrl.ControlSystem(rules)
inflation_sim = ctrl.ControlSystemSimulation(inflation_ctrl)


# --- TEXT-TO-SLIDER MAPPING (SUPER SMART ENHANCEMENT) ---
def map_text_to_sliders(text):
    """
    Parses a block of text and maps the sentiment/content to the 0-10 input scales
    for the fuzzy logic controller, applying emotional weight and interactive logic.
    """
    text = text.lower()

    # Initialize all using the globally defined INPUT_KEYS list (Fix for .keys() error)
    inputs = {k: 5 for k in INPUT_KEYS}

    # --- 1. Key Phrase and Magnitude Matching ---

    # ENHANCEMENT: Define stronger, overlapping vocab for more aggressive mapping
    HIGH_MAGNITUDE_WORDS = ['very high', 'soaring', 'crushing', 'expensive', 'severe', 'significant', 'stopped',
                            'cut deep', 'skyrocketing', 'devastating']
    LOW_MAGNITUDE_WORDS = ['none', 'minimal', 'fine', 'stable', 'low', 'cheap', 'easy', 'not worried', 'no change',
                           'very cheap', 'very low', 'comfortable']

    # Helper function to find best magnitude match (Returns a score 1-10)
    def get_magnitude_value(target_words, default_val=5):

        if any(w in text for w in target_words) and any(m in text for m in HIGH_MAGNITUDE_WORDS):
            return 9  # Aggressive High

        if any(w in text for w in target_words) and any(m in text for m in LOW_MAGNITUDE_WORDS):
            return 1  # Aggressive Low (minimal impact)

        # If the category is mentioned but no clear magnitude, return medium default
        if any(w in text for w in target_words):
            return 5

        return default_val

    # Map words to inputs
    inputs['food_change'] = get_magnitude_value(['food', 'groceries', 'eating'])
    inputs['rent_change'] = get_magnitude_value(['rent', 'housing', 'mortgage', 'rent'])
    inputs['transport_dependence'] = get_magnitude_value(['transport', 'fuel', 'gas', 'car'])
    inputs['utility_sensitivity'] = get_magnitude_value(['utility', 'electricity', 'heating', 'water'])
    inputs['healthcare_access'] = get_magnitude_value(['health', 'insurance', 'medical'])
    inputs['debt_burden'] = get_magnitude_value(['debt', 'loan', 'credit card'])
    inputs['discretionary_spending'] = get_magnitude_value(['discretionary', 'luxuries', 'going out', 'cut spending'])
    inputs['education_cost'] = get_magnitude_value(['education', 'childcare', 'tuition'])
    inputs['savings_impact'] = get_magnitude_value(['savings', 'investing', 'emergency fund'])

    # --- Overriding Income/Resilience based on money mentions (Enhanced) ---
    income_score = 5  # Default

    # Adjust based on descriptive words (Income resilience is inverted: high income = high score)
    if any(word in text for word in
           ['very high income', 'wealthy', 'rich', 'afford anything', 'earning well', 'high salary', 'bulletproof']):
        income_score = 9
    elif any(word in text for word in
             ['struggling', 'poor', 'broke', 'cannot afford', 'very low income', 'low income', 'penniless']):
        income_score = 1
    elif any(word in text for word in ['moderate income', 'medium salary', 'ok financially', 'holding steady']):
        income_score = 5

    # Search for currency amounts (Robust Parsing)
    try:
        money_match = re.search(r'\$?(\d{1,3}(?:,\d{3})*|\d+)(?:k|m| per year| yearly)?', text)
        if money_match:
            value_str = money_match.group(1).replace(',', '').replace('$', '')

            if 'k' in text or 'm' in text:
                numeric_value = float(value_str) * (1000 if 'k' in text else 1000000)
            else:
                numeric_value = int(value_str)

            if numeric_value > 100000:
                income_score = 9
            elif numeric_value > 40000:
                income_score = 6
    except ValueError:
        pass

    inputs['income_level'] = income_score

    # --- INTERACTIVE MAPPING LOGIC (SUPER SMART PENALTY/BONUS) ---

    # BONUS: If income is very high, dampen debt/utility impact (Resilience effect)
    if inputs['income_level'] >= 8:
        inputs['debt_burden'] = min(inputs['debt_burden'], 3)
        inputs['utility_sensitivity'] = min(inputs['utility_sensitivity'], 2)

    # PENALTY: If savings impact is high, boost debt burden slightly (Strain effect)
    if inputs['savings_impact'] >= 8:
        inputs['debt_burden'] = min(10, inputs['debt_burden'] + 1)

    return inputs


# --- FLASK API ENDPOINTS (Unchanged) ---

# Endpoint for the Slider (Questionnaire) Method
@app.route('/calculate_inflation_sliders', methods=['POST'])
def calculate_sliders():
    """Calculates inflation score based on 10 slider inputs (0-10)."""
    try:
        data = request.get_json(silent=True)
        if data is None or not isinstance(data, dict):
            return jsonify({'success': False, 'error': 'Invalid, empty, or non-JSON payload received.'}), 400

        region = data.get('region')
        inputs = {
            'food_change': float(data.get('food_change')),
            'rent_change': float(data.get('rent_change')),
            'income_level': float(data.get('income_level')),
            'transport_dependence': float(data.get('transport_dependence')),
            'utility_sensitivity': float(data.get('utility_sensitivity')),
            'healthcare_access': float(data.get('healthcare_access')),
            'debt_burden': float(data.get('debt_burden')),
            'discretionary_spending': float(data.get('discretionary_spending')),
            'education_cost': float(data.get('education_cost')),
            'savings_impact': float(data.get('savings_impact'))
        }
        for key, value in inputs.items():
            inflation_sim.input[key] = value

        inflation_sim.compute()

        user_score = inflation_sim.output['inflation_score']
        regional_avg_score = REGIONAL_AVERAGE_SCORES.get(region, 10.0)

        return jsonify({
            'success': True,
            'personal_inflation_score': round(user_score, 2),
            'regional_average_score': round(regional_avg_score, 2),
            'region': region
        })

    except Exception as e:
        return jsonify({'success': False, 'error': f'Slider calculation error: {str(e)}'}), 500


# Endpoint for the AI Text Input Method
@app.route('/calculate_inflation_text', methods=['POST'])
def calculate_text():
    """
    Calculates inflation score by mapping user text input to the 10 fuzzy
    logic input scales (0-10) before running the simulation.
    """
    try:
        data = request.get_json(silent=True)
        if data is None or not isinstance(data, dict):
            return jsonify({'success': False,
                            'error': 'Invalid, empty, or non-JSON payload received. Check Content-Type header.'}), 400

        region = data.get('region')
        text_input = data.get('text_input', '')

        if not text_input:
            return jsonify({'success': False, 'error': 'Text input cannot be empty.'}), 400

        # Map text to the 0-10 slider inputs
        inputs = map_text_to_sliders(text_input)

        # Calculate Score using Fuzzy Logic
        for key, value in inputs.items():
            if not isinstance(value, (int, float)):
                raise ValueError(f"Non-numeric input value for {key}: {value}")

            inflation_sim.input[key] = value

        inflation_sim.compute()

        user_score = inflation_sim.output['inflation_score']
        regional_avg_score = REGIONAL_AVERAGE_SCORES.get(region, 10.0)

        return jsonify({
            'success': True,
            'personal_inflation_score': round(user_score, 2),
            'regional_average_score': round(regional_avg_score, 2),
            'region': region
        })

    except Exception as e:
        return jsonify({'success': False, 'error': f'Text calculation error: {str(e)}'}), 500


if __name__ == '__main__':
    print("Flask app running on http://127.0.0.1:5000/")
    app.run(debug=True)