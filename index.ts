import axios from 'axios';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';
import { TVLResponse, VolumeResponse, DailyVolumeResponse } from './src/types';
import { generateColorPalette } from './src/helper';


dotenv.config();

// Replace the value below with the Telegram token you receive from @BotFather
const token: string = process.env.TELEGRAM_BOT_TOKEN as string;

const bot = new TelegramBot(token, {
  polling: {
    interval: 3000, // 3 seconds between polling requests
    autoStart: true, 
    params: {
      timeout: 10 // Long polling timeout (in seconds)
    }
  }
});

// Set bot commands so they appear in the menu
bot.setMyCommands([
  { command: '/start', description: 'Start' },
  { command: '/get_tvls', description: 'Get the current TVLs for Raindex' },
  { command: '/get_volume', description: 'Get the total volume data for Raindex' },
  { command: '/get_daily_volume', description: 'Get daily volume per chain for raindex' },
  { command: '/get_daily_token_distribution', description: 'Get token distrubition' },
  { command: '/get_most_traded_tokens', description: 'Get most traded tokens on raindex' },
  { command: '/get_monthly_volume', description: 'Get monthly volumes for past 12 months.' },
]);

bot.onText(/\/start/, (msg: Message) => {
  const chatId: number = msg.chat.id;

  const startMessage = `
  Welcome to the Raindex Bot! Here are the available commands:

  1. /get_tvls - Get the current TVLs (Total Value Locked) for Raindex.
  2. /get_volume - Get the total volume data for Raindex.
  3. /get_daily_volume - Get daily volume per chain for Raindex.
  4. /get_daily_token_distribution - Get token distribution across chains for Raindex.
  5. /get_most_traded_tokens - Get the most traded tokens on Raindex.
  6. /get_monthly_volume - Get monthly volumes for the past 12 months.

  Use any of these commands to retrieve the latest information about Raindex. Enjoy exploring the data!
  `;

  // Send the start message with descriptions
  bot.sendMessage(chatId, startMessage);
});

