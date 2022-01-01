/* extension.js
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

/* exported init */

const { Gio, GObject } = imports.gi;
const Mainloop = imports.mainloop;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Utils = Me.imports.utils.utils;

// GSettings schema
const COLOR_SCHEMA = 'org.gnome.settings-daemon.plugins.color';

const AutoNightLight = new GObject.Class({
    Name: 'AutoNightLight',
    GTypeName: 'AutoNightLight',



    // Constructor 
    _init: function(params) {
        this.parent(params);
    },


    
    // Enable extension 
    enable: function() {

        log(`[${new Date().toUTCString()}][${Me.metadata.name} v${Me.metadata.version}] Enabling Extension`);

        // Load Gnome night light settings, extension settings, and extension schedule 
        this._settings = new Gio.Settings({schema_id: COLOR_SCHEMA});
        this._autoNightLightSettings = ExtensionUtils.getSettings('org.gnome.shell.extensions.autonightlight');
        this._schedule = this._autoNightLightSettings.get_strv('night-light-schedule');

        // On prefs change, refresh the auto night light schedule in main loop
        this._autoNightLightSettings.connect('changed::night-light-schedule', () => {
            this._schedule = this._autoNightLightSettings.get_strv('night-light-schedule');
            this._autoNightLight();
        });

        // Backup user's current night light temperature 
        this._autoNightLightSettings.set_uint('backup-temperature', this._settings.get_uint('night-light-temperature'));
        this._autoNightLight();

    },



    // Disable extension
    disable: function() {

        log(`[${new Date().toUTCString()}][${Me.metadata.name} v${Me.metadata.version}] Disabling Extension`);

        // Restore user's night light temperature 
        this._settings.set_uint('night-light-temperature', this._autoNightLightSettings.get_uint('backup-temperature'));

        // Clean up 
        if(this._nextUpdate) {
            Mainloop.source_remove(this._nextUpdate);
            this._nextUpdate = null;
        }
    },



    // Auto night light scheduler
    _autoNightLight: function() {

        // Clean up main loop 
        if(this._nextUpdate) {
            Mainloop.source_remove(this._nextUpdate);
            this._nextUpdate = null;
        }

        // Return if there are no night light schedules 
        if(this._schedule.length < 1) {
            return;
        }

        // Get total seconds based on current time
        const now = new Date();
        const hour = now.getHours(), minutes = now.getMinutes(), seconds = now.getSeconds();
        const totalSecondsNow = hour * 60 * 60 + minutes * 60 + seconds;

        // Get closest shedule for next update
        const closestSchedule = Utils.ClosestSchedule(totalSecondsNow, this._schedule);
        const closestScheduleObject = JSON.parse(this._schedule[closestSchedule["scheduleIdx"]]);
        let nextUpdateSeconds = closestSchedule["nextUpdateSeconds"];
        let temperature = closestScheduleObject['temperature'];
        
        // Check previous schedule and override next schedule if required 
        // NOTE: we do this because if we restart our system/something breaks, Auto Night Light is able to fall back to previous schedule as if nothing broke...
        const prevScheduleIdx = closestSchedule['scheduleIdx'] - 1 >= 0 ? closestSchedule['scheduleIdx'] - 1 : this._schedule.length - 1;
        const prevScheduleObject = JSON.parse(this._schedule[prevScheduleIdx]);
        if(this._settings.get_uint('night-light-temperature') != prevScheduleObject['temperature']) {
            nextUpdateSeconds = 0;
            temperature = prevScheduleObject['temperature'];
        }

        // Add to the main loop, the update to night light temperature 
        log(`[${new Date().toUTCString()}][${Me.metadata.name} v${Me.metadata.version}] Next Update: ${nextUpdateSeconds}s | Temperature: ${temperature}K`);
        this._nextUpdate = Mainloop.timeout_add_seconds(nextUpdateSeconds, () => {
            log(`[${new Date().toUTCString()}][${Me.metadata.name} v${Me.metadata.version}] Changing Night Light Temperature: ${temperature}K`);
            this._settings.set_uint('night-light-temperature', temperature);
            this._autoNightLight();
            return false;
        });
    }

});

function init() {
    log(`[${new Date().toUTCString()}][${Me.metadata.name} v${Me.metadata.version}] Initializing Extension`);
    return new AutoNightLight();
}
