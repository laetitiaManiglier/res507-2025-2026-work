const express = require('express');
const app = express();
const port = 3000;

const quotes = [
    "The only way to do great work is to love what you do.",
    "Innovation distinguishes between a leader and a follower.",
    "Stay hungry, stay foolish.",
    "It's not a bug, it's a feature.",
    "Code is like humor. When you have to explain it, it’s bad."
];

app.get('/', (req, res) => {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    res.json({ quote: randomQuote });
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.listen(port, () => {
    console.log(`Quote app listening on port ${port}`);
});
