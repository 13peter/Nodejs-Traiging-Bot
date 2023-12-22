require('dotenv').config;
const ccxt = require('ccxt');
const axios = require('axios');
const { config } = require('dotenv');

const tick = async() => {
    const { asset, base, spread, allocation} = config
    const market = `${asset}/${base}`;

    const orders = await binanceClient.fetchOpenOrders(market);
    orders.forEach(async order => {
        await binanceClient.cancelOrder(order.id);
    });

    const results = await Promise.all([
        axios.get(),//put api coin trade to BTC
        axios.get()// api coin change btc on TETHER usdt
    ]);
    const marketPrice = results[0].data.bitcoin.usd / results[1].data.teather.usd;

    const sellPrice = marketPrice * (1 + spread);
    const buyPrice = marketPrice * (1 - spread);
    const balances = await binanceClient.fetchBalance();
    const assetBalance = balances.free[asset];
    const baseBalence = balances.free[base];
    const sellVolume = assetBalance * allocation;
    const buyVolume = (baseBalence * allocation) / marketPrice;

    await binanceClient.creatLimitSellOrder(market, sellVolume, sellPrice);
    await binanceClient.createLimitBuyOrder(market, buyVolume, buyPrice);
    console.log(`
        New tick for ${market}...
        Creat limit sell order for ${sellVolume}@${sellPrice}
        Creat limit buy order for ${buyVolume}@${buyPrice}
    `)
}
const run = () =>{
    const config ={
        asset: 'BTC',
        base: 'USDT',
        allocation: 0.1,
        spead: 0.2,
        tickInterval: 2000,

    };
    const binanceClient = new ccxt.binance({
        apiKey: process.env.API_ENV,
        secret: process.env.API_SECRET
    });
    tick(config, binanceClient);
    setInterval(tick, config.tickInterval, config, binanceClient)
}
run();