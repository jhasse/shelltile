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
		
		//if(this.log.is_debug()) this.log.debug("this._shellwm " + this._shellwm);

		var on_window_create = this.extension.break_loops(this.on_window_create);
		var on_window_remove = this.extension.break_loops(this.on_window_remove);
		
		this.extension.connect_and_track(this, this.meta_workspace, 'window-added', Lang.bind(this, on_window_create));
		this.extension.connect_and_track(this, this.meta_workspace, 'window-removed', Lang.bind(this, on_window_remove));
		this.meta_windows().map(Lang.bind(this, function(win) { this.on_window_create(null, win); }));
	},

	_disable: function() {
		var self = this;
		this.extension.disconnect_tracked_signals(this);
		this.meta_workspace = null;
		this.extension = null;
	},
	
	id: function(){
		return this.meta_workspace.toString();
	},

	toString: function() {
		return "<# Workspace at idx " + this.meta_workspace.index() + ">";
	},
	
	on_window_create: function(workspace, meta_window, second_try) {
		if(this.log.is_debug()) this.log.debug("on_window_create: " + meta_window)
		let actor = meta_window.get_compositor_private();
		if(!actor){
			if(!second_try){
				Mainloop.idle_add(Lang.bind(this, function () {
					this.on_window_create(workspace, meta_window, true);
					return false;
				}));
			}
			return;
		}

		let existing = true;
		var win = this.extension.get_window(meta_window, false);
		if(!win){
			existing = false;
			win = this.extension.get_window(meta_window);
		}
		
		if(win.can_be_tiled()){
			if(this.strategy && this.strategy.on_window_create) this.strategy.on_window_create(win, existing);
			this.extension.connect_window(win);
		}

	},	

	on_window_remove: function(workspace, meta_window) {
		var win = this.extension.get_window(meta_window);
		win.marked_for_remove = true;
		
		Mainloop.idle_add(Lang.bind(this, function () {
			if(this.strategy && this.strategy.on_window_remove) this.strategy.on_window_remove(win);
			
			if(win.marked_for_remove){
				//if(this.log.is_debug()) this.log.debug("remove_window");
				this.extension.disconnect_window(win);
				this.extension.remove_window(win.meta_window);				
			}
			return false;
		}));
		
		if(this.log.is_debug()) this.log.debug("window removed " + meta_window);
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