bot.onText(/\/get_tvls/, async (msg: Message) => {
  const chatId: number = msg.chat.id;

  try {
    // Make the GET request to the Llama API
    const response = await axios.get<TVLResponse>('https://api.llama.fi/protocol/raindex', {
      headers: {
        accept: '*/*'
      }
    });

    const currentChainTvls = response.data.currentChainTvls;

    const chains = Object.keys(currentChainTvls);
    const tvls = Object.values(currentChainTvls);

    const totalTVL = tvls.reduce((sum, tvl) => sum + tvl, 0);
    const percentages = tvls.map(tvl => ((tvl / totalTVL) * 100).toFixed(2));

    const chartLabels = chains.map((chain, index) => `${chain} ($${tvls[index].toLocaleString()} - ${percentages[index]}%)`);

    let tvlMessage = 'Raindex - Current TVLs:\n\n';
    chains.forEach((chain, index) => {
      tvlMessage += `${chain}: $${tvls[index].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${percentages[index]}%)\n`;
    });

    // Generate dynamic background colors for the chains
    const backgroundColor = generateColorPalette(chains.length);

    // Increase the size of the pie chart
    const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
      type: 'pie',
      data: {
        labels: chartLabels,
        datasets: [{
          label: 'Current Chain TVLs',
          data: tvls,
          backgroundColor: backgroundColor, // Dynamically generated background colors
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverBorderWidth: 4,
          hoverBorderColor: '#ccc'
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Raindex - Current Chain TVLs',
            font: {
              size: 22,
              weight: 'bold',
              family: "'Helvetica', 'Arial', sans-serif"
            },
            color: '#ffffff'
          },
          legend: {
            position: 'right',
            labels: {
              font: {
                size: 14,
                family: "'Helvetica', 'Arial', sans-serif",
                weight: 'bold'
              },
              boxWidth: 18,
              padding: 25,
              color: '#ffffff' // White text for contrast on dark background
            }
          },
          tooltip: {
            callbacks: {
              label: (tooltipItem: any) => {
                const label = chartLabels[tooltipItem.dataIndex];
                const value = tvls[tooltipItem.dataIndex].toLocaleString(undefined, { minimumFractionDigits: 2 });
                return `${label}: $${value}`;
              }
            }
          },
          datalabels: {
            display: false // Disable data labels on the pie chart itself
          }
        },
        layout: {
          padding: {
            left: 15,
            right: 15,
            top: 15,
            bottom: 15
          }
        },
        backgroundColor: '#2c2c2c' // Grey background color
      }
    }))}&w=600&h=600`; // Set the width and height to 800px

    // Send the pie chart to the user
    bot.sendPhoto(chatId, chartUrl, { caption: 'Current Chain TVLs for Raindex' });
    // Send the TVL numbers in text format
    bot.sendMessage(chatId, tvlMessage);

  } catch (error) {
    console.error('Error fetching data:', error);
    bot.sendMessage(chatId, 'Sorry, there was an error fetching the TVL data.');
  }
});

bot.onText(/\/get_daily_token_distribution/, async (msg: Message) => {
  const chatId: number = msg.chat.id;

  try {
    // Make the GET request to the Llama API
    const response = await axios.get('https://api.llama.fi/protocol/raindex', {
      headers: {
        accept: '*/*'
      }
    });

    // Extract the last object in the tokensInUsd array
    const tokensInUsdArray = response.data.tokensInUsd;
    const lastTokensInUsd = tokensInUsdArray[tokensInUsdArray.length - 1].tokens;

    let tokenNames = Object.keys(lastTokensInUsd);
    let tokenValues = Object.values(lastTokensInUsd) as number[];

    // Sort tokens by value in descending order (so the highest are at the top)
    const sortedTokens = tokenNames.map((token, index) => ({
      tokenName: token,
      tokenValue: tokenValues[index]
    })).sort((a, b) => b.tokenValue - a.tokenValue);

    // Split tokens into top 10 and others
    const topTokens = sortedTokens.slice(0, 10);  // Get top 10 tokens
    const otherTokens = sortedTokens.slice(10);  // Get the rest of the tokens

    // Sum the values of the remaining tokens into "Others"
    const othersValue = otherTokens.reduce((sum, token) => sum + token.tokenValue, 0);
    
    // Combine the top 10 tokens with "Others" as the 11th token
    const finalTokens = [...topTokens, { tokenName: 'Others', tokenValue: othersValue }];

    // Extract final token names and values
    tokenNames = finalTokens.map(t => t.tokenName);
    tokenValues = finalTokens.map(t => t.tokenValue);

    // Calculate total value and percentages for each token
    const totalValue = tokenValues.reduce((sum: number, value: number) => sum + value, 0);
    const percentages = tokenValues.map((value: number) => ((value / totalValue) * 100).toFixed(2));

    // Generate chart labels with token names and percentages
    const chartLabels = tokenNames.map((token, index) => `${token} ($${tokenValues[index].toLocaleString()} - ${percentages[index]}%)`);

    // Generate the token distribution message
    let tokenMessage = 'Raindex - Top 10 Token Distribution (USD):\n\n';
    tokenNames.forEach((token, index) => {
      tokenMessage += `${token}: $${Number(tokenValues[index]).toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })} (${percentages[index]}%)\n`;
    });

    // Generate dynamic background colors
    const backgroundColor = generateColorPalette(tokenNames.length);

    // Create the pie chart URL using QuickChart.io
    const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
      type: 'pie',
      data: {
        labels: chartLabels,
        datasets: [{
          label: 'Top 10 Token Distribution (USD)',
          data: tokenValues,
          backgroundColor: backgroundColor, // Dynamically generated background colors
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverBorderWidth: 4,
          hoverBorderColor: '#ccc'
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Raindex - Top 10 Token Distribution (USD)',
            font: {
              size: 22,
              weight: 'bold',
              family: "'Helvetica', 'Arial', sans-serif"
            },
            color: '#ffffff'
          },
          legend: {
            position: 'right',
            labels: {
              font: {
                size: 14,
                family: "'Helvetica', 'Arial', sans-serif",
                weight: 'bold'
              },
              boxWidth: 18,
              padding: 25,
              color: '#ffffff' // White text for contrast on dark background
            }
          },
          tooltip: {
            callbacks: {
              label: (tooltipItem: any) => {
                const label = chartLabels[tooltipItem.dataIndex];
                const value = Number(tokenValues[tooltipItem.dataIndex]).toLocaleString(undefined, { minimumFractionDigits: 2 });
                return `${label}: $${value}`;
              }
            }
          },
          datalabels: {
            display: false // Disable data labels on the pie chart itself
          }
        },
        layout: {
          padding: {
            left: 15,
            right: 15,
            top: 15,
            bottom: 15
          }
        },
        backgroundColor: '#2c2c2c' // Grey background color
      }
    }))}&w=600&h=600`; // Set the width and height of the pie chart

    // Send the pie chart to the user
    bot.sendPhoto(chatId, chartUrl, { caption: 'Top 10 Token Distribution (USD) for Raindex' });
    // Send the token distribution in text format
    bot.sendMessage(chatId, tokenMessage);

  } catch (error) {
    console.error('Error fetching token distribution data:', error);
    bot.sendMessage(chatId, 'Sorry, there was an error fetching the token distribution data.');
  }
});

