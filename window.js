const Main = imports.ui.main;
const Lang = imports.lang;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Log = Extension.imports.logger.Logger.getLogger("ShellTile");

function Window(meta_window, ext) { this._init(meta_window, ext); }

// This seems to be a good set, from trial and error...
Window.tileable_window_types = [
	Meta.WindowType.NORMAL
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
	
	,unmaximize: function(){
		this.meta_window.unmaximize(Meta.MaximizeFlags.VERTICAL | Meta.MaximizeFlags.HORIZONTAL);
	}
	
	,unminimize: function() {
		this.meta_window.unminimize();
	}
	
	,showing_on_its_workspace: function(){
		return this.meta_window.showing_on_its_workspace();
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
	
	,on_move_to_workspace: function(workspace) {
		if(this.group){
			this.group.move_to_workspace(workspace);
			var group = this.group.get_topmost_group();
			group.maximize_size();
			group.raise();
			group.save_bounds();			
		}
	}
	
	,move_to_workspace: function(workspace){
		if(this.workspace && this.workspace.meta_workspace){
			var current_workspace = this.extension.get_workspace(this.workspace.meta_workspace);
			if(current_workspace) current_workspace.disconnect_window(this);
		}
		
		this.meta_window.change_workspace(workspace.meta_workspace);
		workspace.disconnect_window(this);
		workspace.connect_window(this);
	}
	
	,move_resize: function(x, y, w, h) {
		this.meta_window.unmaximize(Meta.MaximizeFlags.VERTICAL | Meta.MaximizeFlags.HORIZONTAL);
		this.meta_window.move_resize_frame(true, x, y, w, h);
	}
	
	,get_title: function() {
		return this.meta_window.get_title();
	}
	,toString: function() {
		return ("<#Window with MetaWindow: " + this.get_title() + ">");
	}

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
		
		return result;
	}
	
	,id: function() {
		return Window.get_id(this.meta_window);
	}
	
	,eq: function(other) {
		let eq = this.id() == other.id();
		if(eq && (this != other)) {
			this.log.warn("Multiple wrappers for the same MetaWindow created: " + this);
		}
		return eq;
	}

	,get_workspace: function(){
		var meta_workspace = this.meta_window.get_workspace();
		if(meta_workspace){
			return this.extension.get_workspace(meta_workspace);
		} else return null;
	}
	
	,get_actor: function(){
		return this.meta_window.get_compositor_private();
	}

	,maximize_size: function(){
		var bounds = Window.get_maximized_bounds(this);
		this.move_resize(bounds.x, bounds.y, bounds.width, bounds.height);
		this.maximize();
	}
	
	,is_first_of_first: function(){
		if(!this.group) return false;
		else {
			
			var curr = this;
			var ret = true;
			while(curr.group){
				ret &= curr == curr.group.first;
				curr = curr.group;
			}
			return ret;
			
		}
	}
	
	,is_second_of_second: function(){
		if(!this.group) return false;
		else {
			
			var curr = this;
			var ret = true;
			while(curr.group){
				ret &= curr == curr.group.second;
				curr = curr.group;
			}
			return ret;
			
		}
	}	
	
	,update_geometry: function(changed_position, changed_size){
		if(this.group){
			/*if(changed_size && !this.extension.keep_maximized){
				var is_first_of_first = this.is_first_of_first();
				var is_second_of_second = this.is_second_of_second();
				if(is_first_of_first || is_second_of_second){
					var group = this.group.get_topmost_group();
					var outer_rect = group.outer_rect();
					
					if(is_second_of_second){
						if(group.saved_size.width != outer_rect.width || group.saved_size.height != outer_rect.height){
							group.save_size();
							same_size = false;
						}
					} else {
						if(group.saved_position.x != outer_rect.x || group.saved_position.y != outer_rect.y){
							group.save_position();
							same_size = false;
						}
					}
				}
			}*/
			
			var same_size = this.extension.keep_maximized || changed_size;
			
			this.group.update_geometry(this,same_size);
		}
	}
	
	,raise: function(){
		this.unminimize();
		this.meta_window.raise();
	}
	
	// dimensions
	,width: function() { return this.outer_rect().width; }
	,height: function() { return this.outer_rect().height; }
	,xpos: function() { return this.outer_rect().x; }
	,ypos: function() { return this.outer_rect().y; }
	,outer_rect: function() { return this.meta_window.get_outer_rect(); }
};

Window.get_id = function(w) {
	if(!w || !w.get_stable_sequence) {
		Log.getLogger("shellshape.window").error("Non-window object: " + w);
	}
	return w.get_stable_sequence();
}

Window.get_maximized_bounds = function(win){
	var works = win.get_workspace();
	var ret = works.get_bounds();
	return ret;
}
