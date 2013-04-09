const Main = imports.ui.main;
const Lang = imports.lang;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Log = Extension.imports.logger.Logger.getLogger("shelltile");

function Window(meta_window, ext) { this._init(meta_window, ext); }

// This seems to be a good set, from trial and error...
Window.tileable_window_types = [
	Meta.WindowType.NORMAL,
	Meta.WindowType.DIALOG,
	Meta.WindowType.TOOLBAR,
	Meta.WindowType.UTILITY,
	Meta.WindowType.SPLASHSCREEN
];

// TODO: expose this as a preference if it gets used much
Window.blacklist_classes = [
	'Conky'
];

Window.prototype = {
	_init: function(meta_window, ext) {
		this._windowTracker = Shell.WindowTracker.get_default();
		this.meta_window = meta_window;
		this.extension = ext;
		this.log = Log.getLogger("Window");
		this.tile_preference = null;
	}

	,_disable: function() {
		this.extension.disconnect_tracked_signals(this);
	}

	,bring_to_front: function() {
		// NOOP (TODO: remove)
	}
	,is_active: function() {
		return this.ext.current_window() === this;
	}
	,activate: function() {
		Main.activateWindow(this.meta_window);
	}
	,is_minimized: function() {
		return this.meta_window.minimized;
	}
	,minimize: function() {
		this.meta_window.minimize();
	}
	
	,maximize: function(){
		this.meta_window.maximize(Meta.MaximizeFlags.VERTICAL | Meta.MaximizeFlags.HORIZONTAL);
	}
	
	,unminimize: function() {
		this.meta_window.unminimize();
	}
	
	,before_redraw: function(func) {
		//TODO: idle seems to be the only LaterType that reliably works; but
		// it causes a visual flash. before_redraw would be better, but that
		// doesn't seem to be late enough in the layout cycle to move windows around
		// (which is what this hook is used for).
		Meta.later_add(
			Meta.LaterType.IDLE, //when
			func, //func
			null, //data
			null //notify
		)
	}
	,move_to_workspace: function(new_index) {
		this.meta_window.change_workspace_by_index(new_index, false, global.get_current_time());
	}
	,move_resize: function(x, y, w, h) {
		this.meta_window.unmaximize(Meta.MaximizeFlags.VERTICAL | Meta.MaximizeFlags.HORIZONTAL);
		this.meta_window.move_resize_frame(true, x, y, w, h);
	}
	,set_tile_preference: function(new_pref) {
		this.log.debug("window adopting tile preference of " + new_pref + " - " + this);
		this.tile_preference = new_pref;
	}
	,get_title: function() {
		return this.meta_window.get_title();
	}
	,toString: function() {
		return ("<#Window with MetaWindow: " + this.get_title() + ">");
	}

	// functions for determining whether the window should
	// be tiled by default, or can be tiled at all.
	,is_resizeable: function() {
		return this.meta_window.resizeable;
	}
	,window_type: function() {
		try {
			return this.meta_window['window-type'];
		} catch (e) {
			//TODO: shouldn't be necessary
			this.log.error("Failed to get window type for window " + this.meta_window + ", error was:", e);
			return -1;
		}
	}
	,window_class: function() {
		return this.meta_window.get_wm_class();
	}
	,is_shown_on_taskbar: function() {
		return !this.meta_window.is_skip_taskbar();
	}
	,floating_window: function() {
		//TODO: add check for this.meta_window.below when mutter exposes it as a property;
		return this.meta_window.above;
	}
	,on_all_workspaces: function() {
		return this.meta_window.is_on_all_workspaces();
	}
	,should_auto_tile: function() {
		return this.can_be_tiled() && this.is_resizeable() &&
			!(this.floating_window() || this.on_all_workspaces());
	}
	,can_be_tiled: function() {
		if(!this._windowTracker.is_window_interesting(this.meta_window)) {
			// this.log.debug("uninteresting window: " + this);
			return false;
		}
		var window_class = this.window_class();
		var blacklisted = Window.blacklist_classes.indexOf(window_class) != -1;
		if(blacklisted)
		{
			this.log.debug("window class " + window_class + " is blacklisted");
			return false;
		}

		var window_type = this.window_type();
		var result = Window.tileable_window_types.indexOf(window_type) != -1;
		// this.log.debug("window " + this + " with type == " + window_type + " can" + (result ? "" : " NOT") + " be tiled");
		return result;
	}
	,id: function() {
		return Window.GetId(this.meta_window);
	}
	,eq: function(other) {
		let eq = this.id() == other.id();
		if(eq && (this != other)) {
			this.log.warn("Multiple wrappers for the same MetaWindow created: " + this);
		}
		return eq;
	}

	,get_workspace: function(){
		return this.extension.get_workspace(this.meta_window.get_workspace());
	}
	
	,get_actor: function(){
		return this.meta_window.get_compositor_private();
	}

	,get_last: function(){
		return this.last_rect;
	}
	
	,save_last: function(){
		this.last_rect = this.outer_rect();
		//this.log.debug("save_last: " + this + " " + [this.last_rect.x, this.last_rect.y, this.last_rect.width, this.last_rect.height]);
	}
	
	,maximize_size: function(){
		var bounds = Window.get_maximized_bounds(this);
		this.move_resize(bounds.x, bounds.y, bounds.width, bounds.height);
		this.maximize();
	}
	
	,update_geometry: function(){
		if(this.group){
			this.group.update_geometry(this);
		}
	}
	
	,get_delta: function(){
		if(!this.last_rect) return [0,0,0,0];
		else {
			var last = this.last_rect;
			var current = this.outer_rect();
			return [current.x - last.x, current.y - last.y, current.width - last.width, current.height - last.height];
		}
	}
	
	,raise: function(){
		this.meta_window.raise();
	}
	
	// dimensions
	,width: function() { return this.outer_rect().width; }
	,height: function() { return this.outer_rect().height; }
	,xpos: function() { return this.outer_rect().x; }
	,ypos: function() { return this.outer_rect().y; }
	,outer_rect: function() { return this.meta_window.get_outer_rect(); }
};

Window.GetId = function(w) {
	if(!w || !w.get_stable_sequence) {
		Log.getLogger("shellshape.window").error("Non-window object: " + w);
	}
	return w.get_stable_sequence();
}

Window.get_maximized_bounds = function(win){
	var works = win.get_workspace();
	return works.get_bounds();
}
