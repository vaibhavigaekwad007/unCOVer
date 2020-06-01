const express = require('express');
const fetch = require('node-fetch');
const unzipper = require('unzipper');
const fs = require('fs');
const path = require('path')

const app = express();


// Rendering 
app.engine('html', require('ejs').renderFile)
app.set('views',  path.join(__dirname, '/public'))
app.set('view engine', 'html')

// Handle Requests
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname , '/public')))

app.get('/', (req, res) => {
	res.render('pages/index.html');
});
app.get('/about', (req, res) => {
	res.render('pages/about.html')
})
app.all('/simply_clean.css', (req, res) => {
	res.sendFile(path.join(__dirname, '/node_modules/simply_clean.css/style.css'))
})
app.use((req, res) => {	
	res.status(404).render('pages/error.html');
});
app.use((err, req, res, next) => {
	res.status(500).render('pages/error.html');
});	

app.listen(3000);
console.log('Server started.') 
