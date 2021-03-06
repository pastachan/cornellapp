/**
 * Copyright (c) 2015, Cornellapp.
 * All rights reserved.
 *
 * This source code is licensed under the GNU General Public License v3.0
 * license found in the LICENSE file in the root directory of this source
 * tree.
 *
 *
 * Defines instructions related to trawling data from the Courses API.
 */

var trawlutil = {};

var async = require('async'),
    _ = require('underscore'),
    config = require('../../config'),
    knex = require('knex')(config.knex),
    bookshelf = require('bookshelf')(knex),
    models = require('../models')(bookshelf),
    cornellutil = require('./cornellutil'),
    courseutil = require('./courseutil')(models, knex),
    moment = require('moment');

trawlutil.trawl = function(semester, log, printSuccess, exit) {
    semester = semester.toUpperCase();

    async.waterfall([
        // check that semester argument is available
        function(callback) {
            log('Checking that semester ' + semester + ' is available');
            cornellutil.getRoster(semester, function(roster) {
                if (!roster) {
                    callback(semester + ' is not an available semester');
                    return;
                }

                printSuccess('Checked semester is available');
                callback(null, roster);
            });
        },

        // fetch an already saved semester entry or save a new semester entry
        function(roster, callback) {
            log('Inserting new semester entry if no entry already exists');

            new models.semester({
                slug: semester
            }).fetch().then(function(semesterEntry) {
                // semester entry already exists
                if (semesterEntry) {
                    callback(null, semesterEntry);
                    printSuccess('Semester entry already exists');

                // save new semester entry
                } else {
                    var rosterSemester = courseutil.sanitizeSemesterObject(roster);
                    new models.semester(rosterSemester).save({},
                        { method: 'insert' }).then(function(semesterEntry) {
                            printSuccess('Inserted new semester entry');
                            callback(null, semesterEntry);
                        }).catch(function(err) {
                            if (err)
                                callback(err);
                        });
                }
            }).catch(function(err) {
                if (err)
                    callback(err);
            });
        },

        // get all subjects for semester
        function(semesterEntry, callback) {
            log('Retrieving list of available subjects');
            cornellutil.getSubjects(semester, function(subjects, raw) {
                if (!subjects || !subjects.length) {
                    callback(semester + ' is not an available semester.');
                    return;
                }

                semesterEntry.save({
                    subject_list: JSON.stringify(raw),
                    updated: moment().format('YYYY-MM-DD HH:mm:ss')
                }).then(function() {
                    printSuccess('Retrieved list of subjects');
                    callback(null, semesterEntry, subjects);
                });
            });
        },

        // get courses for all subjects
        function(semesterEntry, subjects, callback) {
            // TODO: remove this after testing
            // subjects = subjects.slice(50,100);

            log('Retrieving all courses for the semester');

            async.map(subjects, function(subject, callback) {
                cornellutil.getCourses(semester, subject, function(coursesData) {
                    if (!coursesData) {
                        callback(subject);
                        return;
                    }

                    log('    Retrieved ' + subject + ' courses');
                    callback(null, coursesData);
                });
            }, function(err, subjectCoursesData) {
                if (err) {
                    callback('An error occurred retrieving courses for subject ' +
                        err);
                    return;
                }

                var courses = _.flatten(subjectCoursesData, true);

                printSuccess('Retrieved all courses');
                callback(null, semesterEntry, courses);
            });
        },

        // fetch all course entries for the semester
        function(semesterEntry, courses, callback) {
            log('Fetching all database course entries for the semester');
            new models.course({
                strm: semesterEntry.get('strm')
            }).where({
                strm: semesterEntry.get('strm')
            }).fetchAll({
                withRelated: ['groups.sections.meetings.professors']
            }).then(function(courseEntries) {
                printSuccess('Fetched ' + courseEntries.length +
                    ' database course entries');
                callback(null, courses, courseEntries);
            }).catch(function(err) {
                if (err)
                    callback(err);
            });
        },

        // analyze the courses against the course entries
        function(courses, courseEntries, callback) {
            log('Analyzing ' + courses.length + ' courses against ' +
                courseEntries.length + ' existing database entries');

            var pairsToUpdate = []; // course API object and course entry tuples

            var count = 0,
                index = 0,
                totalCourseLength = courses.length;
            while (courseEntries.length && index < courses.length) {
                var course = courses[index],
                    courseEntry = courseEntries.findWhere({
                        crseId: course.crseId,
                        subject: course.subject
                    });

                if (courseEntry) {
                    if (!courseutil.isIdenticalCourse(course, courseEntry)) {
                        pairsToUpdate.push([course, courseEntry]);
                    }

                    courseEntries.remove(courseEntry);
                    courses.splice(index, 1);
                } else {
                    index++;
                }

                if (++count % 100 === 0) {
                    log('Analyzed ' + count + ' of ' + totalCourseLength +
                        ' courses');
                }
            }

            printSuccess('Found ' + pairsToUpdate.length + ' to update');
            printSuccess('Found ' + courseEntries.length + ' to delete');
            printSuccess('Found ' + courses.length + ' to insert');

            callback(null, courses, courseEntries, pairsToUpdate);
        },

        // update existing course entries
        function(courses, courseEntries, pairsToUpdate, callback) {
            if (!pairsToUpdate.length) {
                callback(null, courses, courseEntries);
                return;
            }

            log('Updating ' + pairsToUpdate.length + ' database entries');
            var count = 0;
            async.each(pairsToUpdate, function(pairToUpdate, callback) {
                var course = pairToUpdate[0],
                    courseEntry = pairToUpdate[1];

                courseutil.updateCourse(course, courseEntry, function(err) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    if (++count % 100 === 0) {
                        log('Updated ' + count + ' of ' +
                            pairsToUpdate.length + ' courses');
                    }

                    callback();
                });
            }, function(err) {
                if (err) {
                    callback('An error occurred during updating of a course entry' +
                        err);
                    return;
                }

                printSuccess('Updated all courses');
                callback(null, courses, courseEntries);
            });
        },

        // delete courses in the database that don't match the Courses API
        function(courses, courseEntries, callback) {
            if (!courseEntries.length) {
                callback(null, courses);
                return;
            }

            log('Deleting ' + courseEntries.length + ' database entries');
            var count = 0;
            async.forEachOf(courseEntries, function(_, i, callback) {
                var courseEntry = courseEntries.at(i);
                courseutil.deleteCourse(courseEntry, function(err) {
                    if (++count % 100 === 0) {
                        log('Deleted ' + count + ' of ' +
                            courseEntries.length + ' courses');
                    }

                    callback(err);
                });
            }, function(err) {
                if (err) {
                    callback('An error occurred deleting course entries in the ' +
                        'database while ' + err);
                }

                printSuccess('Deleted all courses');
                callback(null, courses);
            });
        },

        // insert all courses not already in the database
        function(courses, callback) {
            if (!courses.length) {
                callback(null);
                return;
            }

            log('Inserting ' + courses.length + ' database entries');
            var count = 0;
            async.each(courses, function(course, callback) {
                courseutil.insertCourse(course, function(err) {
                    if (++count % 100 === 0) {
                        log('Inserted ' + count + ' of ' + courses.length +
                            ' courses');
                    }

                    callback(err);
                });
            }, function(err) {
                if (err) {
                    callback('An error occurred saving new courses to the ' +
                        'database while ' + err);
                    return;
                }

                printSuccess('Inserted all courses');
                callback(null);
            });
        }

    ], function(err) {
        if (err) {
            log(err);
        } else {
            printSuccess('Finished updating the courses for semester ' + semester);
        }

        exit();
    });
};

module.exports = trawlutil;
