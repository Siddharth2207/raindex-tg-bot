const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');
const { Chart, registerables } = require('chart.js');

// Register the required Chart.js components
Chart.register(...registerables);

require('dotenv').config();

// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.TELEGRAM_BOT_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

// Set bot commands so they appear in the menu
bot.setMyCommands([
    { command: '/get_tvls', description: 'Get the current TVLs for Raindex protocol' },
    { command: '/get_volume', description: 'Get the latest volume data for Raindex' } // New command for volume data
]);

// Handler function to query the Llama API and send parsed data as a pie chart and TVL numbers
bot.onText(/\/get_tvls/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        // Make the GET request to the Llama API
        const response = await axios.get('https://api.llama.fi/protocol/raindex', {
            headers: {
                'accept': '*/*'
            }
        });

        // Extract the currentChainTvls field from the response
        const currentChainTvls = response.data.currentChainTvls;

        // Prepare data for the chart
        const chains = Object.keys(currentChainTvls);
        const tvls = Object.values(currentChainTvls);

        // Calculate total TVL
        const totalTVL = tvls.reduce((sum, tvl) => sum + tvl, 0);

        // Generate percentage labels for each chain
        const percentages = tvls.map(tvl => ((tvl / totalTVL) * 100).toFixed(2));

        // Create the legend labels with TVL and percentages
        const chartLabels = chains.map((chain, index) => `${chain} ($${tvls[index].toLocaleString()} - ${percentages[index]}%)`);

        // Generate a formatted string for TVL numbers and percentages
        let tvlMessage = "Raindex Protocol - Current TVLs:\n\n";
        chains.forEach((chain, index) => {
            tvlMessage += `${chain}: $${tvls[index].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${percentages[index]}%)\n`;
        });

        // Create the chart URL using QuickChart.io with custom legends
        const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
            type: 'pie',
            data: {
                labels: chartLabels, // Legends with TVL and percentages
                datasets: [{
                    label: 'Current Chain TVLs',
                    data: tvls,
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF',
                        '#FF9F40',
                        '#C9CBCF'
                    ],
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: 'Raindex Protocol - Current Chain TVLs',
                        font: {
                            size: 20,
                            weight: 'bold',
                            family: "'Helvetica', 'Arial', sans-serif"
                        },
                        color: '#333'
                    },
                    legend: {
                        position: 'right', // Display the legend on the right side
                        labels: {
                            font: {
                                size: 14,
                                family: "'Helvetica', 'Arial', sans-serif"
                            },
                            boxWidth: 20,
                            padding: 20,
                            color: '#333'
                        }
                    }
                },
                layout: {
                    padding: {
                        left: 10,
                        right: 10,
                        top: 10,
                        bottom: 10
                    }
                }
            }
        }))}`;

        // Send the pie chart to the user
        bot.sendPhoto(chatId, chartUrl, { caption: 'Current Chain TVLs for Raindex' });

        // Send the TVL numbers in text format
        bot.sendMessage(chatId, tvlMessage);

    } catch (error) {
        console.error('Error fetching data:', error);
        bot.sendMessage(chatId, 'Sorry, there was an error fetching the TVL data.');
    }
});


// Handler function to query the Llama API and send volume data for Raindex
bot.onText(/\/get_volume/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        // Make the GET request to the Llama API for volume data
        const response = await axios.get('https://api.llama.fi/summary/dexs/raindex?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=false&dataType=dailyVolume', {
            headers: {
                'accept': '*/*'
            }
        });

        // Extract the relevant volume data from the response
        const volumeData = response.data;
        const total24h = volumeData.total24h;
        const total48hto24h = volumeData.total48hto24h;
        const total7d = volumeData.total7d;
        const totalAllTime = volumeData.totalAllTime;

        // Format the volume data into a readable message
        let volumeMessage = "Raindex Protocol - Volume Data (USD):\n\n";
        volumeMessage += `📅 Last 24 hours: $${total24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        volumeMessage += `📅 24h to 48h: $${total48hto24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        volumeMessage += `📅 Last 7 days: $${total7d.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        volumeMessage += `📅 All-time: $${totalAllTime.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // Send the volume data to the user
        bot.sendMessage(chatId, volumeMessage);

    } catch (error) {
        console.error('Error fetching volume data:', error);
        bot.sendMessage(chatId, 'Sorry, there was an error fetching the volume data.');
    }
});