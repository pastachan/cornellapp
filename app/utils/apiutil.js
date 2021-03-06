/**
 * Copyright (c) 2015, Cornellapp.
 * All rights reserved.
 *
 * This source code is licensed under the GNU General Public License v3.0
 * license found in the LICENSE file in the root directory of this source
 * tree.
 *
 *
 * Declares reusable and commonly-useful helper functions for the API.
 */

module.exports = function(models) {
	var async = require('async'),
		strutil = require('./strutil'),
		config = require('../../config'),
		m = {};

	/**
	 * Perform a search with a semester and a query string for relevant courses
	 * and return the courses. This function returns a maximum of course entries
	 * specified by the limit argument.
	 * @param {object} p Params object from the request object.
	 * @param {number} limit Maximum number of course entries to return.
	 * @param {function} callback Callback to call when the operation is
	 *     complete. The first argument passed to callback is an error if an
	 *     error occurred and the second argument passed is the collection of
	 *     course entries that matched the search. If no matching courses are
	 *     found, an empty array is passed as the second argument.
	 * @param {boolean} skipRelated Optional boolean to skip related data.
	 */
	m.searchCourses = function(p, limit, callback, skipRelated) {
		skipRelated = typeof skipRelated === 'undefined' ? false : skipRelated;

		var strm = p.strm,
			query = p.query,
			firstAlphabetic = strutil.firstAlphabeticSubstring(query),
			firstNumeric = strutil.firstNumericSubstring(query),
			firstQuery,
			withRelated = skipRelated ? {} : {
				withRelated: ['groups.sections.meetings.professors']
			};

		if (firstAlphabetic && firstNumeric) {
			firstQuery = new models.course().query(function(qb) {
				qb.where('subject', 'LIKE', '%' + firstAlphabetic + '%')
					.where('catalogNbr', 'LIKE', '%' + firstNumeric + '%')
					.where('strm', strm)
					.limit(limit);
			}).fetchAll(withRelated);
		} else if (firstNumeric) {
			firstQuery = new models.course().query(function(qb) {
				qb.where('catalogNbr', 'LIKE', '%' + firstNumeric + '%')
					.where('strm', strm)
					.limit(limit);
			}).fetchAll(withRelated);
		} else {
			firstQuery = new models.course().query(function(qb) {
				qb.where('subject', 'LIKE', '%' + firstAlphabetic + '%')
					.where('strm', strm)
					.limit(limit);
			}).fetchAll(withRelated);
		}

		async.waterfall([
			function(callback) {
				firstQuery.then(function(courses) {
					if (courses === null)
						courses = [];

					var queryIds = !courses.length ? [] :
						courses.map(function(course) {
							return course.get('id');
						});

					callback(null, courses, queryIds);
				}).catch(function(err) {
					callback(err);
				});
			},
			function(courses, queryIds, callback) {
				if (courses.length < limit) {
					new models.course().query(function(qb) {
						qb.where('titleLong', 'LIKE', '%' + query + '%')
							.where('strm', strm)
							.limit(limit - courses.length);

						if (courses.length)
							qb.whereNotIn('id', queryIds);

					}).fetchAll(withRelated).then(function(additionalCourses) {
						if (additionalCourses === null) {
							if (!courses.length)
								courses = [];
						} else {
							if (!courses.length) {
								courses = additionalCourses;
							} else {
								courses.add(additionalCourses.models);
							}
						}

						queryIds = !courses.length ? [] :
							courses.map(function(course) {
								return course.get('id');
							});

						callback(null, courses, queryIds);
					}).catch(function(err) {
						callback(err);
					});
				} else {
					callback(null, courses, queryIds);
				}
			},
			function(courses, queryIds, callback) {
				if (courses.length < limit) {
					new models.course().query(function(qb) {
						var qbs = query.replace('  ', ' ').split(' ');
						for (var i = 0; i < qbs.length; i++) {
							var q = qbs[i];
							qb.where('titleLong', 'LIKE', '%' + q + '%')
								.where('strm', strm)
								.limit(limit - courses.length);
						}

						if (courses.length)
							qb.whereNotIn('id', queryIds);

					}).fetchAll(withRelated).then(function(additionalCourses) {
						if (additionalCourses === null) {
							if (!courses.length)
								courses = [];
						} else {
							if (!courses.length) {
								courses = additionalCourses;
							} else {
								courses.add(additionalCourses.models);
							}
						}

						queryIds = !courses.length ? [] :
							courses.map(function(course) {
								return course.get('id');
							});

						callback(null, courses, queryIds);
					}).catch(function(err) {
						callback(err);
					});
				} else {
					callback(null, courses, queryIds);
				}
			},
			function(courses, queryIds, callback) {
				if (courses.length < limit) {
					new models.course().query(function(qb) {
						var qbs = query.replace('  ', ' ').split(' ');
						for (var i = 0; i < qbs.length; i++) {
							var q = qbs[i];
							qb.where('description', 'LIKE', '%' + q + '%')
								.where('strm', strm)
								.limit(limit - courses.length);
						}

						if (courses.length)
							qb.whereNotIn('id', queryIds);

					}).fetchAll(withRelated).then(function(additionalCourses) {
						if (additionalCourses === null) {
							if (!courses.length)
								courses = [];
						} else {
							if (!courses.length) {
								courses = additionalCourses;
							} else {
								courses.add(additionalCourses.models);
							}
						}

						queryIds = !courses.length ? [] :
							courses.map(function(course) {
								return course.get('id');
							});

						callback(null, courses, queryIds);
					}).catch(function(err) {
						callback(err);
					});
				} else {
					callback(null, courses, queryIds);
				}
			}
		], function(err, result) {
			callback(null, result);
		});
	};

	/**
	 * MMS a screenshot of a schedule to a US mobile phone number.
	 * @param {string} scheduleId Id of the schedule to send a screenshot of.
	 * @param {string} number Phone number to send the screenshot to.
	 * @param {object} user User object to increment the number of texts for.
	 * @param {function} callback Callback function to be called after the
	 *		process is complete. The callback will be called with a first
	 *		argument of a string if an error occurred.
	 */
	m.textScreenshot = function(scheduleId, number, user, callback) {
		var Pageres = require('pageres'),
			strutil = require('../utils/strutil'),
			AWS = require('aws-sdk'),
			request = require('request');

		var pageres = new Pageres()
		    .src('localhost:' +
		    	(process.env.NODE_ENV === 'production' ? 8081 : 3000) +
		    	'/schedule/' + scheduleId + '?screenshot=true', ['1501x2350']);

		pageres.run(function (err, items) {
			var buffer = new Buffer('');

			items[0].on('data', function(chunk) {
				buffer = Buffer.concat([buffer, chunk]);
			});

			items[0].on('end', function() {

				var s3 = new AWS.S3(config.aws);
				s3.putObject({
					Bucket: config.aws.s3Bucket,
					Key: scheduleId + '.png',
					Body: buffer,
					ContentType: 'image/png',
					ACL: 'public-read'
				}, function(err, data) {
					if (err)
						return callback('An error occurred');

					var twilioMMSUrl = 'https://' +
						config.twilio.accountSID + ':' +
						config.twilio.authToken +
						'@api.twilio.com/2010-04-01/Accounts/' +
						config.twilio.accountSID + '/Messages';

					request({
						method: 'post',
						url: twilioMMSUrl,
						formData: {
							From: config.twilio.number,
							To: '+' + number,
							MediaUrl: 'https://s3.amazonaws.com/' +
								config.aws.s3Bucket + '/' + scheduleId + '.png'
						}
					}, function (error, response, body) {
					    if (error)
							return callback('The text message failed to send.');
					    // console.log(body);
					    if (body.indexOf('RestException') !== -1)
					    	return callback('The text message could not be ' +
					    		'sent.');

					    // Increment number of texts sent.
					    models.knex('users')
							.where('id', user.get('id'))
							.increment('texts')
							.then(function() {
								callback();
							});
					});
				});
			});
		});
	}

	/**
	 * Perform a course selection creation operation for a user.
	 * @param {object} user User object of logged in user.
	 * @param {object} p Body object from the request object.
	 * @param {function} callback Callback function to be called when the
	 * 		operation is complete. The function will be called with one
	 *		parameter, an error, if an error occurs. Otherwise, no parameters
	 *		will be passed.
	 */
	m.createSelection = function(user, p, callback) {
		async.parallel([
			function(callback) {
				// Make sure course exists.
				new models.course({ crseId_strm_subject: p.tag }).fetch()
					.then(function(course) {
					if (course === null) {
						callback('Course doesn\'t exist');
						return;
					}

					callback();
				});
			}, function(callback) {
				// Make sure selection doesn't already exist for the course.
				new models.selection({ tag: p.tag, userId: user.id }).fetch()
					.then(function(selection) {
					if ( selection !== null) {
						callback('Course is already selected');
						return;
					}

					callback();
				});
			}
		], function(err) {
			p.userId = user.id;
			prepareSelectionData(p);
			new models.selection(p).save(null, { method: 'insert' })
				.then(function(selection) {
				if (selection === null) {
					callback('something went wrong saving the selection');
					return;
				}

				// Finally get the id.
				new models.selection({
					userId: user.id,
					tag: selection.get('tag')
				}).fetch().then(function(saved) {
					callback(null, saved.get('id'));
				});
			});
		});
	};

	/**
	 * Perform a course selection update operation.
	 * @param {object} user User object of logged in user.
	 * @param {object} p Body object from the request object.
	 * @param {function} callback Callback function to be called when the
	 * 		operation is complete. The function will be called with one
	 *		parameter, an error, if an error occurs. Otherwise, no parameters
	 *		will be passed.
	 */
	m.updateSelection = function(user, p, callback) {
		// Make sure selection belongs to user.
		new models.selection({ id: p.id }).fetch()
			.then(function(selection) {
			if (selection === null)
				return callback('Selection doesn\'t exist');

			if (selection.get('userId') !== user.id)
				return callback('Selection does\'t belong to user');

			prepareSelectionData(p);

			selection.save(p, { method: 'update' }).then(function() {
				callback();
			});
		});
	};

	/**
	 * Perform a course selection update operation.
	 * @param {object} user User object of logged in user.
	 * @param {object} p Body object from the request object.
	 * @param {function} callback Callback function to be called when the
	 * 		operation is complete. The function will be called with one
	 *		parameter, an error, if an error occurs. Otherwise, no parameters
	 *		will be passed.
	 */
	m.deleteSelection = function(user, p, callback) {
		// Make sure selection belongs to user.
		new models.selection({ id: p.id }).fetch()
			.then(function(selection) {
			if (selection === null)
				return callback('Selection doesn\'t exist');

			if (selection.get('userId') !== user.id)
				return callback('Selection does\'t belong to user');

			selection.destroy().then(function() {
				callback();
			});
		});
	};

	/**
	 * Perform an event creation operation for a user.
	 * @param {object} user User object of logged in user.
	 * @param {object} p Body object from the request object.
	 * @param {function} callback Callback function to be called when the
	 * 		operation is complete. The function will be called with one
	 *		parameter, an error, if an error occurs. Otherwise, no parameters
	 *		will be passed.
	 */
	m.createEvent = function(user, p, callback) {
		// Check that the key isn't already taken.
		new models.event({ userId: user.id, strm: p.strm, key: p.key }).fetch()
			.then(function(e) {

			if (e)
				return callback('Event already exists');

			p.userId = user.id;
			prepareEventData(p);
			new models.event(p).save().then(function() {
				callback();
			});
		});
	};

	/**
	 * Perform an event update operation for a user.
	 * @param {object} user User object of logged in user.
	 * @param {object} p Body object from the request object.
	 * @param {function} callback Callback function to be called when the
	 * 		operation is complete. The function will be called with one
	 *		parameter, an error, if an error occurs. Otherwise, no parameters
	 *		will be passed.
	 */
	m.updateEvent = function(user, p, callback) {
		// Check that the event exists.
		new models.event({ userId: user.id, strm: p.strm, key: p.key }).fetch()
			.then(function(e) {

			if (!e)
				return callback('Event doesn\'t exist');

			p.userId = user.id;
			prepareEventData(p);
			models.knex('events').where('userId', user.id).where('strm', p.strm)
				.where('key', p.key).update(p).then(function() {

				callback();
			});
		});
	};

	/**
	 * Perform an event deletion operation for a user.
	 * @param {object} user User object of logged in user.
	 * @param {object} p Body object from the request object.
	 * @param {function} callback Callback function to be called when the
	 * 		operation is complete. The function will be called with one
	 *		parameter, an error, if an error occurs. Otherwise, no parameters
	 *		will be passed.
	 */
	m.deleteEvent = function(user, p, callback) {
		// Check that the event exists.
		new models.event({ userId: user.id, strm: p.strm, key: p.key }).fetch()
			.then(function(e) {

			if (!e)
				return callback('Event doesn\'t exist');

			models.knex('events').where('userId', user.id).where('strm', p.strm)
				.where('key', p.key).del().then(function() {

				callback();
			});
		});
	};

	return m;
};

/**
 * Prepare fields of a selection to the correct form of data before saving or
 * updating.
 */
function prepareSelectionData(data) {
	data.selectedSectionIds = JSON.stringify(data.selectedSectionIds);
	data.active = data.active == 'true';
}

/**
 * Prepare fields of an event to the correct form of data before saving or
 * updating.
 */
function prepareEventData(data) {
	data.active = data.active == 'true';
}
