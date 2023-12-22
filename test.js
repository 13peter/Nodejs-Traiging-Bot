// Mock of the Binance client for testing purposes
class MockBinanceClient {
    constructor() {
        this.balances = {
            total: 10000, // Example: Total portfolio value
            free: {
                BTC: 1, // Example: 1 BTC available
                USDT: 5000, // Example: $5000 USDT available
            },
        };
    }

    async fetchBalance() {
        return this.balances;
    }

    async createLimitSellOrder(market, volume, price) {
        console.log(`Placing a mock sell order for ${volume} ${market} at ${price}`);
    }

    async createLimitBuyOrder(market, volume, price) {
        console.log(`Placing a mock buy order for ${volume} ${market} at ${price}`);
    }
}

const binanceClient = new MockBinanceClient();

const tick = async (config, binanceClient) => {
    const { asset, base, spread, allocation, maxRiskPerTrade, stopLoss, martingaleMultiplier } = config;
    const market = `${asset}/${base}`;

    // Mocking API calls
    const results = [
        { data: { bitcoin: { usd: 40000 } } }, // Example: BTC/USD rate
        { data: { tether: { usd: 1 } } }, // Example: USDT/USD rate
    ];

    const marketPrice = results[0].data.bitcoin.usd / results[1].data.tether.usd;

    const stopLossPrice = marketPrice * (1 - stopLoss);

    const sellPrice = marketPrice * (1 + spread);
    const buyPrice = marketPrice * (1 - spread);

    const balances = await binanceClient.fetchBalance();
    const assetBalance = balances.free[asset];
    const baseBalance = balances.free[base];

    const riskAmount = balances.total * maxRiskPerTrade;
    const maxLossPerTrade = riskAmount * marketPrice * allocation;

    const sellVolume = Math.min(assetBalance, maxLossPerTrade / sellPrice);
    const buyVolume = Math.min(baseBalance / marketPrice, maxLossPerTrade / buyPrice);

    // Check if the current market price is below the stop-loss price
    if (marketPrice < stopLossPrice) {
        const currentHoldings = assetBalance * marketPrice;
        const stopLossVolume = currentHoldings / marketPrice; // Sell all available holdings

        await binanceClient.createLimitSellOrder(market, stopLossVolume, stopLossPrice);
        console.log(`
            Stop-loss triggered for ${market}...
            Sold all holdings at market price ${stopLossPrice}
        `);

        // Reset balances after executing stop-loss
        const updatedBalances = await binanceClient.fetchBalance();
        const updatedAssetBalance = updatedBalances.free[asset];
        const updatedBaseBalance = updatedBalances.free[base];

        console.log(`
            Updated balances:
            ${asset}: ${updatedAssetBalance}
            ${base}: ${updatedBaseBalance}
        `);

        return; // Exit the tick function to avoid placing additional orders in this tick
    }

    // Martingale Logic: Double the position size after a losing trade
    if (buyVolume > 0) {
        const martingaleBuyVolume = buyVolume * martingaleMultiplier;
        console.log(`
            Martingale: Doubling the position size for the next buy order.
            New buy volume: ${martingaleBuyVolume}@${buyPrice}
        `);

        // Uncomment the line below to place the martingale buy order
        // await binanceClient.createLimitBuyOrder(market, martingaleBuyVolume, buyPrice);
    }

    // Continue with the existing logic
    if (sellVolume > 0 && buyVolume > 0) {
        console.log(`
            New tick for ${market}...
            Created limit sell order for ${sellVolume}@${sellPrice}
            Created limit buy order for ${buyVolume}@${buyPrice}
        `);
    } else {
        console.log(`
            Insufficient funds or risk exceeds the maximum limit. No orders placed for ${market}.
        `);
    }
};

const config = {
    asset: 'BTC',
    base: 'USDT',
    allocation: 0.1,
    spread: 0.2,
    maxRiskPerTrade: 0.02,
    stopLoss: 0.05, // Example: 5% stop-loss
    martingaleMultiplier: 2, // Example: Double the position size after a losing trade
};

tick(config, binanceClient);