document.addEventListener('DOMContentLoaded', () => {
    // --- THEME TOGGLE LOGIC (ISOLATED) ---
    const themeToggle = document.getElementById('toggle-theme');
    const body = document.body;

    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            const currentTheme = body.classList.contains('dark-mode') ? 'dark' : 'light';
            localStorage.setItem('theme', currentTheme);
        });
    }

    // --- CHECK FOR CALCULATOR PAGE ELEMENTS ---
    const gaugeChartDom = document.getElementById('gauge-chart');
    const mapChartDom = document.getElementById('region-map-chart');

    // Proceed with all calculator-specific logic ONLY if the required elements exist (i.e., we are on PP_home.html)
    if (gaugeChartDom && mapChartDom) {

        // --- ECHARTS INITIALIZATION (Local to Calculator Page) ---
        const gaugeChart = echarts.init(gaugeChartDom, 'light');

        // UI Elements
        const sliderArea = document.getElementById('slider-input-area');
        const speechArea = document.getElementById('speech-input-area');
        const methodSlider = document.getElementById('method-slider');
        const methodSpeech = document.getElementById('method-speech');
        const resultArea = document.querySelector('.result-visualization-area');
        const aiTextInput = document.getElementById('ai-text-input');
        const startSpeechBtn = document.getElementById('start-speech-btn');

        // Pagination Elements
        const qPage1 = document.getElementById('q-page-1');
        const qPage2 = document.getElementById('q-page-2');
        const prevPageBtn = document.getElementById('prev-page-btn');
        const nextPageBtn = document.getElementById('next-page-btn');
        const calculateBtn = document.getElementById('calculate-btn');
        let currentPage = 1;

        // --- COLOR CONSTANTS ---
        const COLOR_PRIMARY = '#6366f1';
        const COLOR_LOW = '#10b981';
        const COLOR_MODERATE = '#f59e0b';
        const COLOR_HIGH = '#ef4444';

        // --- MAP PIN DATA ---
        const MAP_PIN_DATA = {
            'USA': { 
                coords: { top: '38%', left: '21%' }, 
                name: 'USA', 
                initialAvg: 10.5 
            },
            'CANADA': { 
                coords: { top: '22%', left: '20%' }, 
                name: 'Canada', 
                initialAvg: 9.2 
            },
            'UK': { 
                coords: { top: '30%', left: '46%' }, 
                name: 'United Kingdom', 
                initialAvg: 11.8 
            },
            'NIGERIA': { 
                coords: { top: '55%', left: '45%' }, 
                name: 'Nigeria', 
                initialAvg: 15.1 
            }
        };
        
        function getScoreColorClass(score) {
            if (score <= 4) return 'ring-low';
            if (score >= 16) return 'ring-high';
            return 'ring-moderate';
        }
        
        // --- 2. INPUT RANGE DYNAMIC VALUE UPDATES ---
        function updateRangeLabel(inputId, spanId) {
            const input = document.getElementById(inputId);
            const span = document.getElementById(spanId);
            if (input && span) {
                span.textContent = input.value;
                input.addEventListener('input', () => {
                    span.textContent = input.value;
                });
            }
        }

        // Initialize all 10 range labels
        updateRangeLabel('food_change', 'food_value');
        updateRangeLabel('rent_change', 'rent_value');
        updateRangeLabel('income_level', 'income_value');
        updateRangeLabel('transport_dependence', 'transport_value');
        updateRangeLabel('utility_sensitivity', 'utility_value');
        updateRangeLabel('healthcare_access', 'healthcare_value');
        updateRangeLabel('debt_burden', 'debt_value');
        updateRangeLabel('discretionary_spending', 'discretionary_value');
        updateRangeLabel('education_cost', 'education_value'); 
        updateRangeLabel('savings_impact', 'savings_value');

        // --- 3. INPUT METHOD TOGGLE ---
        function setActiveMethod(method) {
            // Ensure input areas are cleared/hidden first
            sliderArea.classList.add('hidden');
            speechArea.classList.add('hidden');
            nextPageBtn.classList.add('hidden');
            prevPageBtn.classList.add('hidden');
            calculateBtn.classList.add('hidden');

            if (method === 'slider') {
                sliderArea.classList.remove('hidden');
                methodSlider.classList.replace('btn-secondary', 'btn-primary');
                methodSpeech.classList.replace('btn-primary', 'btn-secondary');
                
                currentPage = 1;
                updatePaginationControls(); // Show pagination for sliders
            } else if (method === 'speech') {
                speechArea.classList.remove('hidden');
                methodSpeech.classList.replace('btn-secondary', 'btn-primary');
                methodSlider.classList.replace('btn-primary', 'btn-secondary');
            }
        }
        
        methodSlider.addEventListener('click', () => setActiveMethod('slider'));
        methodSpeech.addEventListener('click', () => setActiveMethod('speech'));


        // --- 4. PAGINATION LOGIC ---
        function updatePaginationControls() {
            qPage1.classList.add('hidden');
            qPage2.classList.add('hidden');
            calculateBtn.classList.add('hidden');
            prevPageBtn.classList.remove('hidden');
            nextPageBtn.classList.remove('hidden');
            prevPageBtn.disabled = true;
            nextPageBtn.disabled = true;
            
            if (currentPage === 1) {
                qPage1.classList.remove('hidden');
                prevPageBtn.disabled = true;
                nextPageBtn.disabled = false;
                calculateBtn.classList.add('hidden');
            } else if (currentPage === 2) {
                qPage2.classList.remove('hidden');
                prevPageBtn.disabled = false;
                nextPageBtn.classList.add('hidden');
                calculateBtn.classList.remove('hidden'); // Show calculate on the last page
            }
        }
        
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                updatePaginationControls();
            }
        });

        nextPageBtn.addEventListener('click', () => {
            if (currentPage < 2) {
                currentPage++;
                updatePaginationControls();
            }
        });
        
        // --- 5. ECHARTS GAUGE VISUALIZATION (MODIFIED) ---

        function getGaugeColor(score) {
            if (score <= 4) return { color: COLOR_LOW, name: 'Low' };
            if (score >= 16) return { color: COLOR_HIGH, name: 'Critical' };
            return { color: COLOR_MODERATE, name: 'Moderate' };
        }

        function updateGaugeChart(score) {
            const scoreValue = parseFloat(score);
            const colorData = getGaugeColor(scoreValue);
            
            if (scoreValue >= 16) {
                resultArea.classList.add('blinking-border');
            } else {
                resultArea.classList.remove('blinking-border');
            }
            
            const displayValue = (scoreValue === 0 && scoreValue !== initialScore) ? '--' : scoreValue.toFixed(2);
            
            const option = {
                series: [
                    {
                        type: 'gauge',
                        startAngle: 180,
                        endAngle: 0,
                        center: ['50%', '75%'],
                        radius: '140%',
                        min: 0, max: 20, splitNumber: 4,
                        axisLine: {
                            lineStyle: {
                                width: 10,
                                color: [
                                    [4 / 20, COLOR_LOW],
                                    [16 / 20, COLOR_MODERATE],
                                    [1, COLOR_HIGH]
                                ]
                            }
                        },
                        pointer: {
                            show: scoreValue !== 0,
                            icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
                            length: '12%', width: 12, offsetCenter: [0, '-50%'],
                            itemStyle: { color: colorData.color }
                        },
                        axisTick: { length: 8, lineStyle: { color: 'auto', width: 1 } },
                        splitLine: { length: 15, lineStyle: { color: 'auto', width: 3 } },
                        axisLabel: {
                            color: 'var(--color-text)', fontSize: 14, distance: -50, rotate: 'tangential',
                            formatter: function (value) {
                                if (value === 2.5) { return 'Low (0-4)'; } 
                                else if (value === 17.5) { return 'Critical (16-20)'; }
                                return '';
                            }
                        },
                        title: {
                            offsetCenter: [0, '-5%'], fontSize: 16, color: 'var(--color-text)',
                            value: '' 
                        },
                        detail: {
                            fontSize: 40, offsetCenter: [0, '-15%'], valueAnimation: true,
                            formatter: function (value) {
                                return (value === 0 && scoreValue !== initialScore) ? '--' : value.toFixed(2);
                            },
                            color: colorData.color
                        },
                        data: [
                            { value: (scoreValue === 0 && scoreValue !== initialScore) ? 0 : scoreValue }
                        ]
                    }
                ]
            };
            gaugeChart.setOption(option, true);
        }
        
        // --- 6. MAP PIN VISUALIZATION LOGIC (Unchanged) ---

        function interpretScore(score) {
            if (score === 0) return 'Input values to see personalized effect.';
            if (score < 5) return 'Very Low Inflation Effect. Household is resilient or prices are stable.';
            if (score < 10) return 'Low to Moderate Inflation Effect. Manageable stress.';
            if (score < 15) return 'High Inflation Effect. Requires financial planning and assistance.';
            return 'Critical Inflation Effect. Immediate intervention needed for stability.';
        }

        function createPinHTML(regionKey, score) {
            const data = MAP_PIN_DATA[regionKey];
            const colorClass = getScoreColorClass(score);
            const interpretation = interpretScore(score);

            return `
                <div id="pin-${regionKey}" class="map-pin" 
                    style="top: ${data.coords.top}; left: ${data.coords.left};">
                    <div class="pin-ring ${colorClass}">
                        ${parseFloat(score).toFixed(1)}
                    </div>
                    <div class="pin-tooltip">
                        <div class="tooltip-title">${data.name} Average Inflation:</div>
                        <p>${parseFloat(score).toFixed(2)}</p>
                        <div class="tooltip-title" style="margin-top: 5px;">Interpretation:</div>
                        <p>${interpretation}</p>
                    </div>
                </div>
            `;
        }

        function initializeMapPins() {
            // Clear any existing pins first
            mapChartDom.innerHTML = '';
            let pinsHTML = '';
            for (const region in MAP_PIN_DATA) {
                pinsHTML += createPinHTML(region, MAP_PIN_DATA[region].initialAvg);
            }
            mapChartDom.innerHTML = pinsHTML;
        }

        function updateMapPin(regionKey, score) {
            const pinElement = document.getElementById(`pin-${regionKey}`);
            if (!pinElement) return;

            const ring = pinElement.querySelector('.pin-ring');
            const tooltip = pinElement.querySelector('.pin-tooltip');
            
            const interpretation = interpretScore(score);
            const colorClass = getScoreColorClass(score);

            // Update ring color and text
            ring.className = `pin-ring ${colorClass}`;
            ring.textContent = parseFloat(score).toFixed(1);

            // Update tooltip content
            tooltip.innerHTML = `
                <div class="tooltip-title">${MAP_PIN_DATA[regionKey].name} Average Inflation:</div>
                <p>${parseFloat(score).toFixed(2)}</p>
                <div class="tooltip-title" style="margin-top: 5px;">Interpretation:</div>
                <p>${interpretation}</p>
            `;
        }
        
        // --- 7. TEXT & COMPARISON LOGIC (Unchanged) ---

        function compareToRegionalAverage(userScore, regionalAvg, region) {
            const difference = userScore - regionalAvg;
            let comparisonText;
            if (Math.abs(difference) <= 1.0) {
                comparisonText = `Your score is consistent with the average inflation experience in ${region} (${regionalAvg}).`;
            } else if (difference > 1.0) {
                comparisonText = `Your score is ${Math.abs(difference).toFixed(2)} points above the ${region} average (${regionalAvg}), indicating a much higher personal inflation burden.`;
            } else {
                comparisonText = `Your score is ${Math.abs(difference).toFixed(2)} points below the ${region} average (${regionalAvg}), indicating a lower personal inflation burden.`;
            }
            // Remove any residual ** markdown
            return comparisonText.replace(/\*\*/g, ''); 
        }
        
        // --- 8. CORE CALCULATION HANDLER (Unchanged) ---
        
        async function handleCalculation(method, payload) {
            const apiUrl = `http://127.0.0.1:5000/calculate_inflation_${method}`;
            
            const scoreOutput = document.getElementById('score-output');
            const interpretation = document.getElementById('score-interpretation');
            const comparison = document.getElementById('regional-comparison');
            
            scoreOutput.textContent = '...';
            interpretation.textContent = 'Calculating score and regional comparison...';
            comparison.textContent = '';
            resultArea.style.borderColor = 'gray';
            resultArea.classList.remove('blinking-border');
            updateGaugeChart(10); // Placeholder state

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (result.success) {
                    const score = parseFloat(result.personal_inflation_score).toFixed(2);
                    const regionalAvg = parseFloat(result.regional_average_score).toFixed(2);
                    
                    scoreOutput.textContent = score;
                    interpretation.textContent = interpretScore(score);
                    comparison.innerHTML = compareToRegionalAverage(score, regionalAvg, payload.region);

                    // Update Visualizations
                    updateGaugeChart(score);
                    
                    // Update the map pin for the selected region with the regional average score
                    updateMapPin(payload.region, parseFloat(regionalAvg)); 

                    resultArea.style.borderColor = getGaugeColor(score).color;
                    
                } else {
                    scoreOutput.textContent = 'Error';
                    interpretation.textContent = result.error || 'Could not calculate score.';
                    console.error('API Error Response:', result.error);
                    resultArea.style.borderColor = COLOR_HIGH;
                }

            } catch (error) {
                scoreOutput.textContent = 'API Error';
                interpretation.textContent = 'Cannot connect to the backend server. Check if app.py is running on port 5000.';
                console.error('Fetch error:', error);
                resultArea.style.borderColor = COLOR_HIGH;
            }
        }

        // Event listener for the Questionnaire (Slider) Calculate button
        calculateBtn.addEventListener('click', () => {
            const region = document.getElementById('region-select').value;
            const payload = {
                region: region,
                food_change: document.getElementById('food_change').value,
                rent_change: document.getElementById('rent_change').value,
                income_level: document.getElementById('income_level').value,
                transport_dependence: document.getElementById('transport_dependence').value,
                utility_sensitivity: document.getElementById('utility_sensitivity').value,
                // New questions
                healthcare_access: document.getElementById('healthcare_access').value,
                debt_burden: document.getElementById('debt_burden').value,
                discretionary_spending: document.getElementById('discretionary_spending').value,
                education_cost: document.getElementById('education_cost').value,
                savings_impact: document.getElementById('savings_impact').value
            };
            handleCalculation('sliders', payload);
        });

        // Event listener for the AI Text Input Calculate button
        startSpeechBtn.addEventListener('click', () => {
            const region = document.getElementById('region-select').value;
            const payload = {
                region: region,
                text_input: aiTextInput.value
            };
            handleCalculation('text', payload);
        });

        // --- INITIALIZATION CODE: Score displays placeholders until calculated ---
        const initialScore = 0; 
        
        // Set default placeholder text/score
        document.getElementById('score-output').textContent = '--';
        document.getElementById('score-interpretation').textContent = 'Input values and click "Calculate" to see your score.';
        document.getElementById('regional-comparison').textContent = 'Welcome to Pocket Pulse. Select a region and method to begin!';

        // Initialize visualizations. Send 0 to clear the gauge needle.
        updateGaugeChart(initialScore);
        initializeMapPins();
        
        // --- FIX IMPLEMENTED HERE: Ensure no method is selected by default ---
        // Both input areas are hidden by default via HTML/CSS. 
        // We ensure both buttons are styled as secondary on load.
        updatePaginationControls(); // Sets up initial visibility state (all hidden, pagination controls setup)
        methodSlider.classList.replace('btn-primary', 'btn-secondary');
        methodSpeech.classList.replace('btn-primary', 'btn-secondary');
    }
});