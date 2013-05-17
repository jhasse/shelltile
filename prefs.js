const Gtk = imports.gi.Gtk;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;

const SCHEMA = "org.gnome.shell.extensions.shelltile";

let settings;

function init() {
	settings = Convenience.getSettings();
}

function buildPrefsWidget() {
	let frame = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, border_width: 10, spacing: 10});

	frame.add(buildSwitcher("keep-group-maximized", "Keep the window group maximized"));
	frame.add(buildSwitcher("maximize-new-windows", "Maximize new windows"));
	//frame.add(buildSwitcher("enforce-primary-monitor", "Always show the switcher on the primary monitor"));
	frame.show_all();

	return frame;
}

function buildSwitcher(key, labeltext, tooltip) {
	let hbox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, spacing: 10 });

	let label = new Gtk.Label({label: labeltext, xalign: 0 });

	let switcher = new Gtk.Switch({active: settings.get_boolean(key)});

	switcher.connect('notify::active', function(widget) {
		settings.set_boolean(key, widget.active);
	});

	hbox.pack_start(label, true, true, 0);
	hbox.add(switcher);

	return hbox;
}