bot.onText(/\/get_most_traded_tokens/, async (msg: Message) => {
  const chatId: number = msg.chat.id;

  try {
    // Make the GET request to the Llama API
    const response = await axios.get('https://api.llama.fi/protocol/raindex', {
      headers: {
        accept: '*/*'
      }
    });

    const tokensInUsdArray = response.data.tokensInUsd;

    // Initialize an object to store aggregated token values
    const tokenAggregates: { [token: string]: number } = {};

    // Iterate over each entry in the tokensInUsdArray
    tokensInUsdArray.forEach((entry: any) => {
      if (entry && entry.tokens) {
        Object.keys(entry.tokens).forEach(tokenName => {
          const tokenValue = entry.tokens[tokenName];
          if (tokenValue && typeof tokenValue === 'number') {
            // Add to the aggregate for the token
            tokenAggregates[tokenName] = (tokenAggregates[tokenName] || 0) + tokenValue;
          }
        });
      }
    });

    // Convert the tokenAggregates object to an array for sorting
    const aggregatedTokens = Object.keys(tokenAggregates).map(tokenName => ({
      tokenName,
      tokenValue: tokenAggregates[tokenName]
    }));

    // Sort tokens by value in descending order
    const sortedTokens = aggregatedTokens.sort((a, b) => b.tokenValue - a.tokenValue);

    // Extract the top 10 tokens
    const topTokens = sortedTokens.slice(0, 10);

    // Calculate total value for top 10 tokens and percentages
    const totalValue = topTokens.reduce((sum, token) => sum + token.tokenValue, 0);
    const percentages = topTokens.map(token => ((token.tokenValue / totalValue) * 100).toFixed(2));

    // Generate chart labels for the top 10 tokens
    const chartLabels = topTokens.map((token, index) => `${token.tokenName} ($${token.tokenValue.toLocaleString()} - ${percentages[index]}%)`);

    // Generate the token distribution message
    let tokenMessage = 'Raindex - Top 10 Traded Tokens All-Time (USD):\n\n';
    topTokens.forEach((token, index) => {
      tokenMessage += `${token.tokenName}: $${token.tokenValue.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })} (${percentages[index]}%)\n`;
    });

    // Generate dynamic background colors
    const backgroundColor = generateColorPalette(topTokens.length);

    // Create the pie chart URL using QuickChart.io
    const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
      type: 'pie',
      data: {
        labels: chartLabels,
        datasets: [{
          label: 'Top 10 Traded Tokens (USD)',
          data: topTokens.map(token => token.tokenValue),
          backgroundColor: backgroundColor, // Dynamically generated background colors
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverBorderWidth: 4,
          hoverBorderColor: '#ccc'
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Raindex - Top 10 Traded Tokens All-Time (USD)',
            font: {
              size: 22,
              weight: 'bold',
              family: "'Helvetica', 'Arial', sans-serif"
            },
            color: '#ffffff'
          },
          legend: {
            position: 'right',
            labels: {
              font: {
                size: 14,
                family: "'Helvetica', 'Arial', sans-serif",
                weight: 'bold'
              },
              boxWidth: 18,
              padding: 25,
              color: '#ffffff' // White text for contrast on dark background
            }
          },
          tooltip: {
            callbacks: {
              label: (tooltipItem: any) => {
                const label = chartLabels[tooltipItem.dataIndex];
                const value = topTokens[tooltipItem.dataIndex].tokenValue.toLocaleString(undefined, { minimumFractionDigits: 2 });
                return `${label}: $${value}`;
              }
            }
          },
          datalabels: {
            display: false // Disable data labels on the pie chart itself
          }
        },
        layout: {
          padding: {
            left: 15,
            right: 15,
            top: 15,
            bottom: 15
          }
        },
        backgroundColor: '#2c2c2c' // Grey background color
      }
    }))}&w=600&h=600`; // Set the width and height of the pie chart

    // Send the pie chart to the user
    bot.sendPhoto(chatId, chartUrl, { caption: 'Top 10 Traded Tokens All-Time (USD) for Raindex' });
    // Send the token distribution in text format
    bot.sendMessage(chatId, tokenMessage);

  } catch (error) {
    console.error('Error fetching token distribution data:', error);
    bot.sendMessage(chatId, 'Sorry, there was an error fetching the token distribution data.');
  }
});

bot.onText(/\/get_volume/, async (msg: Message) => {
  const chatId: number = msg.chat.id;

  try {
    const response = await axios.get<VolumeResponse>('https://api.llama.fi/summary/dexs/raindex?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=false&dataType=dailyVolume', {
      headers: {
        accept: '*/*'
      }
    });

    const { total24h, total48hto24h, total7d, totalAllTime } = response.data;

    let volumeMessage = 'Raindex - Volume Data (USD):\n\n';
    volumeMessage += `📅 Last 24 hours: $${total24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    volumeMessage += `📅 24h to 48h: $${total48hto24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    volumeMessage += `📅 Last 7 days: $${total7d.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    volumeMessage += `📅 All-time: $${totalAllTime.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    bot.sendMessage(chatId, volumeMessage);

  } catch (error) {
    console.error('Error fetching volume data:', error);
    bot.sendMessage(chatId, 'Sorry, there was an error fetching the volume data.');
  }
});

bot.onText(/\/get_daily_volume/, async (msg: Message) => {
  const chatId: number = msg.chat.id;

  try {
    const protocolSlug = 'raindex';

    // Type the axios response with DailyVolumeResponse
    const response = await axios.get<DailyVolumeResponse>(`https://api.llama.fi/summary/dexs/${protocolSlug}?excludeTotalDataChart=false&excludeTotalDataChartBreakdown=false&dataType=dailyVolume`);

    const volumeData = response.data;
    const totalDataChartBreakdown = volumeData.totalDataChartBreakdown;

    // Get the second last entry from totalDataChartBreakdown for the most recent day
    const recentBreakdown = totalDataChartBreakdown[totalDataChartBreakdown.length - 2][1];
    const chainNames = Object.keys(recentBreakdown);

    // Extract Raindex as a number and make sure the result is always a number
    const chainVolumes = chainNames.map(chain => {
      const chainData = recentBreakdown[chain];
      return chainData && typeof chainData === 'object' && 'Raindex' in chainData ? chainData.Raindex : 0;
    });

    let totalVolume: number = 0;
    let volumeMessage = `📊 ${volumeData.name} - 24h Volume Per Chain (USD):\n\n`;

    // Generate message for each chain's volume
    chainNames.forEach((chain, index) => {
      const chainVolume = chainVolumes[index];  // chainVolume is now always a number
      totalVolume = totalVolume + Number(chainVolume);
      volumeMessage += `🔹 ${chain}: $${chainVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    });

    volumeMessage += `\n🌍 Total 24h Volume (USD): $${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Generate dynamic background colors for the chains
    const backgroundColor = generateColorPalette(chainNames.length);

    // Create the pie chart using QuickChart.io (instead of stacked bar chart)
    const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
      type: 'pie',
      data: {
        labels: chainNames.map((chain, index) => `${chain} ($${chainVolumes[index].toLocaleString()} - ${(Number(chainVolumes[index]) / totalVolume * 100).toFixed(2)}%)`),
        datasets: [{
          label: '24h Volume Per Chain',
          data: chainVolumes,
          backgroundColor: backgroundColor, // Dynamically generated background colors
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverBorderWidth: 4,
          hoverBorderColor: '#ccc'
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: `${volumeData.name} - 24h Volume Per Chain`,
            font: {
              size: 22,
              weight: 'bold',
              family: "'Helvetica', 'Arial', sans-serif"
            },
            color: '#ffffff'
          },
          legend: {
            position: 'right',
            labels: {
              font: {
                size: 14,
                family: "'Helvetica', 'Arial', sans-serif",
                weight: 'bold'
              },
              boxWidth: 18,
              padding: 25,
              color: '#ffffff'
            }
          },
          tooltip: {
            callbacks: {
              label: (tooltipItem: any) => {
                const label = chainNames[tooltipItem.dataIndex];
                const value = Number(chainVolumes[tooltipItem.dataIndex]).toLocaleString(undefined, { minimumFractionDigits: 2 });
                return `${label}: $${value}`;
              }
            }
          },
          datalabels: {
            display: false // Disable data labels on the pie chart itself
          }
        },
        layout: {
          padding: {
            left: 15,
            right: 15,
            top: 15,
            bottom: 15
          }
        },
        backgroundColor: '#2c2c2c' // Grey background color
      }
    }))}&w=600&h=600`; // Set the width and height to 800px

    // Send the pie chart to the user
    bot.sendPhoto(chatId, chartUrl, { caption: `${volumeData.name} - 24h Volume Per Chain` });

    // Send the detailed 24h volume data as a text message
    bot.sendMessage(chatId, volumeMessage);

  } catch (error) {
    console.error('Error fetching daily volume data:', error);
    bot.sendMessage(chatId, 'Sorry, there was an error fetching the daily volume data.');
  }
});

bot.onText(/\/get_monthly_volume/, async (msg: Message) => {
  const chatId: number = msg.chat.id;

  try {
    // Make the GET request to the Llama API for Raindex
    const response = await axios.get('https://api.llama.fi/summary/dexs/raindex', {
      headers: {
        accept: '*/*'
      }
    });

    const totalDataChart = response.data.totalDataChart;

    // Get the current timestamp and calculate the timestamp for 12 months ago
    const currentDate = new Date();
    const twelveMonthsAgo = new Date(currentDate.setMonth(currentDate.getMonth() - 12)).getTime() / 1000;

    // Filter data for the last 12 months and aggregate month by month
    const monthlyData: { [key: string]: number } = {};

    totalDataChart.forEach(([timestamp, volume]: [number, number]) => {
      if (timestamp >= twelveMonthsAgo) {
        const date = new Date(timestamp * 1000);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // Format as YYYY-MM
        monthlyData[monthYear] = (monthlyData[monthYear] || 0) + volume;
      }
    });

    // Sort months chronologically
    const sortedMonths = Object.keys(monthlyData).sort();
    const sortedVolumes = sortedMonths.map(month => monthlyData[month]);

    // Generate a darker blue color for the filled area chart
    const backgroundColor = 'rgba(26, 82, 118, 0.5)'; // Darker blue with opacity for fill
    const borderColor = 'rgba(26, 82, 118, 1)'; // Solid darker blue for the border

    // Create the filled area chart using QuickChart.io
    const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
      type: 'line',
      data: {
        labels: sortedMonths, // Months (x-axis)
        datasets: [{
          label: 'Total Volume (USD)',
          data: sortedVolumes, // Corresponding volumes
          fill: true, // Fill the area below the line
          backgroundColor: backgroundColor, // Semi-transparent dark blue
          borderColor: borderColor, // Solid dark blue for line
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: borderColor,
          pointBorderColor: '#ffffff',
          tension: 0.4 // Curve the lines slightly
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Raindex - Monthly Total Volume (Last 12 Months)',
            font: {
              size: 22,
              weight: 'bold',
              family: "'Helvetica', 'Arial', sans-serif"
            },
            color: '#ffffff'
          },
          legend: {
            display: true, // Show legend
            position: 'top', // Position legend at the top
            labels: {
              color: '#ffffff',
              font: {
                size: 14,
                family: "'Helvetica', 'Arial', sans-serif",
                weight: 'bold'
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (tooltipItem: any) => {
                const label = sortedMonths[tooltipItem.dataIndex];
                const value = sortedVolumes[tooltipItem.dataIndex].toLocaleString(undefined, { minimumFractionDigits: 2 });
                return `${label}: $${value}`;
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Month', // X-axis label
              color: '#ffffff',
              font: {
                size: 16,
                weight: 'bold'
              }
            },
            ticks: {
              color: '#ffffff',
              font: {
                size: 12
              }
            },
            grid: {
              color: '#4c4c4c' // Subtle grid lines
            }
          },
          y: {
            title: {
              display: true,
              text: 'Volume (USD)', // Y-axis label
              color: '#ffffff',
              font: {
                size: 16,
                weight: 'bold'
              }
            },
            ticks: {
              color: '#ffffff',
              // Explicitly format the y-axis labels with the dollar sign
              callback: function(value: number) {
                return '$' + value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ','); // Format with commas and add $
              }
            },
            grid: {
              color: '#4c4c4c' // Subtle grid lines
            }
          }
        },
        layout: {
          padding: {
            left: 20,
            right: 20,
            top: 20,
            bottom: 20
          }
        },
        backgroundColor: '#2c2c2c' // Grey background color
      }
    }))}&w=800&h=400`; // Set width and height of the chart

    // Send the filled area chart to the user (no text message)
    bot.sendPhoto(chatId, chartUrl, { caption: 'Raindex - Monthly Total Volume (Last 12 Months)' });

  } catch (error) {
    console.error('Error fetching volume data:', error);
    bot.sendMessage(chatId, 'Sorry, there was an error fetching the monthly volume data.');
  }
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

bot.on('error', (err) => {
  console.error('Bot error:', err);
  bot.startPolling(); 
});
