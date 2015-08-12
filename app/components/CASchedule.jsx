/**
 * Copyright (c) 2015, Cornellapp.
 * All rights reserved.
 *
 * This source code is licensed under the GNU General Public License v3.0
 * license found in the LICENSE file in the root directory of this source
 * tree.
 *
 *
 * CASchedule represents the schedule area of the application. Component styles
 * are located in _CASchedule.scss.
 */

var React = require('react/addons'),
    ScheduleStore = require('../stores/ScheduleStore'),
    CAScheduleCourse = require('./CAScheduleCourse'),
    CAScheduleDropTargets = require('./CAScheduleDropTargets'),
    moment = require('moment'),
    _ = require('underscore');

var CASchedule = React.createClass({
    propTypes: {
        courses: React.PropTypes.array.isRequired,
        size: React.PropTypes.string
    },

    getDefaultProps: function() {
        return {
            size: 'normal'
        };
    },

    getInitialState: function() {
        return {
            isDragging: false
        };
    },

    componentWillMount: function() {
        this.hourHeight = this.props.size === 'normal' ? 75 : 120;
        this.startTime = '08:00AM';
        this.endTime = '11:00PM';
        this.dayOffsetMap = {}; // will be overriden in componentDidMount
        this.dayMap = {
                M: 'monday',
                T: 'tuesday',
                W: 'wednesday',
                R: 'thursday',
                F: 'friday',
                S: 'saturday',
                Su: 'sunday'
            };
    },

    /**
     * Calculate the offsets for each day to create boundaries when dragging.
     */
    componentDidMount: function() {
        var $scheduleArea = $(React.findDOMNode(this.refs.scheduleArea)),
            $coursesArea = $(React.findDOMNode(this.refs.coursesArea)),
            $mockCourse = $('<div></div>').addClass('ca-schedule-course'),
            $mockInstance = $('<div></div>').addClass('ca-schedule-instance'),
            $mockInstanceInner = $('<div></div>').addClass('schedule-instance');

        // Add a mock instance to the schedule.
        $coursesArea.append($mockCourse.append($mockInstance.append(
            $mockInstanceInner)));

        var dayOffsetMap = JSON.parse(JSON.stringify(this.dayMap)),
            coursesAreaRight = $scheduleArea.offset().left +
                $scheduleArea.outerWidth();

        // Loop through each day.
        dayOffsetMap = _.mapObject(dayOffsetMap, function(day) {
            // Add day class.
            $mockInstance.addClass(day);

            var mockInstanceRight = $mockInstanceInner.offset().left +
                $mockInstanceInner.outerWidth(),
                dayOffset = {
                    // reversed diliberately, left should be a negative value
                    left: $scheduleArea.offset().left -
                        $mockInstanceInner.offset().left,
                    right: coursesAreaRight - mockInstanceRight
                };

            // Remove the day class.
            $mockInstance.removeClass(day);

            return dayOffset;
        });

        // Remove mock item from schedule.
        $mockCourse.remove();
        this.dayOffsetMap = dayOffsetMap;
    },

    /**
     * Calculate number of pixels between two times. "04:30PM" and "03:30PM"
     * returns one unit of this.props.hourHeight.
     * @param {string} endTime Later time.
     * @param {string} startTime Earlier time.
     * @return {number} Number of pixels that should be rendered between the
     *      two times.
     */
    pixelsBetweenTimes: function(endTime, startTime) {
        return this.hourHeight *
            ScheduleStore.timeDifference(endTime, startTime);
    },

    /**
     * Generate labels for all of the hours of the schedule.
     * @return {object} Generated React markup for the hour labels.
     */
    renderHourLabels: function() {
        var hourLabels = [],
            iterator = 8;

        // Loop from 8am through 10pm to generate hour labels.
        for (var n = 0; n < 15; n++) {
            hourLabels.push(
                <div key={n} className="hour-label">{iterator}:00</div>);
            iterator = iterator == 12 ? 1 : iterator + 1;
        }
        return hourLabels;
    },

    /**
     * Generate seven labels for all of the days.
     * @return {object} Generated React markup for the day labels.
     */
    renderDayLabels: function() {
        var dayLabels = [],
            days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        // Loop through the days to generate day labels.
        for (var n = 0; n < days.length; n++) {
            dayLabels.push(<div key={n} className="day-label">{days[n]}</div>);
        }
        return dayLabels;
    },

    /**
     * Generate markup for all of the stripes of the schedule.
     * @return {object} Generated React markup for the schedule rows.
     */
    renderScheduleRows: function() {
        var scheduleRows = [];

        // Loop through all schedule rows.
        for (var n = 0; n < 15; n++) {
            scheduleRows.push(
                <div key={n} className="schedule-row"></div>);
        }
        return scheduleRows;
    },

    render: function() {
        var hourLabels = this.renderHourLabels(),
            dayLabels = this.renderDayLabels(),
            scheduleRows = this.renderScheduleRows(),
            courses = this.props.courses,
            courseItems = [],
            dropTargets;

        // Loop through courses in order.
        _.each(courses, function(course) {
            if (!course.selection.active)
                return;

            courseItems.push(
                <CAScheduleCourse key={course.selection.key}
                    hourHeight={this.hourHeight}
                    scheduleStartTime={this.startTime}
                    scheduleEndTime={this.endTime}
                    pixelsBetweenTimes={this.pixelsBetweenTimes}
                    course={course}
                    dayMap={this.dayMap}
                    dayOffsetMap={this.dayOffsetMap}
                    onDragStart={this._onSectionDragStart}
                    onDragEnd={this._onSectionDragEnd} />
            );
        }, this);

        if (this.state.isDragging)
            dropTargets =
                <CAScheduleDropTargets
                    course={this.state.dragCourse}
                    sectionType={this.state.dragSectionType}
                    hourHeight={this.hourHeight}
                    scheduleStartTime={this.startTime}
                    pixelsBetweenTimes={this.pixelsBetweenTimes}
                    dayMap={this.dayMap} />;

        return (
            <div className="ca-schedule">
                <div className="left">
                    {hourLabels}
                </div>
                <div className="right">
                    <div className="day-labels">
                        {dayLabels}
                    </div>
                    <div className="schedule-area" ref="scheduleArea">
                        <div className="schedule-rows">
                            {scheduleRows}
                        </div>
                        <div className="courses-area" ref="coursesArea">
                            {courseItems}
                            {dropTargets}
                        </div>
                    </div>
                </div>
            </div>
        );
    },

    /**
     * Event handler for when an item's instance's drag start handler is
     * triggered.
     * @param {object} course Course object being dragged.
     * @param {string} sectionType Type of section being dragged.
     */
    _onSectionDragStart: function(course, sectionType) {
        this.setState({
            isDragging: true,
            dragCourse: course,
            dragSectionType: sectionType
        });
    },

    /**
     * Event handler for when a item's instance's drag end handler is triggered.
     * @param {object} e Event object.
     * @param {object} ui UI information about the draggable.
     * @param {object} draggable The ref for the draggable element.
     */
    _onSectionDragEnd: function(e, ui, draggable) {
        this.setState({
            isDragging: false
        });

        var draggableNode = React.findDOMNode(draggable);

        // Reset the position to be prepared for velocity animation.
        $(draggableNode).css({
            transform: 'translate(0, 0)',
        });

        draggable.resetState();

        $(draggableNode).velocity({
            translateX: ui.position.left,
            translateY: ui.position.top,
        }, 0).velocity({
            translateX: 0,
            translateY: 0,
        }, {
            duration: 560,
            easing: [108, 16]
        });
    }
});

module.exports = CASchedule;