const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
const Window = Extension.imports.window.Window;
const Workspace = Extension.imports.workspace.Workspace;
const Log = Extension.imports.logger.Logger.getLogger("shelltide");


const DefaultTilingStrategy = function(ext){
	
	this.extension = ext;
	this.log = Log.getLogger("DefaultTilingStrategy");
	
	this.on_window_moved = function(win){
		var workspace = win.get_workspace();
		var workspace_windows = workspace.meta_windows();
		this.log.debug("window moved " + workspace_windows);
	}
	
};


const Ext = function Ext(){
	let self = this;
	self.enabled = false;
    self.log = Log.getLogger("Ext");
	
	var Bounds = function(monitor) {
		this.monitor = monitor;
		this.update();
	};

	Bounds.prototype.update = function()
	{
		let panel_height = Main.panel.actor.height;
		this.pos = {
			x: this.monitor.x,
			y: this.monitor.y + panel_height
		};
		this.size = {
			x: this.monitor.width,
			y: this.monitor.height - panel_height
		};
	};	
	
	self.connect_and_track = function(owner, subject, name, cb) {
		if (!owner.hasOwnProperty('_bound_signals')) {
			owner._bound_signals = [];
		}
		owner._bound_signals.push([subject, subject.connect(name, cb)]);
	};
	
	self.current_display = function current_display() {
		return global.screen.get_display();
	};

	self.current_window = function current_window() {
		return self.get_window(self.current_display()['focus-window']);
	};
	
	self.get_workspace = function get_workspace(meta_workspace) {
		let workspace = self.workspaces[meta_workspace];

    	if(typeof(workspace) == "undefined") {
    		var strategy = new DefaultTilingStrategy(self);
			workspace = self.workspaces[meta_workspace] = new Workspace(meta_workspace, self, strategy);
		}
		return workspace;
	};
	
	self.remove_workspace = function(screen, index) {
		var removed_meta = null;
		var removed_ws = null;
		for(let k in self.workspaces){
			let v = self.workspaces[k];
			var found = false;
			for(let i=0; i<screen.get_n_workspaces();i++){
				var meta_workspace = screen.get_workspace_by_index(i);
				if(meta_workspace.toString() == k) found = true;
			}

			if(!found){
				removed_meta = k;
				removed_ws = v;
				break;
			}
		}
		
		if(removed_ws != null) {
			removed_ws._disable();
			delete self.workspaces[removed_meta];
		}
	};
	
	self.get_window = function get_window(meta_window, create_if_necessary) {
		if(typeof(create_if_necessary) == 'undefined') {
			create_if_necessary = true;
		}
		if(!meta_window) {
			return null;
		}
		var id = Window.GetId(meta_window);
		var win = self.windows[id];
		if(typeof(win) == "undefined" && create_if_necessary) {
			win = self.windows[id] = new Window(meta_window, self);
		}
		return win;
	};	
	
	self._init_workspaces = function() {

		function _init_workspace (i) {
			self.get_workspace(self.screen.get_workspace_by_index(i));
		};

		self.connect_and_track(self, self.screen, 'workspace-added', function(screen, i) { _init_workspace(i); });
		self.connect_and_track(self, self.screen, 'workspace-removed', self.remove_workspace);

		for (var i = 0; i < self.screen.n_workspaces; i++) {
			_init_workspace(i);
		}

		var display = self.current_display();
		self.connect_and_track(self, display, 'notify::focus-window', function(display, meta_window) {

			var new_focused = self.get_window(display['focus-window'], false);
			if(new_focused) {
				self.focus_window = new_focused;
			}

		});
	};

	self._disconnect_workspaces = function() {
		for (var k in self.workspaces) {
			if (self.workspaces.hasOwnProperty(k)) {
				self.remove_workspace(k);
			}
		}
	};

	self.disconnect_tracked_signals = function(owner) {
		if(owner._bound_signals == null) return;
		for(var i=0; i<owner._bound_signals.length; i++) {
			var sig = owner._bound_signals[i];
			sig[0].disconnect(sig[1]);
		}
		delete owner._bound_signals;
	};
	
	self._reset_state = function() {
		self.enabled = false;
		self.workspaces = {};
		self.windows = {};
		self.bounds = {};
		self._bound_keybindings = {};
	};

	self.enable = function(){
	    try {
		    self._reset_state();
	
            self.enabled = true;
            self.screen = global.screen;
            let screen = self.screen;
            
            var monitorIdx = screen.get_primary_monitor();
            self.monitor = screen.get_monitor_geometry(monitorIdx);
            self.bounds = new Bounds(self.monitor);
            self._init_workspaces();
            
            self.log.debug("enableeeee");
        } catch(e){
            self.log.error(e);    
        }
	}

	self.disable = function(){
        try {        
            self.enabled = false;
            
            self._disconnect_workspaces();
		    self.disconnect_tracked_signals(self);
		    self._reset_state();
            self.log.debug("disableeeee");

        } catch(e){
            self.log.error(e);    
        }
	}
};

function init() {
    let ext = new Ext();
	return ext
}

function main(){
	init().enable();
}
