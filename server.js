/**
 * @fileoverview Main entrypoint for the Chequerd application. This file begins
 * the initialization process for the main application files and all their
 * dependencies.
 */


// Initialize express and all top-level packages.
var express = require('express'),
	app = module.exports = express(),
	port = process.env.PORT || 3000,
	bodyParser = require('body-parser'),
	config = require('config'),
	knex = require('knex')(config.knex),
	bookshelf = require('bookshelf')(knex),
	models = require('./app/models')(bookshelf);


// App configuration.
app.set('view engine', 'ejs');
app.set('views', __dirname + '/app/views');
app.set('models', models);
app.set('knex', knex);
app.set('config', config);
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.static(__dirname + '/public'));


// Include the JSX compiler.
require("node-jsx").install();


// Declare all site routes.
require('./app/routes')(app);

// Handle 404 error.
app.get('*', function(req, res) {
    res.json({
        'route': 'Sorry this page does not exist!'
    });
});

// Start server!
app.listen(port);
console.log(require('chalk').green('Server started at port ' + port));
