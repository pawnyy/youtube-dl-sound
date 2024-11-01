const express = require('express')
const app = express()
const port = 3000
const path = require('path');

app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    res.render("index.html")
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
