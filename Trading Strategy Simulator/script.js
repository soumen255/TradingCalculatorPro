
// DOM Elements
const startingMarginInput = document.getElementById('startingMargin');
const yearsInput = document.getElementById('years');
const winRateInput = document.getElementById('winRate');
const tradesPerMonthInput = document.getElementById('tradesPerMonth');
const lossPercentInput = document.getElementById('lossPercent');
const profitRatioSelect = document.getElementById('profitRatio');
const runSimulationBtn = document.getElementById('runSimulation');
const saveResultsBtn = document.getElementById('saveResults');
const clearHistoryBtn = document.getElementById('clearHistory');
const resultsBody = document.getElementById('resultsBody');
const historyList = document.getElementById('historyList');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// Chart initialization
const pnlChartCtx = document.getElementById('pnlChart').getContext('2d');
let pnlChart;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');

            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update active content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabId}-tab`) {
                    content.classList.add('active');
                }
            });
        });
    });
});

// Run simulation button
runSimulationBtn.addEventListener('click', runSimulation);

// Save results button
saveResultsBtn.addEventListener('click', saveResults);

// Clear history button
clearHistoryBtn.addEventListener('click', clearHistory);

// Main simulation function
function runSimulation() {
    // Get input values
    const startingMargin = parseFloat(startingMarginInput.value);
    const years = parseInt(yearsInput.value);
    const winRate = parseFloat(winRateInput.value) / 100;
    const tradesPerMonth = parseInt(tradesPerMonthInput.value);
    const lossPercent = parseFloat(lossPercentInput.value) / 100;
    const profitRatio = parseInt(profitRatioSelect.value);

    // Validate inputs
    if (isNaN(startingMargin) || isNaN(years) || isNaN(winRate) ||
        isNaN(tradesPerMonth) || isNaN(lossPercent)) {
        alert('Please enter valid numbers for all inputs');
        return;
    }

    // Calculate trades per year
    const tradesPerYear = tradesPerMonth * 12;
    const lossRate = 1 - winRate;

    // Initialize variables
    let margin = startingMargin;
    const results = [];

    // Run simulation for each year
    for (let year = 1; year <= years; year++) {
        // Calculate values for this year
        const lossPerTrade = lossPercent * margin;
        const profitPerWin = profitRatio * lossPerTrade;

        // Calculate monthly wins/losses
        const winsPerMonth = Math.round(tradesPerMonth * winRate);
        const lossesPerMonth = tradesPerMonth - winsPerMonth;
        const monthlyWin = winsPerMonth * profitPerWin;
        const monthlyLoss = lossesPerMonth * lossPerTrade;
        const monthlyPnL = monthlyWin - monthlyLoss;

        // Calculate yearly wins/losses
        const winsPerYear = Math.round(tradesPerYear * winRate);
        const lossesPerYear = tradesPerYear - winsPerYear;
        const yearlyWin = winsPerYear * profitPerWin;
        const yearlyLoss = lossesPerYear * lossPerTrade;

        // Calculate net PnL
        const netPnL = yearlyWin - yearlyLoss;

        // Calculate 20% of profit for next year's margin
        const twentyPercentProfit = 0.2 * Math.max(netPnL, 0);

        // Store results for this year
        results.push({
            year,
            marginStart: margin,
            lossPerTrade,
            profitPerWin,
            monthlyWin,
            monthlyLoss,
            monthlyPnL,
            yearlyWin,
            yearlyLoss,
            netPnL,
            twentyPercentProfit
        });

        // Update margin for next year
        margin = twentyPercentProfit > 0 ? twentyPercentProfit : margin;
    }

    // Display results
    displayResults(results);
}

// Display results in the table
function displayResults(results) {
    // Clear existing results
    resultsBody.innerHTML = '';

    // Add rows for each year
    results.forEach(item => {
        const row = document.createElement('tr');

        // Add highlight to current year row
        if (item.year === 1) {
            row.classList.add('highlight');
        }

        row.innerHTML = `
            <td>${item.year}</td>
            <td>₹${formatNumber(item.marginStart)}</td>
            <td>₹${formatNumber(item.lossPerTrade)}</td>
            <td>₹${formatNumber(item.profitPerWin)}</td>
            <td class="${item.monthlyWin >= 0 ? 'positive' : ''}">₹${formatNumber(item.monthlyWin)}</td>
            <td class="${item.monthlyLoss >= 0 ? '' : 'negative'}">₹${formatNumber(item.monthlyLoss)}</td>
            <td class="${item.monthlyPnL >= 0 ? 'positive' : 'negative'}">₹${formatNumber(item.monthlyPnL)}</td>
            <td class="${item.yearlyWin >= 0 ? 'positive' : ''}">₹${formatNumber(item.yearlyWin)}</td>
            <td class="${item.yearlyLoss >= 0 ? '' : 'negative'}">₹${formatNumber(item.yearlyLoss)}</td>
            <td class="${item.netPnL >= 0 ? 'positive' : 'negative'}">₹${formatNumber(item.netPnL)}</td>
            <td>₹${formatNumber(item.twentyPercentProfit)}</td>
        `;

        resultsBody.appendChild(row);
    });

    // Update chart
    updateChart(results);
}

// Update the chart with results
function updateChart(results) {
    if (pnlChart) {
        pnlChart.destroy();
    }

    const years = results.map(item => item.year);
    const netPnLs = results.map(item => item.netPnL);
    const yearlyWins = results.map(item => item.yearlyWin);
    const yearlyLosses = results.map(item => item.yearlyLoss);

    pnlChart = new Chart(pnlChartCtx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Net PnL',
                    data: netPnLs,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 4,
                    fill: true,
                    tension: 0.3,
                    yAxisID: 'y'
                },
                {
                    label: 'Yearly Win',
                    data: yearlyWins,
                    borderColor: '#27ae60',
                    borderWidth: 3,
                    fill: false,
                    yAxisID: 'y'
                },
                {
                    label: 'Yearly Loss',
                    data: yearlyLosses,
                    borderColor: '#e74c3c',
                    borderWidth: 3,
                    fill: false,
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            size: 13
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Trading Performance Over Years',
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ₹${formatNumber(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Amount (₹)',
                        font: {
                            size: 13
                        }
                    },
                    ticks: {
                        callback: function (value) {
                            return '₹' + formatNumber(value);
                        },
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

// Save results to localStorage
function saveResults() {
    const resultsRows = resultsBody.querySelectorAll('tr');
    if (resultsRows.length === 0 || resultsRows[0].querySelector('td').textContent === "Run simulation to see results") {
        alert('No results to save. Please run a simulation first.');
        return;
    }

    // Get simulation parameters
    const params = {
        startingMargin: parseFloat(startingMarginInput.value),
        years: parseInt(yearsInput.value),
        winRate: parseFloat(winRateInput.value),
        tradesPerMonth: parseInt(tradesPerMonthInput.value),
        lossPercent: parseFloat(lossPercentInput.value),
        profitRatio: parseInt(profitRatioSelect.value),
        timestamp: new Date().toISOString()
    };

    // Extract results data
    const results = [];
    resultsRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        results.push({
            year: parseInt(cells[0].textContent),
            marginStart: parseFloat(cells[1].textContent.replace('₹', '').replace(/,/g, '')),
            lossPerTrade: parseFloat(cells[2].textContent.replace('₹', '').replace(/,/g, '')),
            profitPerWin: parseFloat(cells[3].textContent.replace('₹', '').replace(/,/g, '')),
            monthlyWin: parseFloat(cells[4].textContent.replace('₹', '').replace(/,/g, '')),
            monthlyLoss: parseFloat(cells[5].textContent.replace('₹', '').replace(/,/g, '')),
            monthlyPnL: parseFloat(cells[6].textContent.replace('₹', '').replace(/,/g, '')),
            yearlyWin: parseFloat(cells[7].textContent.replace('₹', '').replace(/,/g, '')),
            yearlyLoss: parseFloat(cells[8].textContent.replace('₹', '').replace(/,/g, '')),
            netPnL: parseFloat(cells[9].textContent.replace('₹', '').replace(/,/g, '')),
            twentyPercentProfit: parseFloat(cells[10].textContent.replace('₹', '').replace(/,/g, ''))
        });
    });

    // Create simulation object
    const simulation = {
        id: Date.now(),
        params,
        results
    };

    // Save to localStorage
    let history = JSON.parse(localStorage.getItem('tradingHistory')) || [];
    history.push(simulation);
    localStorage.setItem('tradingHistory', JSON.stringify(history));

    // Reload history
    loadHistory();

    alert('Simulation saved successfully!');
}

// Load history from localStorage
function loadHistory() {
    const history = JSON.parse(localStorage.getItem('tradingHistory')) || [];
    historyList.innerHTML = '';

    if (history.length === 0) {
        historyList.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">No saved simulations found.</p>';
        return;
    }

    // Display each simulation in history
    history.forEach(sim => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.dataset.id = sim.id;

        const date = new Date(sim.params.timestamp);
        const formattedDate = date.toLocaleString();
        const profitRatioText = `1:${sim.params.profitRatio}`;
        const totalPnL = sim.results.reduce((sum, r) => sum + r.netPnL, 0);

        item.innerHTML = `
            <h4>Simulation #${sim.id}</h4>
            <p>Date: ${formattedDate}</p>
            <p>Starting Margin: ₹${formatNumber(sim.params.startingMargin)} | 
            Years: ${sim.params.years} | 
            Win Rate: ${sim.params.winRate}% | 
            Profit Ratio: ${profitRatioText}</p>
            <p class="${totalPnL >= 0 ? 'positive' : 'negative'}">Total Net PnL: ₹${formatNumber(totalPnL)}</p>
        `;

        item.addEventListener('click', () => {
            displayResults(sim.results);

            // Update inputs to match this simulation
            startingMarginInput.value = sim.params.startingMargin;
            yearsInput.value = sim.params.years;
            winRateInput.value = sim.params.winRate;
            tradesPerMonthInput.value = sim.params.tradesPerMonth;
            lossPercentInput.value = sim.params.lossPercent;
            profitRatioSelect.value = sim.params.profitRatio;

            // Switch to results tab
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            document.querySelector('.tab[data-tab="results"]').classList.add('active');
            document.getElementById('results-tab').classList.add('active');
        });

        historyList.appendChild(item);
    });
}

// Clear history
function clearHistory() {
    if (confirm('Are you sure you want to clear all saved simulations?')) {
        localStorage.removeItem('tradingHistory');
        loadHistory();
    }
}

// Helper function to format numbers as Indian Rupees
function formatNumber(num) {
    return num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Initialize with sample data
function initializeSampleData() {
    const sampleResults = [
        {
            year: 1,
            marginStart: 100000,
            lossPerTrade: 10000,
            profitPerWin: 20000,
            monthlyWin: 480000,
            monthlyLoss: 160000,
            monthlyPnL: 320000,
            yearlyWin: 5760000,
            yearlyLoss: 1920000,
            netPnL: 3840000,
            twentyPercentProfit: 768000
        },
        {
            year: 2,
            marginStart: 768000,
            lossPerTrade: 76800,
            profitPerWin: 153600,
            monthlyWin: 3686400,
            monthlyLoss: 1228800,
            monthlyPnL: 2457600,
            yearlyWin: 44236800,
            yearlyLoss: 14745600,
            netPnL: 29491200,
            twentyPercentProfit: 5898240
        }
    ];

    displayResults(sampleResults);
}

// Initialize with sample data on first load
setTimeout(initializeSampleData, 500);
