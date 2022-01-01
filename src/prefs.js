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
const Gtk = imports.gi.Gtk;
const GTKVersion = Gtk.get_major_version();

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const PrefsGTK3 = Me.imports.ui.prefs.prefs_gtk3.AutoNightLightPrefsGTK3;
const PrefsGTK4 = Me.imports.ui.prefs.prefs_gtk4.AutoNightLightPrefsGTK4;

function init() {

}

function buildPrefsWidget() {
    log(`[${new Date().toUTCString()}][${Me.metadata.name} v${Me.metadata.version}][GTK${GTKVersion}]`)

    // Return correct UI, given GTK version (trying to support gnome legacy)
    switch(GTKVersion) {
        case 3:
            let prefsGTK3 = new PrefsGTK3();
            let widget = prefsGTK3.mainWidget;
            widget.show_all();
            return widget; 
        case 4:
            let prefsGTK4 = new PrefsGTK4();
            return prefsGTK4.mainWidget; 
        default:
            let defaultLabel = new Gtk.Label({
                label: `${Me.metadata.name} v${Me.metadata.version} does not support GTK${GTKVersion}. 
                Create a PR or new issue here: https://github.com/Zefty/AutoNightLight`,
                vexpand: false
            });
            return defaultLabel
    }   

}