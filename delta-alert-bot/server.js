const http = require('http');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();
const fetch = require('node-fetch');

const PORT = 3000;

// Function to send Telegram alert
async function sendTelegramAlert(symbol, price, target) {
    const message = `🚨 ALERT: ${symbol} dropped below $${target}\nCurrent price: $${price}`;
    const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

    await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: message
        })
    });
}

const server = http.createServer(async (req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
        const filePath = path.join(__dirname, 'index.html');
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading page');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(content);
            }
        });
    } else if (req.url.startsWith('/price?symbol=')) {
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        const symbol = urlParams.get('symbol');

        try {
            const response = await axios.get(`https://api.delta.exchange/v2/markets/${symbol}/ticker`);
            const price = parseFloat(response.data.result.mark_price);
            if (isNaN(price)) throw new Error("Invalid price from API");

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ symbol, price }));
        } catch (err) {
            console.error(err.response?.data || err.message);
            res.writeHead(500);
            res.end(JSON.stringify({ error: "Invalid symbol or API error" }));
        }
    } else {
        res.writeHead(404);
        res.end('404 Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`🌐 Server running at http://localhost:${PORT}`);
});