/* prefs.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init buildPrefsWidget */

const {Gio, GObject, Gtk, GLib} = imports.gi;
const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const AutoNightLightPrefs = new GObject.Class({
    Name: 'AutoNightLight.Prefs',
    GTypeName: 'AutoNightLightPrefs',
    Extends: Gtk.Box,
    


    // Constructor 
    _init: function(params) {
        this.parent(params);

        // Get auto night light schedule settings 
        this._autoNightLightSettings = ExtensionUtils.getSettings('org.gnome.shell.extensions.autonightlight');
        this._schedule = this._autoNightLightSettings.get_strv('night-light-schedule');

        // Create new UI builder from prefs.ui 
        this._builder = new Gtk.Builder(),
        this._builder.add_from_file(Me.dir.get_path() + "/prefs.ui");

        // Create the main schedule widget and load in model and view 
        this.mainWidget = this._builder.get_object('main_prefs');
        this._scheduleTreeView = this._builder.get_object("schedule_tree_view");
        this._scheduleDataModel = this._builder.get_object("schedule_data_model");
        
        // Load schedules onto tree view 
        this._refreshTreeView();

        // Bind event handlers 
        this._bindEventHandlers();
    },



    // Refreshes the tree view (load schedules)
    _refreshTreeView: function(selectedSchedule = [this._schedule.length - 1]) {

        // Clear existing schedules  
        this._scheduleDataModel.clear();

        // Load new schedules from settings 
        for(var i = 0; i < this._schedule.length; i++) {
            const scheduleObject = JSON.parse(this._schedule[i]);
            const iter = this._scheduleDataModel.append();
            const minute = scheduleObject['minute'] >= 10 ? scheduleObject['minute'] : '0' + scheduleObject['minute'];
            const hour = scheduleObject['hour'] >= 10 ? scheduleObject['hour'] : '0' + scheduleObject['hour'];
            this._scheduleDataModel.set_value(iter, 0, `${hour}:${minute}`);
            this._scheduleDataModel.set_value(iter, 1, scheduleObject['temperature']);
        }

        // Update tree view selecter
        if (selectedSchedule) {
            this._scheduleTreeView.get_selection().select_path(Gtk.TreePath.new_from_indices(selectedSchedule));
        }

    },



    // Bind event handlders 
    _bindEventHandlers: function() {
        
        // On clicking add schedule button, open the add night light schedule dialog
        this._builder.get_object('schedule_add').connect("clicked", Lang.bind(this, () => {

            // Open new dialog
            let dialog = new Gtk.Dialog({ 
                title: 'Add & Modify Night Light Schedule',
                transient_for: this.mainWidget.get_toplevel(),
                use_header_bar: true,
                modal: true 
            });
            dialog.show_all(); 

            // Load edit box from prefs.ui 
            let editScheduleWidget = this._builder.get_object('edit_schedule_prefs');     
            dialog.get_content_area().add(editScheduleWidget);  

            // Only destroy dialog and keep edit box alive
            dialog.connect('response', Lang.bind(this, () => {
                dialog.get_content_area().remove(editScheduleWidget);
                dialog.destroy();
            }));
            this._builder.get_object('edit_button_cancel').connect("clicked", Lang.bind(this, () => {
                dialog.get_content_area().remove(editScheduleWidget);
                dialog.destroy();
            }));
            
            // On clicking the save button, save the current night light schedule 
            this._builder.get_object('edit_button_save').connect("clicked", Lang.bind(this, () => {
                
                // Get schedule data
                const editHourSpinValue = this._builder.get_object('edit_hour_spin').get_value();
                const editMinuteSpinValue = this._builder.get_object('edit_minute_spin').get_value();
                const editTemperatureSpinValue = this._builder.get_object('edit_temperature_spin').get_value();
                const schedule = `{"hour": ${editHourSpinValue}, "minute": ${editMinuteSpinValue}, "temperature": ${editTemperatureSpinValue}}`;

                // Check if schedule already exists to avoid duplicate schedules
                for (var i = 0; i < this._schedule.length; i++ ) {
                    if (this._schedule[i].includes(`"hour": ${editHourSpinValue}, "minute": ${editMinuteSpinValue}`)) {
                        dialog.get_content_area().remove(editScheduleWidget);
                        dialog.destroy();
                        return;
                    }
                }

                // Create new schedule if it does not already exist 
                this._schedule.push(schedule);
                this._autoNightLightSettings.set_strv('night-light-schedule', this._schedule);
                
                // Refresh the treeview
                this._refreshTreeView();
                dialog.get_content_area().remove(editScheduleWidget);
                dialog.destroy();
            }));
        }));

        // On clicking remove schedule button, remove the schedule 
        this._builder.get_object('schedule_remove').connect("clicked", Lang.bind(this, () => {

            // Remove the selected schedule from tree view and refresh data 
            const selectedSchedule = this._scheduleTreeView.get_selection().get_selected();
            const scheduleIdx = this._scheduleDataModel.get_path(selectedSchedule[2]).get_indices();
            this._schedule.splice(scheduleIdx, 1);
            this._autoNightLightSettings.set_strv('night-light-schedule', this._schedule);
            this._refreshTreeView();

        }));

        // On clicking edit schedule button, open the edit schedule dialog 
        this._builder.get_object('schedule_edit').connect("clicked", Lang.bind(this, () => {

            // Get the selected schedule from tree view 
            const selectedSchedule = this._scheduleTreeView.get_selection().get_selected();
            const scheduleTime = this._scheduleDataModel.get_value(selectedSchedule[2], 0);
            const scheduleTemperature = this._scheduleDataModel.get_value(selectedSchedule[2], 1);

            // Open new dialog
            let dialog = new Gtk.Dialog({ 
                title: 'Add & Modify Night Light Schedule',
                transient_for: this.mainWidget.get_toplevel(),
                use_header_bar: true,
                modal: true 
            });
            dialog.show_all(); 

            // Load edit box from prefs.ui
            let editScheduleWidget = this._builder.get_object('edit_schedule_prefs');     
            dialog.get_content_area().add(editScheduleWidget);  

            // Load edit box with selected schedule data 
            this._builder.get_object('edit_hour_spin').set_value(scheduleTime.split(':')[0]);
            this._builder.get_object('edit_minute_spin').set_value(scheduleTime.split(':')[1]);
            this._builder.get_object('edit_temperature_spin').set_value(scheduleTemperature);

            // Only destroy dialog and keep edit box alive
            dialog.connect('response', Lang.bind(this, () => {
                dialog.get_content_area().remove(editScheduleWidget);
                dialog.destroy();
            }));
            this._builder.get_object('edit_button_cancel').connect("clicked", Lang.bind(this, () => {
                dialog.get_content_area().remove(editScheduleWidget);
                dialog.destroy();
            }));
            
            // On clicking the save button, save the selected night light schedule 
            this._builder.get_object('edit_button_save').connect("clicked", Lang.bind(this, () => {
                const scheduleIdx = this._scheduleDataModel.get_path(selectedSchedule[2]).get_indices();
                const editHourSpinValue = this._builder.get_object('edit_hour_spin').get_value();
                const editMinuteSpinValue = this._builder.get_object('edit_minute_spin').get_value();
                const editTemperatureSpinValue = this._builder.get_object('edit_temperature_spin').get_value();
                const schedule = `{"hour": ${editHourSpinValue}, "minute": ${editMinuteSpinValue}, "temperature": ${editTemperatureSpinValue}}`;

                this._schedule[scheduleIdx] = schedule;
                this._autoNightLightSettings.set_strv('night-light-schedule', this._schedule);
                this._refreshTreeView(scheduleIdx);
                dialog.get_content_area().remove(editScheduleWidget);
                dialog.destroy();
            }));
        }));

    }
});

function init() {

}

function buildPrefsWidget() {
    let prefs = new AutoNightLightPrefs();
    let widget = prefs.mainWidget;
    widget.show_all();
    return widget;
}