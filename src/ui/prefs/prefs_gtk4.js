const {Gio, GObject, Gtk, GLib} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

var AutoNightLightPrefsGTK4 = new GObject.Class({
    Name: 'AutoNightLightPrefsGTK4',
    GTypeName: 'AutoNightLightPrefsGTK4',
    Extends: Gtk.Box,
    


    // Constructor 
    _init: function(params) {
        this.parent(params);

        // Get auto night light schedule settings 
        this._autoNightLightSettings = ExtensionUtils.getSettings('org.gnome.shell.extensions.autonightlight');
        this._schedule = this._autoNightLightSettings.get_strv('night-light-schedule');

        // Create new UI builder from prefs.ui 
        this._builder = new Gtk.Builder();
        this._builder.add_from_file(Me.dir.get_path() + "/ui/glade/prefs_gtk4.ui");

        // Create the main schedule widget and load in model and view 
        this.mainWidget = this._builder.get_object('main_prefs');
        this._scheduleTreeView = this._builder.get_object("schedule_tree_view");
        this._scheduleDataModel = this._builder.get_object("schedule_data_model");
        
        // Create diaglog for editing schedule
        this._editDialog;
        
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
        this._builder.get_object('schedule_add').connect("clicked", () => {

            // Open dialog for editing schedule
            if(!this._editDialog) {

                // Create a new dialog if it does not already exist 
                this._editDialog = new Gtk.Dialog({ 
                    title: 'Add & Modify Night Light Schedule',
                    transient_for: this.mainWidget.get_root(),
                    modal: true 
                });

                // Load edit box from prefs.ui    
                this._editDialog.get_content_area().append(this._builder.get_object('edit_schedule_prefs'));  
                
                // Hide dialog instead of destroying it
                this._editDialog.set_hide_on_close(true);

            }

            this._addOrEdit = 'add';
            this._editDialog.show(); 
            
        });

        // On clicking remove schedule button, remove the schedule 
        this._builder.get_object('schedule_remove').connect("clicked", () => {

            // Remove the selected schedule from tree view and refresh data 
            const selectedSchedule = this._scheduleTreeView.get_selection().get_selected();
            if(!selectedSchedule[0]) return;
            const scheduleIdx = this._scheduleDataModel.get_path(selectedSchedule[2]).get_indices();
            this._schedule.splice(scheduleIdx, 1);
            this._autoNightLightSettings.set_strv('night-light-schedule', this._schedule);
            this._refreshTreeView();

        });

        // On clicking edit schedule button, open the edit schedule dialog 
        this._builder.get_object('schedule_edit').connect("clicked", () => {

            // Get the selected schedule from tree view 
            const selectedSchedule = this._scheduleTreeView.get_selection().get_selected();
            if(!selectedSchedule[0]) return;
            const scheduleTime = this._scheduleDataModel.get_value(selectedSchedule[2], 0);
            const scheduleTemperature = this._scheduleDataModel.get_value(selectedSchedule[2], 1);

            // Open dialog for editing schedule
            if(!this._editDialog) {

                // Create a new dialog if it does not already exist 
                this._editDialog = new Gtk.Dialog({ 
                    title: 'Add & Modify Night Light Schedule',
                    transient_for: this.mainWidget.get_root(),
                    modal: true 
                });

                // Load edit box from prefs.ui    
                this._editDialog.get_content_area().append(this._builder.get_object('edit_schedule_prefs'));  
                
                // Hide dialog instead of destroying it
                this._editDialog.set_hide_on_close(true);
            }
            this._addOrEdit = 'edit';
            this._editDialog.show();  

            // Load edit box with selected schedule data 
            this._builder.get_object('edit_hour_spin').set_value(scheduleTime.split(':')[0]);
            this._builder.get_object('edit_minute_spin').set_value(scheduleTime.split(':')[1]);
            this._builder.get_object('edit_temperature_spin').set_value(scheduleTemperature);

        });
                
        // On clicking cancel button, close dialog
        this._builder.get_object('edit_button_cancel').connect("clicked", () => {

            this._editDialog.hide();

        }); 

        // On clicking the save button, save the selected night light schedule 
        this._builder.get_object('edit_button_save').connect("clicked", () => {

            const editHourSpinValue = this._builder.get_object('edit_hour_spin').get_value();
            const editMinuteSpinValue = this._builder.get_object('edit_minute_spin').get_value();
            const editTemperatureSpinValue = this._builder.get_object('edit_temperature_spin').get_value();
            const schedule = `{"hour": ${editHourSpinValue}, "minute": ${editMinuteSpinValue}, "temperature": ${editTemperatureSpinValue}}`;

            switch(this._addOrEdit) {
                case 'add':

                    // Check if schedule already exists to avoid duplicate schedules
                    for (var i = 0; i < this._schedule.length; i++) {
                        if (this._schedule[i].includes(`"hour": ${editHourSpinValue}, "minute": ${editMinuteSpinValue}`)) {
                            this._editDialog.hide();
                            return;
                        }
                    }

                    // Create new schedule if it does not already exist 
                    this._schedule.push(schedule);
                    
                    // Refresh the treeview and close dialog
                    this._refreshTreeView();

                    break;
                case 'edit':

                    // If editing a schedule, override schedule instead of creating new
                    const selectedSchedule = this._scheduleTreeView.get_selection().get_selected();
                    const scheduleIdx = this._scheduleDataModel.get_path(selectedSchedule[2]).get_indices();
                    this._schedule[scheduleIdx] = schedule;
                    this._refreshTreeView(scheduleIdx);

                    break;
                default:
                    this._editDialog.hide();
                    return;
            }

            this._autoNightLightSettings.set_strv('night-light-schedule', this._schedule);
            this._editDialog.hide();
        });

    }
});
