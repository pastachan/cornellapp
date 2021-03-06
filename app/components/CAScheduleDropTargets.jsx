/**
 * Copyright (c) 2015, Cornellapp.
 * All rights reserved.
 *
 * This source code is licensed under the GNU General Public License v3.0
 * license found in the LICENSE file in the root directory of this source
 * tree.
 *
 *
 * CAScheduleDropTargets represents a rendering of a singular course meeting.
 * are located in _CAScheduleDropTargets.scss.
 */

var React = require('react/addons'),
    CAScheduleInstance = require('./CAScheduleInstance'),
    ScheduleStore = require('../stores/ScheduleStore'),
    classNames = require('classnames'),
    _ = require('underscore');

var CAScheduleDropTargets = React.createClass({
    propTypes: function() {
        return {
            course: React.PropTypes.object.isRequired,
            sectionType: React.PropTypes.string.isRequired,
            pixelsBetweenTimes: React.PropTypes.func.isRequired
        };
    },

    /**
     * Determine if the section conflicts with any of the sections in
     * sectionList.
     * @param {object} section Section object to check with.
     * @param {array} sectionList Array of section objects to check against.
     * @return {boolean} False if there are no conflicts, true if there are
     *      conflicts.
     */
    conflictsWithSections: function(section, sectionList) {
        return ScheduleStore.conflictInSections(sectionList.concat(section));
    },

    render: function() {
        var course = this.props.course,
            sectionOptions = ScheduleStore.getSectionOptionsOfType(
                course.selection.key,
                this.props.sectionType),
            rootClass = classNames('ca-schedule-drop-targets',
                course.selection.color),
            addedSections = [],
            sections = [];

        addedSections.push(ScheduleStore.getSelectedSectionOfType(
            course.selection.key, this.props.sectionType));

        // Loop through all section choices.
        _.each(sectionOptions, function(sectionOption) {
            var instances = [];

            // If sectionOption doesn't fit with the already added sections.
            if (this.conflictsWithSections(sectionOption, addedSections))
                return;

            // Loop through all instances of the section.
            ScheduleStore.iterateInstancesInSection(sectionOption,
                _.bind(function(meeting, meetingIndex, day) {

                    instances.push(
                        <CAScheduleInstance
                            key={sectionOption.section + meetingIndex + day}
                            course={course}
                            section={sectionOption}
                            meeting={meeting}
                            day={ScheduleStore.dayMap[day]}
                            pixelsBetweenTimes={this.props.pixelsBetweenTimes}
                            />
                    );
            }, this));

            sections.push(
                <div key={sectionOption.section}
                    ref={sectionOption.section}
                    data-section-id={sectionOption.section}
                    className="drop-target-section"
                    onMouseEnter={this._onSectionMouseEnter
                        .bind(null, sectionOption.section)}
                    onMouseLeave={this._onSectionMouseLeave
                        .bind(null, sectionOption.section)}>

                    {instances}
                </div>
            );
        }, this);

        return (
            <div className={rootClass}>
                {sections}
            </div>
        );
    },

    /**
     * Event handler for hovering over a drop target section. This process is
     * done in javascript because css :hover doesn't apply when dragging with
     * the click down.
     * @param {string} ref Ref of the section element.
     */
    _onSectionMouseEnter: function(ref) {
        $(React.findDOMNode(this.refs[ref])).addClass('hover');
    },

    /**
     * Event handler for unhovering over a drop target section.
     * @param {string} ref Ref of the section element.
     */
    _onSectionMouseLeave: function(ref) {
        $(React.findDOMNode(this.refs[ref])).removeClass('hover');
    }
});

module.exports = CAScheduleDropTargets;
