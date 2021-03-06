/**
 * Copyright (c) 2015, Cornellapp.
 * All rights reserved.
 *
 * This source code is licensed under the GNU General Public License v3.0
 * license found in the LICENSE file in the root directory of this source
 * tree.
 *
 *
 * The model class for meeting-professors joins.
 */

var meetingprofessorsjoin = function(bookshelf, models) {
	return bookshelf.Model.extend({
		tableName: 'meeting_professors_joins'
	});
};

module.exports = meetingprofessorsjoin;
