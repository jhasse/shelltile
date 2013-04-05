const Mainloop = imports.mainloop;
const Lang = imports.lang;
const Meta = imports.gi.Meta;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Log = Extension.imports.logger.Logger.getLogger("shelltile");

function Workspace() {
	this._init.apply(this, arguments)
}
Workspace.prototype = {

	_init : function(meta_workspace, ext) {
		this._shellwm =  global.window_manager;
		this.log = Log.getLogger("Workspace");
		this.meta_workspace = meta_workspace;
		this.extension = ext;

		this.extension.connect_and_track(this, this.meta_workspace, 'window-added', Lang.bind(this, this.on_window_create));
		this.extension.connect_and_track(this, this.meta_workspace, 'window-removed', Lang.bind(this, this.on_window_remove));
		this.extension.connect_and_track(this, this._shellwm, 'maximize', Lang.bind(this, this.on_window_maximize));
		this.extension.connect_and_track(this, this._shellwm, 'unmaximize', Lang.bind(this, this.on_window_unmaximize));
		
		this.meta_windows().map(Lang.bind(this, function(win) { this.on_window_create(null, win); }));
	},

	_disable: function() {
		var self = this;
		this.extension.disconnect_tracked_signals(this);
		this.meta_workspace = null;
		this.extension = null;
	},

	toString: function() {
		return "<# Workspace at idx " + this.meta_workspace.index() + ">";
	},

	on_window_create: function(workspace, meta_window) {
		let actor = meta_window.get_compositor_private();
		if(!actor){
			Mainloop.idle_add(Lang.bind(this, function () {
				this.on_window_create(workspace, meta_window);
				return false;
			}));
			return;
		}

		var win = this.extension.get_window(meta_window);
		if(!win.can_be_tiled()) {
			return;
		}
		this.log.debug("on_window_create for " + win);
		win.workspace_signals = [];
		
		let bind_to_window_change = this.bind_to_window_change(win, actor);

		let move_ops = [Meta.GrabOp.MOVING];
		let resize_ops = [
				Meta.GrabOp.RESIZING_SE,
				Meta.GrabOp.RESIZING_S,
				Meta.GrabOp.RESIZING_SW,
				Meta.GrabOp.RESIZING_N,
				Meta.GrabOp.RESIZING_NE,
				Meta.GrabOp.RESIZING_NW,
				Meta.GrabOp.RESIZING_W,
				Meta.GrabOp.RESIZING_E
		];
		bind_to_window_change('position', move_ops, Lang.bind(this, this.on_window_move),  Lang.bind(this, this.on_window_moved));
		bind_to_window_change('size',     resize_ops, Lang.bind(this, this.on_window_resize), Lang.bind(this, this.on_window_resized));
		this.extension.connect_and_track(win, meta_window, 'notify::minimized', Lang.bind(this, this.on_window_minimize_changed));	
	},
	
	
	bind_to_window_change: function(win, actor){
		return Lang.bind(this, function(event_name, relevant_grabs, cb, cb_final) {
	
			let change_pending = false;
			
			let signal_handler_idle = Lang.bind(this, function() {
				let grab_op = global.screen.get_display().get_grab_op();
	
				if(relevant_grabs.indexOf(grab_op) == -1) {
	
					if(grab_op == Meta.GrabOp.NONE && change_pending) {
						change_pending = false;
						if(cb_final) cb_final(win);
					}
	
				} else {
					// try again
					Mainloop.idle_add(signal_handler_idle);
				}				
				return false;
			});
			
			let signal_handler_changed = Lang.bind(this, function() {
				let grab_op = global.screen.get_display().get_grab_op();
				if(relevant_grabs.indexOf(grab_op) != -1) {
	
					change_pending = true;
					if(cb) cb(win);
					Mainloop.idle_add(signal_handler_idle);
	
				}
				return false;
			});
			this.extension.connect_and_track(win, actor, event_name + '-changed', signal_handler_changed);
		});
	},

	on_window_move:  function(win) {
		this.log.debug("window move");
	},
	
	on_window_resize: function(win) { 
		this.log.debug("window resize");
	},
	
	on_window_moved:  function(win) {
		this.log.debug("window moved");
	},
	
	on_window_resized: function(win) { 
		this.log.debug("window resized");
	},

	on_window_minimize_changed: function(meta_window) {
		this.log.debug("window minimization state changed for window " + meta_window);
	},
	
	on_window_maximize: function(shellwm, actor) {
		var workspace_num = actor.get_workspace()
		if(workspace_num != this.meta_workspace.index()) return;
		
		this.log.debug("window maximized " + actor + " " + this.meta_workspace);
	},
	
	on_window_unmaximize: function(shellwm, actor) {
		var workspace_num = actor.get_workspace()
		if(workspace_num != this.meta_workspace.index()) return;

		this.log.debug("window unmaximized " + actor + " " + this.meta_workspace);
	},		

	on_window_remove: function(workspace, meta_window) {
		var win = this.extension.get_window(meta_window);
		if(win) win._disable();

		this.log.debug("window removed");
	},

	meta_windows: function() {
		var wins = this.meta_workspace.list_windows();
		return wins;
	}
}