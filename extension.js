const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
var Logger = Extension.imports.logger.Logger;
Logger = Logger.getLogger("shelltide");

const Ext = function Ext(){
	let self = this;
	self.enabled = false;
    self.logger = Logger.getLogger("Ext");
	
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

			//var state = new Tiling.LayoutState(self.bounds);
			workspace = self.workspaces[meta_workspace] = meta_workspace;//new Workspace(meta_workspace, state, self);
		}
		return workspace;
	};
	
	self.remove_workspace = function(meta_workspace) {

		var ws = self.workspaces[meta_workspace];
		if(ws != null) {
			//self._do(function() {ws._disable();}, 'disable workspace');
			delete self.workspaces[meta_workspace];
		}
	};
	
	self.get_window = function get_window(meta_window, create_if_necessary) {
		if(typeof(create_if_necessary) == 'undefined') {
			create_if_necessary = true;
		}
		if(!meta_window) {
			// self.log.debug("bad window: " + meta_window);
			return null;
		}
		//var id = Window.GetId(meta_window);
		var win = self.windows[id];
		if(typeof(win) == "undefined" && create_if_necessary) {
			//win = self.windows[id] = new Window(meta_window, self);
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
            
            self.logger.debug("enableeeee");
        } catch(e){
            self.logger.error(e);    
        }
	}

	self.disable = function(){
        try {        
            self.enabled = false;
            
            self._disconnect_workspaces();
		    self.disconnect_tracked_signals(self);
		    self._reset_state();
            self.logger.debug("disableeeee");

        } catch(e){
            self.logger.error(e);    
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
