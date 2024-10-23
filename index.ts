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
  { command: '/get_tvls', description: 'Get the current TVLs for Raindex protocol' },
  { command: '/get_volume', description: 'Get the total volume data for Raindex' },
  { command: '/get_daily_volume', description: 'Get daily volume per chain for a protocol' }
]);

// Handler function to query the Llama API and send parsed data as a pie chart and TVL numbers
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

    let tvlMessage = 'Raindex Protocol - Current TVLs:\n\n';
    chains.forEach((chain, index) => {
      tvlMessage += `${chain}: $${tvls[index].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${percentages[index]}%)\n`;
    });

    const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
      type: 'pie',
      data: {
        labels: chartLabels,
        datasets: [{
          label: 'Current Chain TVLs',
          data: tvls,
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF'],
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
            position: 'right',
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
bot.onText(/\/get_volume/, async (msg: Message) => {
  const chatId: number = msg.chat.id;

  try {
    const response = await axios.get<VolumeResponse>('https://api.llama.fi/summary/dexs/raindex?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=false&dataType=dailyVolume', {
      headers: {
        accept: '*/*'
      }
    });

    const { total24h, total48hto24h, total7d, totalAllTime } = response.data;

    let volumeMessage = 'Raindex Protocol - Volume Data (USD):\n\n';
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
      let volumeMessage = `📊 ${volumeData.name} Protocol - 24h Volume Per Chain (USD):\n\n`;
  
      // Generate message for each chain's volume
      chainNames.forEach((chain, index) => {
        const chainVolume = chainVolumes[index];  // chainVolume is now always a number
        totalVolume =  totalVolume + Number(chainVolume);               // No error with += operator
        volumeMessage += `🔹 ${chain}: $${chainVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
      });
  
      volumeMessage += `\n🌍 Total 24h Volume (USD): $${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
      // Create the stacked bar chart using QuickChart.io
      const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
        type: 'bar',
        data: {
          labels: ['24h Volume'],
          datasets: chainNames.map((chain, index) => ({
            label: chain,
            data: [chainVolumes[index]],
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF'][index % 7]
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
            xAxes: [{ stacked: true }],
            yAxes: [{
              stacked: true,
              ticks: {
                beginAtZero: true,
                callback: (value: number) => '$' + value.toLocaleString()
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


    
