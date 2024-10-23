const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
require('dotenv').config();

// Create a bot using webhooks (no polling)
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { webHook: true });

// Set webhook for Vercel
const webhookURL = process.env.WEBHOOK_URL;
bot.setWebHook(webhookURL);

// Set bot commands so they appear in the menu
bot.setMyCommands([
    { command: '/get_tvls', description: 'Get the current TVLs for Raindex protocol' },
    { command: '/get_volume', description: 'Get the total volume data for Raindex' },
    { command: '/get_daily_volume', description: 'Get daily volume per chain for a protocol' }
]);

// Handler function to query the Llama API and send parsed data as a pie chart and TVL numbers
bot.onText(/\/get_tvls/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        const response = await axios.get('https://api.llama.fi/protocol/raindex');
        const currentChainTvls = response.data.currentChainTvls;

        const chains = Object.keys(currentChainTvls);
        const tvls = Object.values(currentChainTvls);

        const totalTVL = tvls.reduce((sum, tvl) => sum + tvl, 0);
        const percentages = tvls.map(tvl => ((tvl / totalTVL) * 100).toFixed(2));
        const chartLabels = chains.map((chain, index) => `${chain} ($${tvls[index].toLocaleString()} - ${percentages[index]}%)`);

        let tvlMessage = "Raindex Protocol - Current TVLs:\n\n";
        chains.forEach((chain, index) => {
            tvlMessage += `${chain}: $${tvls[index].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${percentages[index]}%)\n`;
        });

        const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
            type: 'pie',
            data: {
                labels: chartLabels,
                datasets: [{
                    data: tvls,
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF'],
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                plugins: {
                    title: { display: true, text: 'Raindex Protocol - Current Chain TVLs' },
                    legend: { position: 'right', labels: { font: { size: 14 } } }
                }
            }
        }))}`;

        bot.sendPhoto(chatId, chartUrl, { caption: 'Current Chain TVLs for Raindex' });
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

// Handler function to query DeFiLlama API and get daily volume per chain using stacked bar chart
bot.onText(/\/get_daily_volume/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        // Replace 'raindex' with any protocol slug you'd like to fetch
        const protocolSlug = 'raindex';

        // Fetch the daily volume per chain for the protocol
        const response = await axios.get(`https://api.llama.fi/summary/dexs/${protocolSlug}?excludeTotalDataChart=false&excludeTotalDataChartBreakdown=false&dataType=dailyVolume`);

        const volumeData = response.data;

        // Extract total volume and per-chain breakdown from totalDataChart and totalDataChartBreakdown
        const totalDataChartBreakdown = volumeData.totalDataChartBreakdown;  // Per-chain daily volume breakdown

        // Get the second last entry from totalDataChartBreakdown for the most recent day
        const recentBreakdown = totalDataChartBreakdown[totalDataChartBreakdown.length - 2][1]; // Second last entry for per-chain volume

        // Prepare data for the bar chart and message
        const chainNames = Object.keys(recentBreakdown); // Get chain names from breakdown keys
        const chainVolumes = chainNames.map(chain => recentBreakdown[chain].Raindex || 0); // Get the Raindex volume for each chain

        let totalVolume = 0;
        let volumeMessage = `📊 ${volumeData.name} Protocol - 24h Volume Per Chain (USD):\n\n`;

        // Generate message for each chain's volume
        chainNames.forEach((chain, index) => {
            const chainVolume = chainVolumes[index];
            totalVolume += chainVolume;
            volumeMessage += `🔹 ${chain}: $${chainVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        });

        // Add total 24h volume to the message
        volumeMessage += `\n🌍 Total 24h Volume (USD): $${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // Create the stacked bar chart using QuickChart.io
        const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
            type: 'bar',
            data: {
                labels: ['24h Volume'], // Only one day, so we just label it as "24h Volume"
                datasets: chainNames.map((chain, index) => ({
                    label: chain,
                    data: [chainVolumes[index]], // Single data point for each chain
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF'
                    ][index % 7] // Different colors for each chain
                }))
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: `${volumeData.name} - Stacked 24h Volume Per Chain`,
                        font: {
                            size: 18
                        }
                    },
                    legend: {
                        display: true
                    }
                },
                scales: {
                    xAxes: [{
                        stacked: true // Enable stacking for X-axis
                    }],
                    yAxes: [{
                        stacked: true, // Enable stacking for Y-axis
                        ticks: {
                            beginAtZero: true,
                            callback: function(value) {
                                return '$' + value.toLocaleString(); // Add dollar signs to Y-axis values
                            }
                        }
                    }]
                }
            }
        }))}`;

        // Send the stacked bar chart to the user
        bot.sendPhoto(chatId, chartUrl, { caption: `${volumeData.name} - Stacked 24h Volume per Chain` });

        // Send the detailed 24h volume data as a text message
        bot.sendMessage(chatId, volumeMessage);

    } catch (error) {
        console.error('Error fetching daily volume data:', error);
        bot.sendMessage(chatId, 'Sorry, there was an error fetching the daily volume data.');
    }
});