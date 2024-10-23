import axios from 'axios';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';

dotenv.config();

// Type for response data from DefiLlama API
interface TVLResponse {
  currentChainTvls: { [chain: string]: number };
}

interface VolumeResponse {
  total24h: number;
  total48hto24h: number;
  total7d: number;
  totalAllTime: number;
}

// Type for the breakdown of daily volume per chain
interface DailyVolumeBreakdown {
    [chain: string]: { Raindex: number };
  }
  
// Type for response data from DeFiLlama API for daily volume
interface DailyVolumeResponse {
    totalDataChartBreakdown: [number, { [chain: string]: DailyVolumeBreakdown }][];
    name: string;
}

// Replace the value below with the Telegram token you receive from @BotFather
const token: string = process.env.TELEGRAM_BOT_TOKEN as string;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

// Set bot commands so they appear in the menu
bot.setMyCommands([
  { command: '/get_tvls', description: 'Get the current TVLs for Raindex' },
  { command: '/get_volume', description: 'Get the total volume data for Raindex' },
  { command: '/get_daily_volume', description: 'Get daily volume per chain for raindex' },
  { command: '/get_token_usd_distribution', description: 'Get token distrubition' }

]);

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

// Function to generate a dynamic darker and medium-dark color palette
function generateColorPalette(numColors: number): string[] {
  const colors: string[] = [];
  const darkColors = ['#2c3e50', '#34495e', '#1abc9c', '#16a085', '#f39c12', '#d35400', '#c0392b', '#7f8c8d'];
  const mediumDarkColors = ['#FF9F40', '#FF6384', '#36A2EB', '#9966FF', '#C9CBCF', '#FFCE56', '#4BC0C0', '#FF4500'];

  for (let i = 0; i < numColors; i++) {
    const colorSet = i % 2 === 0 ? darkColors : mediumDarkColors;
    const color = colorSet[i % colorSet.length]; // Cycle through the colors
    colors.push(color);
  }

  return colors;
}

bot.onText(/\/get_token_usd_distribution/, async (msg: Message) => {
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

    // Sort tokens by value in ascending order
    const sortedTokens = tokenNames.map((token, index) => ({
      tokenName: token,
      tokenValue: tokenValues[index]
    })).sort((a, b) => a.tokenValue - b.tokenValue);

    // Extract sorted token names and values
    tokenNames = sortedTokens.map(t => t.tokenName);
    tokenValues = sortedTokens.map(t => t.tokenValue);

    // Calculate total value and percentages for each token
    const totalValue = tokenValues.reduce((sum: number, value: number) => sum + value, 0);
    const percentages = tokenValues.map((value: number) => ((value / Number(totalValue)) * 100).toFixed(2));

    // Generate chart labels with token names and percentages
    const chartLabels = tokenNames.map((token, index) => `${token} ($${tokenValues[index].toLocaleString()} - ${percentages[index]}%)`);

    // Generate the token distribution message
    let tokenMessage = 'Raindex - Token Distribution (USD):\n\n';
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
          label: 'Token Distribution (USD)',
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
            text: 'Raindex - Token Distribution (USD)',
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
    bot.sendPhoto(chatId, chartUrl, { caption: 'Token Distribution (USD) for Raindex' });
    // Send the token distribution in text format
    bot.sendMessage(chatId, tokenMessage);

  } catch (error) {
    console.error('Error fetching token distribution data:', error);
    bot.sendMessage(chatId, 'Sorry, there was an error fetching the token distribution data.');
  }
});

// Handler function to query the Llama API and send volume data for Raindex
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


    
