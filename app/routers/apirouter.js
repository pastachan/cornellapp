/**
 * @fileoverview Router submodule for handling all api routes.
 */

module.exports = function(app) {

	var knex = app.get('knex'),
		models = app.get('models'),
		strutil = require('../utils/strutil'),
		apiutil = require('../utils/apiutil')(models);

	app.get('/api/search/courses', function(req, res) {
		var params = req.query;

		if (!params.semester || !params.query) {
			res.status(400);
			res.send('Provide semester and query parameters with this route.');
		}

		apiutil.searchCourses(params.semester, params.query.trim(),
			10, function(err, courses) {

			if (err) {
				console.log(err);
				res.status(400);
				res.send('An error occurred performing the course search.');
				return;
			}

			res.send(courses);
		});

	});

};
