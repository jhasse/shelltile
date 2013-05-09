const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
const ExtensionSystem = imports.ui.extensionSystem;
const Window = Extension.imports.window.Window;
const Workspace = Extension.imports.workspace.Workspace;
const DefaultTilingStrategy = Extension.imports.tiling.DefaultTilingStrategy;
const Log = Extension.imports.logger.Logger.getLogger("ShellTile");


const Ext = function Ext(){
	let self = this;
	let OVERRIDE_SCHEMA = "org.gnome.shell.overrides";
	
    self.log = Log.getLogger("Ext");
    self.settings = new Gio.Settings({ schema: OVERRIDE_SCHEMA });	
    
    self.enabled = false;
	self.workspaces = {};
	self.windows = {};    
	
	self.connect_and_track = function(owner, subject, name, cb) {
		if (!owner.hasOwnProperty('_bound_signals')) {
			owner._bound_signals = [];
		}
		owner._bound_signals.push([subject, name, subject.connect(name, cb)]);
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
	
	self.on_remove_workspace = function(screen, index) {
		Mainloop.idle_add(Lang.bind(this, function () {
		   
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
		
		    if(removed_meta != null) {
			    self.remove_workspace(removed_meta);
		    }
			return false;
		
        }));


	};
	
	self.remove_workspace = function(removed_meta) {	
		if(removed_meta != null && self.workspaces[removed_meta]) {
			self.workspaces[removed_meta]._disable();
			delete self.workspaces[removed_meta];
		}
	};
	
	self.remove_window = function(removed_meta){
		if(removed_meta){
			var id = Window.get_id(removed_meta);
			delete self.windows[id];
		}
	};
	
	self.get_window = function get_window(meta_window, create_if_necessary) {
		if(typeof(create_if_necessary) == 'undefined') {
			create_if_necessary = true;
		}
		if(!meta_window) {
			return null;
		}
		var id = Window.get_id(meta_window);
		this.log.debug("get_window " + id);
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
		self.connect_and_track(self, self.screen, 'workspace-removed', self.on_remove_workspace);

		for (var i = 0; i < self.screen.n_workspaces; i++) {
			_init_workspace(i);
		}

	};

	self._disconnect_workspaces = function() {
		for (var k in self.workspaces) {
			if (self.workspaces.hasOwnProperty(k)) {
				self.remove_workspace(k);
			}
		}
	};

	self.disconnect_tracked_signals = function(owner, object) {
		if(owner._bound_signals == null) return;
		
		var bound_signals1 = [];
		for(var i=0; i<owner._bound_signals.length; i++) {
			var sig = owner._bound_signals[i];
			if(object === undefined || sig[0] === object){
				sig[0].disconnect(sig[2]);
			} else {
				bound_signals1.push(sig);
			}
		}
		owner._bound_signals = bound_signals1;
	};

	self.enable = function(){
	    try {
	    	self.log.debug("enabling ShellTile");
	
            self.enabled = true;
            self.screen = global.screen;
            let screen = self.screen;
            
            self._init_workspaces();
            
            var edge_tiling = self.settings.get_boolean("edge-tiling");
            if(edge_tiling === true){
            	self.settings.set_boolean("edge-tiling", false);
            }
            self.connect_and_track(self, self.settings, 'changed::edge-tiling', Lang.bind(this, this.on_edge_tiling_changed));
            self.log.debug("ShellTile enabled");
        } catch(e){
            self.log.error(e);    
        }
	}
	
	self.on_edge_tiling_changed = function(){
		var edge_tiling = self.settings.get_boolean("edge-tiling");
		if(edge_tiling){
			if(Extension.uuid){
				//ExtensionSystem.disableExtension(Extension.uuid);
			}
		}
	}

	self.disable = function(){
        try {        
            self.enabled = false;
            self.settings.set_boolean("edge-tiling", true);
            
		    self.disconnect_tracked_signals(self);
		    
            self.log.debug("ShellTile disabled");

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
