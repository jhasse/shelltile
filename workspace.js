const Mainloop = imports.mainloop;
const Lang = imports.lang;
const Meta = imports.gi.Meta;
const Main = imports.ui.main;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Log = Extension.imports.logger.Logger.getLogger("ShellTile");

function Workspace() {
	this._init.apply(this, arguments)
}
Workspace.prototype = {

	_init : function(meta_workspace, ext, strategy) {
		this._shellwm =  global.window_manager;
		this.log = Log.getLogger("Workspace");
		this.meta_workspace = meta_workspace;
		this.extension = ext;
		this.strategy = strategy
		
		this.log.debug("this._shellwm " + this._shellwm);

		var on_window_create = this.break_loops(this.on_window_create);
		var on_window_remove = this.break_loops(this.on_window_remove);
		var on_window_maximize = this.break_loops(this.on_window_maximize);
		var on_window_unmaximize = this.break_loops(this.on_window_unmaximize);
		var on_window_minimize = this.break_loops(this.on_window_minimize);
		
		this.extension.connect_and_track(this, this.meta_workspace, 'window-added', Lang.bind(this, on_window_create));
		this.extension.connect_and_track(this, this.meta_workspace, 'window-removed', Lang.bind(this, on_window_remove));
		this.extension.connect_and_track(this, this._shellwm, 'maximize', Lang.bind(this, on_window_maximize));
		this.extension.connect_and_track(this, this._shellwm, 'unmaximize', Lang.bind(this, on_window_unmaximize));
		this.extension.connect_and_track(this, this._shellwm, 'minimize', Lang.bind(this, on_window_minimize));
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
	
	get_bounds: function(){
		let screen = this.meta_workspace.get_screen();
		let monitor = screen.get_current_monitor()
		var geometry = screen.get_monitor_geometry(monitor);
		
		let x = geometry.x;
		let y = geometry.y;
		let width = geometry.width;
		let height = geometry.height;
		let panel_height = Main.panel.actor.height;
		
		if (monitor == Main.layoutManager.primaryIndex){
			y += panel_height;
			height -= panel_height;
		}
		
		return new Meta.Rectangle({ x: x, y: y, width: width, height: height});
	},
	
	connect_window: function(win){
		if(!win.can_be_tiled()) {
			return;
		}
		
		this.log.debug("connect_window: " + win);
		
		var actor = win.get_actor();
		var meta_window = win.meta_window;
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
		var on_window_move = this.break_loops(this.on_window_move);
		var on_window_moved = this.break_loops(this.on_window_moved);
		var on_window_resize = this.break_loops(this.on_window_resize);
		var on_window_resized = this.break_loops(this.on_window_resized);
		var on_window_raised = this.break_loops(this.on_window_raised);
		var on_workspace_changed = this.break_loops(this.on_workspace_changed);
		var on_key_press = this.on_key_press;
		var on_key_release = this.on_key_release;
		
		
		bind_to_window_change('position', move_ops, Lang.bind(this, on_window_move),  Lang.bind(this, on_window_moved));
		bind_to_window_change('size',     resize_ops, Lang.bind(this, on_window_resize), Lang.bind(this, on_window_resized));
		this.extension.connect_and_track(this, meta_window, 'raised', Lang.bind(this, on_window_raised));
		this.extension.connect_and_track(this, meta_window, "workspace_changed", Lang.bind(this, on_workspace_changed));	
	},
	
	disconnect_window: function(win){
		this.log.debug("disconnect_window: " + win);
		var actor = win.get_actor();
		if(actor) this.extension.disconnect_tracked_signals(this, actor);
		this.extension.disconnect_tracked_signals(this, win.meta_window);
	},
	
	break_loops: function(func){
		return function(){
			if(this.calling === true) return;
			
			this.calling = true;
			try {
				func.apply(this, arguments);
			} finally {
				this.calling = false;
			}
		}
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
			this.extension.connect_and_track(this, actor, event_name + '-changed', signal_handler_changed);
		});
	},

	on_workspace_changed: function(win, obj){
		win = this.extension.get_window(win);
		
		if(!this.extension.enabled){
			
			if(win.group) win.group.detach(win, true);
			return;
		}
		
		if(win.get_workspace() === this){
			this.log.debug("workspace_changed");
			win.on_move_to_workspace(this);
		}
	},

	
	on_window_create: function(workspace, meta_window) {
		this.log.debug("on_window_create: " + meta_window)
		let actor = meta_window.get_compositor_private();
		if(!actor){
			Mainloop.idle_add(Lang.bind(this, function () {
				this.on_window_create(workspace, meta_window);
				return false;
			}));
			return;
		}

		var win = this.extension.get_window(meta_window);
		this.connect_window(win);

	},	
	
	on_window_raised: function(win){
		if(!this.extension.enabled) return;
		
		win = this.extension.get_window(win);
		if(this.strategy && this.strategy.on_window_raised) this.strategy.on_window_raised(win);
		this.log.debug("window raised " + win);
	},
	
	on_window_move:  function(win) {
		if(!this.extension.enabled) return;
		
		if(this.strategy && this.strategy.on_window_move) this.strategy.on_window_move(win);
		//this.log.debug("window move " + win.xpos() + "," + win.ypos());
	},
	
	on_window_resize: function(win) {
		if(!this.extension.enabled) return;
		
		if(this.strategy && this.strategy.on_window_resize) this.strategy.on_window_resize(win);
		//this.log.debug("window resize");
	},
	
	on_window_moved:  function(win) {
		if(!this.extension.enabled) return;
		
		if(this.strategy && this.strategy.on_window_moved) this.strategy.on_window_moved(win);
		this.log.debug("window moved");
	},
	
	on_window_resized: function(win) {
		if(!this.extension.enabled) return;
		
		if(this.strategy && this.strategy.on_window_resized) this.strategy.on_window_resized(win);
		this.log.debug("window resized");
	},

	on_window_minimize: function(shellwm, actor) {
		if(!this.extension.enabled) return;
		
		var workspace_num = actor.get_workspace()
		if(workspace_num != this.meta_workspace.index()) return;
		
		var win = actor.get_meta_window();
		win = this.extension.get_window(win);
		if(this.strategy && this.strategy.on_window_minimize) this.strategy.on_window_minimize(win);
		
		this.log.debug("window maximized " + win);
	},	
	
	on_window_maximize: function(shellwm, actor) {
		
		this.log.debug([shellwm, actor, actor.get_workspace()]);
		var workspace_num = actor.get_workspace()
		this.log.debug(this);
		if(workspace_num != this.meta_workspace.index()) return;
		
		var win = actor.get_meta_window();
		win = this.extension.get_window(win);

		if(!this.extension.enabled){
			
			if(win.group) win.group.detach(win, true);
			return;
		}		
		
		if(this.strategy && this.strategy.on_window_maximize) this.strategy.on_window_maximize(win);
		this.log.debug("window maximized " + win);
	},
	
	on_window_unmaximize: function(shellwm, actor) {
		if(!this.extension.enabled) return;
		
		var workspace_num = actor.get_workspace()
		if(!this.meta_workspace || workspace_num != this.meta_workspace.index()) return;

		var win = actor.get_meta_window();
		win = this.extension.get_window(win);
		if(this.strategy && this.strategy.on_window_unmaximize) this.strategy.on_window_unmaximize(win);
		this.log.debug("window unmaximized " + win);
	},		

	on_window_remove: function(workspace, meta_window) {
		var win = this.extension.get_window(meta_window);
		
		Mainloop.idle_add(Lang.bind(this, function () {
			if(this.strategy && this.strategy.on_window_remove) this.strategy.on_window_remove(win);
			
			if(!win.get_workspace()){
				this.log.debug("remove_window");
				this.disconnect_window(win);
				this.extension.remove_window(win.meta_window);				
			}
			return false;
		}));
		
		this.log.debug("window removed " + meta_window);
	},

	meta_windows: function() {
	    var self = this;

	    var wins = global.get_window_actors().map(function (act) {
	            return act.meta_window;
	        });

	    wins = wins.filter(function (win) {
            return win.get_workspace() === self.meta_workspace;
        });
	
	    wins = global.display.sort_windows_by_stacking(wins);
		
		return wins;
	}
}